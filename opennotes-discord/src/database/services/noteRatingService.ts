import { prisma } from '../client.js';
import { NoteRating, Prisma } from '@prisma/client';
import { logger } from '../../shared/utils/logger.js';

export class NoteRatingService {
  async createRating(data: {
    noteId: string;
    raterId: string;
    helpful: boolean;
    reason?: string;
    weight?: number;
  }): Promise<NoteRating> {
    try {
      // Check if user already rated this note
      const existingRating = await prisma.noteRating.findUnique({
        where: {
          noteId_raterId: {
            noteId: data.noteId,
            raterId: data.raterId,
          },
        },
      });

      if (existingRating) {
        // Update existing rating
        return await prisma.noteRating.update({
          where: { id: existingRating.id },
          data: {
            helpful: data.helpful,
            reason: data.reason,
            weight: data.weight || 1.0,
            timestamp: new Date(),
          },
        });
      }

      return await prisma.noteRating.create({
        data: {
          noteId: data.noteId,
          raterId: data.raterId,
          helpful: data.helpful,
          reason: data.reason,
          weight: data.weight || 1.0,
        },
      });
    } catch (error) {
      logger.error('Error creating/updating rating:', error);
      throw error;
    }
  }

  async getRatingsForNote(noteId: string): Promise<NoteRating[]> {
    try {
      return await prisma.noteRating.findMany({
        where: { noteId },
        include: {
          rater: {
            select: {
              id: true,
              discordId: true,
              username: true,
              helpfulnessScore: true,
              trustLevel: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
      });
    } catch (error) {
      logger.error('Error getting ratings for note:', error);
      throw error;
    }
  }

  async getUserRating(noteId: string, raterId: string): Promise<NoteRating | null> {
    try {
      return await prisma.noteRating.findUnique({
        where: {
          noteId_raterId: {
            noteId,
            raterId,
          },
        },
        include: {
          note: {
            select: {
              id: true,
              content: true,
              classification: true,
              status: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error getting user rating:', error);
      throw error;
    }
  }

  async getRatingsByUser(raterId: string, limit = 50): Promise<NoteRating[]> {
    try {
      return await prisma.noteRating.findMany({
        where: { raterId },
        include: {
          note: {
            include: {
              author: {
                select: {
                  id: true,
                  discordId: true,
                  username: true,
                },
              },
              message: {
                include: {
                  server: true,
                },
              },
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
    } catch (error) {
      logger.error('Error getting ratings by user:', error);
      throw error;
    }
  }

  async deleteRating(noteId: string, raterId: string): Promise<boolean> {
    try {
      const rating = await prisma.noteRating.findUnique({
        where: {
          noteId_raterId: {
            noteId,
            raterId,
          },
        },
      });

      if (!rating) {
        return false;
      }

      await prisma.noteRating.delete({
        where: { id: rating.id },
      });

      return true;
    } catch (error) {
      logger.error('Error deleting rating:', error);
      throw error;
    }
  }

  async calculateWeightedScore(noteId: string): Promise<{
    weightedHelpfulScore: number;
    weightedNotHelpfulScore: number;
    totalWeight: number;
    helpfulnessRatio: number;
  }> {
    try {
      const ratings = await prisma.noteRating.findMany({
        where: { noteId },
        include: {
          rater: {
            select: {
              helpfulnessScore: true,
              trustLevel: true,
            },
          },
        },
      });

      let weightedHelpfulScore = 0;
      let weightedNotHelpfulScore = 0;
      let totalWeight = 0;

      for (const rating of ratings) {
        // Calculate weight based on rater's trust level and helpfulness score
        const trustMultiplier = this.getTrustMultiplier(rating.rater.trustLevel);
        const helpfulnessMultiplier = Math.max(0.1, Math.min(2.0, rating.rater.helpfulnessScore / 10));
        const weight = rating.weight * trustMultiplier * helpfulnessMultiplier;

        totalWeight += weight;

        if (rating.helpful) {
          weightedHelpfulScore += weight;
        } else {
          weightedNotHelpfulScore += weight;
        }
      }

      const helpfulnessRatio = totalWeight > 0 ? weightedHelpfulScore / totalWeight : 0;

      return {
        weightedHelpfulScore,
        weightedNotHelpfulScore,
        totalWeight,
        helpfulnessRatio,
      };
    } catch (error) {
      logger.error('Error calculating weighted score:', error);
      throw error;
    }
  }

  private getTrustMultiplier(trustLevel: string): number {
    switch (trustLevel) {
      case 'newcomer':
        return 0.5;
      case 'contributor':
        return 1.0;
      case 'trusted':
        return 1.5;
      default:
        return 1.0;
    }
  }

  async getRatingStats(noteId: string): Promise<{
    total: number;
    helpful: number;
    notHelpful: number;
    helpfulnessRatio: number;
    averageWeight: number;
    raterTrustDistribution: Record<string, number>;
  }> {
    try {
      const ratings = await prisma.noteRating.findMany({
        where: { noteId },
        include: {
          rater: {
            select: {
              trustLevel: true,
            },
          },
        },
      });

      const helpful = ratings.filter(r => r.helpful).length;
      const notHelpful = ratings.filter(r => !r.helpful).length;
      const total = ratings.length;
      const helpfulnessRatio = total > 0 ? helpful / total : 0;
      const averageWeight = total > 0 ? ratings.reduce((sum, r) => sum + r.weight, 0) / total : 0;

      const raterTrustDistribution: Record<string, number> = {};
      for (const rating of ratings) {
        const trustLevel = rating.rater.trustLevel;
        raterTrustDistribution[trustLevel] = (raterTrustDistribution[trustLevel] || 0) + 1;
      }

      return {
        total,
        helpful,
        notHelpful,
        helpfulnessRatio,
        averageWeight,
        raterTrustDistribution,
      };
    } catch (error) {
      logger.error('Error getting rating stats:', error);
      throw error;
    }
  }

  async getRecentRatings(hours = 24, limit = 100): Promise<NoteRating[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      return await prisma.noteRating.findMany({
        where: {
          timestamp: { gte: since },
        },
        include: {
          rater: {
            select: {
              id: true,
              discordId: true,
              username: true,
              trustLevel: true,
            },
          },
          note: {
            include: {
              author: {
                select: {
                  id: true,
                  discordId: true,
                  username: true,
                },
              },
              message: {
                include: {
                  server: true,
                },
              },
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
    } catch (error) {
      logger.error('Error getting recent ratings:', error);
      throw error;
    }
  }
}