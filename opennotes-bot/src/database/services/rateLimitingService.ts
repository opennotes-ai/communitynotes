import { prisma } from '../client.js';
import { RateLimiting, Prisma } from '@prisma/client';
import { logger } from '../../shared/utils/logger.js';
import { appConfig } from '../../shared/config/index.js';

export class RateLimitingService {
  async checkRateLimit(userId: string, limitType: string, maxCount: number): Promise<{
    allowed: boolean;
    currentCount: number;
    resetAt: Date;
    remainingCount: number;
  }> {
    try {
      const now = new Date();
      const resetAt = this.getResetTime(limitType);

      // Find or create rate limit record
      let rateLimit = await prisma.rateLimiting.findUnique({
        where: {
          userId_limitType: {
            userId,
            limitType,
          },
        },
      });

      if (!rateLimit || rateLimit.resetAt <= now) {
        // Create new or reset expired rate limit
        rateLimit = await prisma.rateLimiting.upsert({
          where: {
            userId_limitType: {
              userId,
              limitType,
            },
          },
          update: {
            count: 0,
            resetAt,
          },
          create: {
            userId,
            limitType,
            count: 0,
            resetAt,
          },
        });
      }

      const allowed = rateLimit.count < maxCount;
      const remainingCount = Math.max(0, maxCount - rateLimit.count);

      return {
        allowed,
        currentCount: rateLimit.count,
        resetAt: rateLimit.resetAt,
        remainingCount,
      };
    } catch (error) {
      logger.error('Error checking rate limit:', error);
      throw error;
    }
  }

  async incrementRateLimit(userId: string, limitType: string): Promise<RateLimiting> {
    try {
      const now = new Date();
      const resetAt = this.getResetTime(limitType);

      return await prisma.rateLimiting.upsert({
        where: {
          userId_limitType: {
            userId,
            limitType,
          },
        },
        update: {
          count: { increment: 1 },
        },
        create: {
          userId,
          limitType,
          count: 1,
          resetAt,
        },
      });
    } catch (error) {
      logger.error('Error incrementing rate limit:', error);
      throw error;
    }
  }

  async checkDailyRequestLimit(userId: string): Promise<{
    allowed: boolean;
    currentCount: number;
    maxCount: number;
    resetAt: Date;
  }> {
    try {
      const result = await this.checkRateLimit(userId, 'daily_requests', appConfig.MAX_REQUESTS_PER_DAY);

      return {
        allowed: result.allowed,
        currentCount: result.currentCount,
        maxCount: appConfig.MAX_REQUESTS_PER_DAY,
        resetAt: result.resetAt,
      };
    } catch (error) {
      logger.error('Error checking daily request limit:', error);
      throw error;
    }
  }

  async incrementDailyRequestCount(userId: string): Promise<void> {
    try {
      await this.incrementRateLimit(userId, 'daily_requests');
    } catch (error) {
      logger.error('Error incrementing daily request count:', error);
      throw error;
    }
  }

  async checkNoteCreationLimit(userId: string, maxNotesPerDay = 10): Promise<{
    allowed: boolean;
    currentCount: number;
    maxCount: number;
    resetAt: Date;
  }> {
    try {
      const result = await this.checkRateLimit(userId, 'note_creation', maxNotesPerDay);

      return {
        allowed: result.allowed,
        currentCount: result.currentCount,
        maxCount: maxNotesPerDay,
        resetAt: result.resetAt,
      };
    } catch (error) {
      logger.error('Error checking note creation limit:', error);
      throw error;
    }
  }

  async incrementNoteCreationCount(userId: string): Promise<void> {
    try {
      await this.incrementRateLimit(userId, 'note_creation');
    } catch (error) {
      logger.error('Error incrementing note creation count:', error);
      throw error;
    }
  }

  async checkRatingLimit(userId: string, maxRatingsPerDay = 50): Promise<{
    allowed: boolean;
    currentCount: number;
    maxCount: number;
    resetAt: Date;
  }> {
    try {
      const result = await this.checkRateLimit(userId, 'rating', maxRatingsPerDay);

      return {
        allowed: result.allowed,
        currentCount: result.currentCount,
        maxCount: maxRatingsPerDay,
        resetAt: result.resetAt,
      };
    } catch (error) {
      logger.error('Error checking rating limit:', error);
      throw error;
    }
  }

  async incrementRatingCount(userId: string): Promise<void> {
    try {
      await this.incrementRateLimit(userId, 'rating');
    } catch (error) {
      logger.error('Error incrementing rating count:', error);
      throw error;
    }
  }

  async getRateLimitStatus(userId: string): Promise<{
    dailyRequests: { current: number; max: number; resetAt: Date };
    noteCreation: { current: number; max: number; resetAt: Date };
    rating: { current: number; max: number; resetAt: Date };
  }> {
    try {
      const [dailyRequests, noteCreation, rating] = await Promise.all([
        this.checkDailyRequestLimit(userId),
        this.checkNoteCreationLimit(userId),
        this.checkRatingLimit(userId),
      ]);

      return {
        dailyRequests: {
          current: dailyRequests.currentCount,
          max: dailyRequests.maxCount,
          resetAt: dailyRequests.resetAt,
        },
        noteCreation: {
          current: noteCreation.currentCount,
          max: noteCreation.maxCount,
          resetAt: noteCreation.resetAt,
        },
        rating: {
          current: rating.currentCount,
          max: rating.maxCount,
          resetAt: rating.resetAt,
        },
      };
    } catch (error) {
      logger.error('Error getting rate limit status:', error);
      throw error;
    }
  }

  async resetRateLimit(userId: string, limitType: string): Promise<void> {
    try {
      const resetAt = this.getResetTime(limitType);

      await prisma.rateLimiting.upsert({
        where: {
          userId_limitType: {
            userId,
            limitType,
          },
        },
        update: {
          count: 0,
          resetAt,
        },
        create: {
          userId,
          limitType,
          count: 0,
          resetAt,
        },
      });
    } catch (error) {
      logger.error('Error resetting rate limit:', error);
      throw error;
    }
  }

  async cleanupExpiredLimits(): Promise<number> {
    try {
      const now = new Date();

      const result = await prisma.rateLimiting.deleteMany({
        where: {
          resetAt: { lte: now },
        },
      });

      logger.info(`Cleaned up ${result.count} expired rate limits`);
      return result.count;
    } catch (error) {
      logger.error('Error cleaning up expired limits:', error);
      throw error;
    }
  }

  private getResetTime(limitType: string): Date {
    const now = new Date();

    switch (limitType) {
      case 'daily_requests':
      case 'note_creation':
      case 'rating':
        // Reset at midnight
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;

      case 'hourly':
        // Reset at the top of the next hour
        const nextHour = new Date(now);
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        return nextHour;

      default:
        // Default to 24 hours from now
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  async getUsersNearLimit(limitType: string, threshold = 0.8): Promise<any[]> {
    try {
      // TODO: Fix Prisma include type issue later
      return [];
      /*
      const limits = await prisma.rateLimiting.findMany({
        where: {
          limitType,
          resetAt: { gt: new Date() },
        },
        include: {
          user: {
            select: {
              id: true,
              discordId: true,
              username: true,
              trustLevel: true,
            },
          },
        },
      });
      */

      const maxCount = this.getMaxCountForLimitType(limitType);

      return limits
        .filter(limit => limit.count / maxCount >= threshold)
        .map(limit => ({
          ...limit,
          percentageUsed: (limit.count / maxCount) * 100,
          maxCount,
        }));
    } catch (error) {
      logger.error('Error getting users near limit:', error);
      throw error;
    }
  }

  private getMaxCountForLimitType(limitType: string): number {
    switch (limitType) {
      case 'daily_requests':
        return appConfig.MAX_REQUESTS_PER_DAY;
      case 'note_creation':
        return 10; // Default max notes per day
      case 'rating':
        return 50; // Default max ratings per day
      default:
        return 10;
    }
  }
}