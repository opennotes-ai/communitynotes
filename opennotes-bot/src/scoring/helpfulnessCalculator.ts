import { logger } from '../shared/utils/logger.js';
import {
  UserScoringData,
  NoteData,
  RatingData,
  UserScore,
  HelpfulnessMetrics,
  NoteStatus,
  TrustLevel
} from './types.js';
import { CONTRIBUTION_WEIGHTS, HELPFULNESS_THRESHOLDS } from './config.js';

/**
 * Calculates contributor helpfulness scores based on Community Notes algorithm
 */
export class HelpfulnessCalculator {

  /**
   * Calculate helpfulness score for a user based on their rating history
   */
  calculateUserHelpfulness(
    userData: UserScoringData,
    userRatings: RatingData[],
    noteStatuses: Map<string, NoteStatus>
  ): UserScore {
    const metrics = this.computeHelpfulnessMetrics(userRatings, noteStatuses);

    // Calculate base helpfulness score
    let helpfulnessScore = 0;

    // Successful ratings contribute positively
    helpfulnessScore += metrics.successfulHelpfulRatings * CONTRIBUTION_WEIGHTS.SUCCESSFUL_HELPFUL_RATING;
    helpfulnessScore += metrics.successfulNotHelpfulRatings * CONTRIBUTION_WEIGHTS.SUCCESSFUL_NOT_HELPFUL_RATING;

    // Unsuccessful ratings contribute negatively
    helpfulnessScore += metrics.unsuccessfulHelpfulRatings * CONTRIBUTION_WEIGHTS.UNSUCCESSFUL_RATING;
    helpfulnessScore += metrics.unsuccessfulNotHelpfulRatings * CONTRIBUTION_WEIGHTS.UNSUCCESSFUL_RATING;

    // Early rater bonus - reward users who rate notes early
    const earlyRatingBonus = this.calculateEarlyRatingBonus(userRatings);
    helpfulnessScore += earlyRatingBonus;

    // Note author bonus - reward users for authoring helpful notes
    const authorBonus = userData.totalNotes * CONTRIBUTION_WEIGHTS.NOTE_AUTHOR_BONUS;
    helpfulnessScore += authorBonus;

    // Determine trust level based on helpfulness score and performance
    const trustLevel = this.determineTrustLevel(helpfulnessScore, metrics);

    // Calculate agreement ratio
    const agreementRatio = this.calculateAgreementRatio(metrics);

    // Determine if above helpfulness threshold
    const aboveHelpfulnessThreshold = helpfulnessScore >= HELPFULNESS_THRESHOLDS.NEWCOMER_TO_CONTRIBUTOR;

    // Check if emerging contributor
    const isEmergingContributor = this.isEmergingContributor(userData, metrics);

    return {
      userId: userData.userId,
      helpfulnessScore,
      trustLevel,
      userIntercept: userData.raterIntercept || 0,
      userFactor1: userData.raterFactor1 || 0,
      successfulRatings: metrics.successfulHelpfulRatings + metrics.successfulNotHelpfulRatings,
      unsuccessfulRatings: metrics.unsuccessfulHelpfulRatings + metrics.unsuccessfulNotHelpfulRatings,
      agreementRatio,
      meanNoteScore: metrics.averageNoteScore,
      aboveHelpfulnessThreshold,
      isEmergingContributor,
    };
  }

  /**
   * Compute detailed helpfulness metrics for a user
   */
  private computeHelpfulnessMetrics(
    userRatings: RatingData[],
    noteStatuses: Map<string, NoteStatus>
  ): HelpfulnessMetrics {
    let successfulHelpfulRatings = 0;
    let successfulNotHelpfulRatings = 0;
    let unsuccessfulHelpfulRatings = 0;
    let unsuccessfulNotHelpfulRatings = 0;
    let totalHelpfulRatings = 0;
    let totalNotHelpfulRatings = 0;
    let totalNoteScore = 0;
    let ratedNotesCount = 0;

    for (const rating of userRatings) {
      const noteStatus = noteStatuses.get(rating.noteId);

      if (!noteStatus || noteStatus === NoteStatus.PENDING) {
        continue; // Skip notes without final status
      }

      if (rating.helpful) {
        totalHelpfulRatings++;

        // Rating is successful if note ended up as CRH
        if (noteStatus === NoteStatus.CURRENTLY_RATED_HELPFUL) {
          successfulHelpfulRatings++;
        } else {
          unsuccessfulHelpfulRatings++;
        }
      } else {
        totalNotHelpfulRatings++;

        // Rating is successful if note ended up as NRH or needs more ratings
        if (noteStatus === NoteStatus.CURRENTLY_RATED_NOT_HELPFUL ||
            noteStatus === NoteStatus.NEEDS_MORE_RATINGS) {
          successfulNotHelpfulRatings++;
        } else {
          unsuccessfulNotHelpfulRatings++;
        }
      }

      // Calculate note score contribution (weighted by rating weight)
      const noteScore = this.calculateNoteScore(rating, noteStatus);
      totalNoteScore += noteScore * rating.weight;
      ratedNotesCount++;
    }

    const averageNoteScore = ratedNotesCount > 0 ? totalNoteScore / ratedNotesCount : 0;

    return {
      totalHelpfulRatings,
      totalNotHelpfulRatings,
      successfulHelpfulRatings,
      successfulNotHelpfulRatings,
      unsuccessfulHelpfulRatings,
      unsuccessfulNotHelpfulRatings,
      averageNoteScore,
      agreementRatio: this.calculateAgreementRatio({
        successfulHelpfulRatings,
        successfulNotHelpfulRatings,
        unsuccessfulHelpfulRatings,
        unsuccessfulNotHelpfulRatings,
      } as HelpfulnessMetrics),
    };
  }

  /**
   * Calculate a score for how well a rating aligns with final note status
   */
  private calculateNoteScore(rating: RatingData, noteStatus: NoteStatus): number {
    if (rating.helpful && noteStatus === NoteStatus.CURRENTLY_RATED_HELPFUL) {
      return 1.0; // Perfect alignment
    }

    if (!rating.helpful &&
        (noteStatus === NoteStatus.CURRENTLY_RATED_NOT_HELPFUL ||
         noteStatus === NoteStatus.NEEDS_MORE_RATINGS)) {
      return 1.0; // Perfect alignment
    }

    if (rating.helpful && noteStatus === NoteStatus.CURRENTLY_RATED_NOT_HELPFUL) {
      return -1.0; // Complete disagreement
    }

    if (!rating.helpful && noteStatus === NoteStatus.CURRENTLY_RATED_HELPFUL) {
      return -1.0; // Complete disagreement
    }

    return 0.0; // Neutral/uncertain
  }

  /**
   * Calculate early rating bonus based on when ratings were made relative to note creation
   */
  private calculateEarlyRatingBonus(userRatings: RatingData[]): number {
    // This would need access to note creation times to calculate properly
    // For now, return a placeholder based on total ratings
    const recentRatings = userRatings.filter(
      rating => Date.now() - rating.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );

    return recentRatings.length * CONTRIBUTION_WEIGHTS.EARLY_RATER_BONUS * 0.1;
  }

  /**
   * Calculate agreement ratio - how often user agrees with final note status
   */
  private calculateAgreementRatio(metrics: HelpfulnessMetrics): number {
    const totalSuccessful = metrics.successfulHelpfulRatings + metrics.successfulNotHelpfulRatings;
    const totalRatings = totalSuccessful + metrics.unsuccessfulHelpfulRatings +
                        metrics.unsuccessfulNotHelpfulRatings;

    return totalRatings > 0 ? totalSuccessful / totalRatings : 0;
  }

  /**
   * Determine trust level based on helpfulness score and performance metrics
   */
  private determineTrustLevel(helpfulnessScore: number, metrics: HelpfulnessMetrics): TrustLevel {
    const totalRatings = metrics.successfulHelpfulRatings + metrics.successfulNotHelpfulRatings +
                        metrics.unsuccessfulHelpfulRatings + metrics.unsuccessfulNotHelpfulRatings;

    // Poor performance check
    if (helpfulnessScore < HELPFULNESS_THRESHOLDS.POOR_PERFORMANCE ||
        metrics.agreementRatio < 0.3) {
      return TrustLevel.NEWCOMER;
    }

    // Trusted level requires high score and good track record
    if (helpfulnessScore >= HELPFULNESS_THRESHOLDS.CONTRIBUTOR_TO_TRUSTED &&
        totalRatings >= 20 &&
        metrics.agreementRatio >= 0.7) {
      return TrustLevel.TRUSTED;
    }

    // Contributor level requires moderate score and some experience
    if (helpfulnessScore >= HELPFULNESS_THRESHOLDS.NEWCOMER_TO_CONTRIBUTOR &&
        totalRatings >= 5 &&
        metrics.agreementRatio >= 0.5) {
      return TrustLevel.CONTRIBUTOR;
    }

    return TrustLevel.NEWCOMER;
  }

  /**
   * Check if user is an emerging contributor
   */
  private isEmergingContributor(userData: UserScoringData, metrics: HelpfulnessMetrics): boolean {
    const recentActivity = userData.totalRatings >= 10;
    const goodPerformance = metrics.agreementRatio >= 0.6;
    const moderateScore = userData.helpfulnessScore >= 5;

    return recentActivity && goodPerformance && moderateScore &&
           userData.trustLevel === TrustLevel.NEWCOMER;
  }

  /**
   * Batch calculate helpfulness scores for multiple users
   */
  async batchCalculateHelpfulness(
    users: UserScoringData[],
    allRatings: RatingData[],
    noteStatuses: Map<string, NoteStatus>
  ): Promise<Map<string, UserScore>> {
    logger.info('Calculating helpfulness scores for batch', { userCount: users.length });

    const results = new Map<string, UserScore>();

    // Group ratings by user
    const ratingsByUser = new Map<string, RatingData[]>();
    for (const rating of allRatings) {
      if (!ratingsByUser.has(rating.raterId)) {
        ratingsByUser.set(rating.raterId, []);
      }
      ratingsByUser.get(rating.raterId)!.push(rating);
    }

    // Calculate scores for each user
    for (const user of users) {
      const userRatings = ratingsByUser.get(user.userId) || [];
      const userScore = this.calculateUserHelpfulness(user, userRatings, noteStatuses);
      results.set(user.userId, userScore);
    }

    logger.info('Completed helpfulness score calculation', {
      userCount: results.size,
      averageScore: this.calculateAverageScore(results)
    });

    return results;
  }

  /**
   * Calculate average helpfulness score across all users
   */
  private calculateAverageScore(userScores: Map<string, UserScore>): number {
    const scores = Array.from(userScores.values()).map(s => s.helpfulnessScore);
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }
}