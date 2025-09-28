import { prisma } from '../database/client.js';
import { logger } from '../shared/utils/logger.js';
import { MatrixFactorization } from './matrixFactorization.js';
import { HelpfulnessCalculator } from './helpfulnessCalculator.js';
import {
  ScoringConfig,
  NoteData,
  RatingData,
  UserScoringData,
  MatrixFactorizationData,
  ScoringResult,
  NoteScore,
  UserScore,
  NoteStatus,
  ScoringJobResult
} from './types.js';
import { getScoringConfig } from './config.js';

/**
 * Main scoring service that orchestrates the Community Notes scoring algorithm
 */
export class ScoringService {
  private config: ScoringConfig;
  private matrixFactorization: MatrixFactorization;
  private helpfulnessCalculator: HelpfulnessCalculator;

  constructor(config?: ScoringConfig) {
    this.config = config || getScoringConfig();
    this.matrixFactorization = new MatrixFactorization(this.config);
    this.helpfulnessCalculator = new HelpfulnessCalculator();
  }

  /**
   * Run the complete scoring algorithm
   */
  async runScoring(options: {
    batchSize?: number;
    maxAge?: number; // Maximum age in days for notes to score
  } = {}): Promise<ScoringJobResult> {
    const startTime = Date.now();
    const result: ScoringJobResult = {
      processedNotes: 0,
      processedUsers: 0,
      statusChanges: 0,
      helpfulnessUpdates: 0,
      errors: [],
      processingTimeMs: 0,
    };

    try {
      logger.info('Starting Community Notes scoring run', { config: this.config });

      // 1. Load data from database
      const { notes, ratings, users } = await this.loadScoringData(options);

      if (notes.length === 0) {
        logger.info('No notes to score');
        return result;
      }

      // 2. Prepare matrix factorization data
      const matrixData = this.prepareMatrixFactorizationData(notes, ratings, users);

      // 3. Run matrix factorization
      const mfResult = await this.matrixFactorization.runMatrixFactorization(matrixData);

      // 4. Calculate note scores and determine statuses
      const noteScores = this.calculateNoteScores(notes, mfResult);

      // 5. Calculate user helpfulness scores
      const userScores = await this.calculateUserScores(users, ratings, noteScores);

      // 6. Update database with results
      const updateResults = await this.updateDatabase(noteScores, userScores);

      result.processedNotes = notes.length;
      result.processedUsers = users.length;
      result.statusChanges = updateResults.statusChanges;
      result.helpfulnessUpdates = updateResults.helpfulnessUpdates;

      logger.info('Scoring run completed successfully', result);

    } catch (error) {
      logger.error('Error during scoring run', error);
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    result.processingTimeMs = Date.now() - startTime;
    return result;
  }

  /**
   * Load scoring data from database
   */
  private async loadScoringData(options: {
    batchSize?: number;
    maxAge?: number;
  }): Promise<{
    notes: NoteData[];
    ratings: RatingData[];
    users: UserScoringData[];
  }> {
    const maxAge = options.maxAge || this.config.maxDaysForScoring;
    const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);

    // Load notes with minimum ratings
    const notesQuery = await prisma.communityNote.findMany({
      where: {
        submittedAt: { gte: cutoffDate },
        totalRatings: { gte: this.config.minRatingsForStatus },
      },
      take: options.batchSize || this.config.batchSize,
      include: {
        ratings: {
          include: {
            rater: true,
          },
        },
        author: true,
      },
    });

    const notes: NoteData[] = notesQuery.map(note => ({
      noteId: note.id,
      messageId: note.messageId,
      authorId: note.authorId,
      content: note.content,
      classification: note.classification,
      submittedAt: note.submittedAt,
      status: note.status as NoteStatus,
      helpfulCount: note.helpfulCount,
      notHelpfulCount: note.notHelpfulCount,
      totalRatings: note.totalRatings,
      helpfulnessRatio: note.helpfulnessRatio,
      visibilityScore: note.visibilityScore,
      isVisible: note.isVisible,
    }));

    // Load all ratings for these notes
    const noteIds = notes.map(n => n.noteId);
    const ratingsQuery = await prisma.noteRating.findMany({
      where: {
        noteId: { in: noteIds },
      },
      include: {
        note: true,
        rater: true,
      },
    });

    const ratings: RatingData[] = ratingsQuery.map(rating => ({
      ratingId: rating.id,
      noteId: rating.noteId,
      raterId: rating.raterId,
      helpful: rating.helpful,
      reason: rating.reason || undefined,
      timestamp: rating.timestamp,
      weight: rating.weight,
    }));

    // Load users who have made ratings
    const userIds = [...new Set(ratings.map(r => r.raterId))];
    const usersQuery = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
    });

    const users: UserScoringData[] = usersQuery.map(user => ({
      userId: user.id,
      discordId: user.discordId,
      helpfulnessScore: user.helpfulnessScore,
      trustLevel: user.trustLevel,
      totalNotes: user.totalNotes,
      totalRatings: user.totalRatings,
      successfulRatings: 0, // Will be calculated
      unsuccessfulRatings: 0, // Will be calculated
      agreementRatio: 0, // Will be calculated
    }));

    logger.info('Loaded scoring data', {
      notes: notes.length,
      ratings: ratings.length,
      users: users.length,
    });

    return { notes, ratings, users };
  }

  /**
   * Prepare data for matrix factorization
   */
  private prepareMatrixFactorizationData(
    notes: NoteData[],
    ratings: RatingData[],
    users: UserScoringData[]
  ): MatrixFactorizationData {
    // Create ID mappings
    const userIdMap = new Map<string, number>();
    const noteIdMap = new Map<string, number>();

    users.forEach((user, index) => {
      userIdMap.set(user.userId, index);
    });

    notes.forEach((note, index) => {
      noteIdMap.set(note.noteId, index);
    });

    // Convert ratings to arrays
    const userIndexes: number[] = [];
    const noteIndexes: number[] = [];
    const ratingLabels: number[] = [];

    for (const rating of ratings) {
      const userIdx = userIdMap.get(rating.raterId);
      const noteIdx = noteIdMap.get(rating.noteId);

      if (userIdx !== undefined && noteIdx !== undefined) {
        userIndexes.push(userIdx);
        noteIndexes.push(noteIdx);
        // Convert boolean helpful to numeric (1 for helpful, 0 for not helpful)
        ratingLabels.push(rating.helpful ? 1 : 0);
      }
    }

    return {
      userIndexes,
      noteIndexes,
      ratingLabels,
      userIdMap,
      noteIdMap,
    };
  }

  /**
   * Calculate note scores from matrix factorization results
   */
  private calculateNoteScores(
    notes: NoteData[],
    mfResult: { noteParams: Map<string, any>; globalIntercept: number }
  ): Map<string, NoteScore> {
    const noteScores = new Map<string, NoteScore>();

    for (const note of notes) {
      const params = mfResult.noteParams.get(note.noteId);

      if (!params) {
        continue;
      }

      // Calculate final score
      const score = params.noteIntercept + mfResult.globalIntercept;

      // Determine status based on thresholds
      let status: NoteStatus;
      if (score >= this.config.crhThreshold) {
        status = NoteStatus.CURRENTLY_RATED_HELPFUL;
      } else if (score <= this.config.nrhThreshold) {
        status = NoteStatus.CURRENTLY_RATED_NOT_HELPFUL;
      } else {
        status = NoteStatus.NEEDS_MORE_RATINGS;
      }

      // Calculate confidence based on score magnitude
      const confidence = Math.min(Math.abs(score) / Math.max(this.config.crhThreshold, Math.abs(this.config.nrhThreshold)), 1.0);

      noteScores.set(note.noteId, {
        noteId: note.noteId,
        score,
        status,
        confidence,
        noteIntercept: params.noteIntercept,
        noteFactor1: params.noteFactor1,
        helpfulRatings: note.helpfulCount,
        notHelpfulRatings: note.notHelpfulCount,
        totalRatings: note.totalRatings,
        helpfulnessRatio: note.helpfulnessRatio,
        decidedBy: 'matrix_factorization',
        activeRules: ['core_algorithm'],
      });
    }

    return noteScores;
  }

  /**
   * Calculate user helpfulness scores
   */
  private async calculateUserScores(
    users: UserScoringData[],
    ratings: RatingData[],
    noteScores: Map<string, NoteScore>
  ): Promise<Map<string, UserScore>> {
    // Convert note scores to status map
    const noteStatuses = new Map<string, NoteStatus>();
    for (const [noteId, score] of noteScores) {
      noteStatuses.set(noteId, score.status);
    }

    return this.helpfulnessCalculator.batchCalculateHelpfulness(
      users,
      ratings,
      noteStatuses
    );
  }

  /**
   * Update database with scoring results
   */
  private async updateDatabase(
    noteScores: Map<string, NoteScore>,
    userScores: Map<string, UserScore>
  ): Promise<{ statusChanges: number; helpfulnessUpdates: number }> {
    let statusChanges = 0;
    let helpfulnessUpdates = 0;

    // Update note scores and statuses
    for (const [noteId, score] of noteScores) {
      try {
        const currentNote = await prisma.communityNote.findUnique({
          where: { id: noteId },
          select: { status: true, visibilityScore: true }
        });

        if (!currentNote) continue;

        const statusChanged = currentNote.status !== score.status;
        const visibilityChanged = Math.abs(currentNote.visibilityScore - score.score) > 0.01;

        if (statusChanged || visibilityChanged) {
          await prisma.communityNote.update({
            where: { id: noteId },
            data: {
              status: score.status,
              visibilityScore: score.score,
              isVisible: score.status === NoteStatus.CURRENTLY_RATED_HELPFUL,
              lastStatusAt: statusChanged ? new Date() : undefined,
            },
          });

          if (statusChanged) {
            statusChanges++;
          }
        }
      } catch (error) {
        logger.error('Error updating note score', { noteId, error });
      }
    }

    // Update user helpfulness scores
    for (const [userId, score] of userScores) {
      try {
        const currentUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { helpfulnessScore: true, trustLevel: true }
        });

        if (!currentUser) continue;

        const scoreChanged = Math.abs(currentUser.helpfulnessScore - score.helpfulnessScore) > 0.01;
        const trustChanged = currentUser.trustLevel !== score.trustLevel;

        if (scoreChanged || trustChanged) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              helpfulnessScore: score.helpfulnessScore,
              trustLevel: score.trustLevel,
            },
          });

          helpfulnessUpdates++;
        }
      } catch (error) {
        logger.error('Error updating user score', { userId, error });
      }
    }

    logger.info('Database update completed', {
      statusChanges,
      helpfulnessUpdates,
    });

    return { statusChanges, helpfulnessUpdates };
  }

  /**
   * Get scoring statistics
   */
  async getScoringStats(): Promise<{
    totalNotes: number;
    crhNotes: number;
    nrhNotes: number;
    pendingNotes: number;
    averageHelpfulness: number;
    topContributors: Array<{ userId: string; score: number }>;
  }> {
    const [
      totalNotes,
      crhNotes,
      nrhNotes,
      pendingNotes,
      userStats
    ] = await Promise.all([
      prisma.communityNote.count(),
      prisma.communityNote.count({ where: { status: 'crh' } }),
      prisma.communityNote.count({ where: { status: 'nrh' } }),
      prisma.communityNote.count({ where: { status: 'pending' } }),
      prisma.user.aggregate({
        _avg: { helpfulnessScore: true },
      }),
    ]);

    const topContributors = await prisma.user.findMany({
      select: { id: true, helpfulnessScore: true },
      orderBy: { helpfulnessScore: 'desc' },
      take: 10,
    });

    return {
      totalNotes,
      crhNotes,
      nrhNotes,
      pendingNotes,
      averageHelpfulness: userStats._avg.helpfulnessScore || 0,
      topContributors: topContributors.map(u => ({
        userId: u.id,
        score: u.helpfulnessScore,
      })),
    };
  }
}