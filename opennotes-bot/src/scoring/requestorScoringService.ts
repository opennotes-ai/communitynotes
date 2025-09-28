import { prisma } from '../database/client.js';
import { User, NoteRequest, CommunityNote, Prisma } from '@prisma/client';
import { logger } from '../shared/utils/logger.js';
import { NoteStatus, TrustLevel } from './types.js';

export interface RequestorMetrics {
  userId: string;
  totalEligibleRequests: number;
  successfulRequests: number;
  crhNoteCount: number;
  hitRate: number;
  helpfulnessLevel: RequestorHelpfulnessLevel;
}

export enum RequestorHelpfulnessLevel {
  DEFAULT = 'default',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface RequestorScoringConfig {
  // Hit rate thresholds for helpfulness levels
  highHelpfulnessHitRate: number;
  mediumHelpfulnessHitRate: number;

  // Minimum CRH note counts for helpfulness levels
  highHelpfulnessMinCrhNotes: number;
  mediumHelpfulnessMinCrhNotes: number;

  // Visibility thresholds based on helpfulness level
  defaultVisibilityThreshold: number;
  mediumVisibilityThreshold: number;
  highVisibilityThreshold: number;

  // Gaming prevention
  minRequestAge: number; // Hours before request can count toward hit rate
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  minTimeBetweenRequests: number; // Minutes

  // Eligibility rules
  minAccountAge: number; // Days
  minServerMembershipDays: number;

  // Sliding window for hit rate calculation
  hitRateWindowDays: number;
}

export const DEFAULT_REQUESTOR_SCORING_CONFIG: RequestorScoringConfig = {
  // Hit rate thresholds - matches X/Twitter Community Notes criteria
  highHelpfulnessHitRate: 0.08, // 8%
  mediumHelpfulnessHitRate: 0.03, // 3%

  // Minimum CRH note counts
  highHelpfulnessMinCrhNotes: 5,
  mediumHelpfulnessMinCrhNotes: 1,

  // Visibility thresholds (requests needed to show)
  defaultVisibilityThreshold: 3,
  mediumVisibilityThreshold: 2,
  highVisibilityThreshold: 1,

  // Gaming prevention
  minRequestAge: 24, // Must wait 24h before counting toward hit rate
  maxRequestsPerHour: 5,
  maxRequestsPerDay: 25,
  minTimeBetweenRequests: 5, // 5 minutes between requests

  // Eligibility rules
  minAccountAge: 7, // 7 days old account
  minServerMembershipDays: 3, // 3 days in server

  // Hit rate calculation window
  hitRateWindowDays: 90 // 90-day sliding window
};

export class RequestorScoringService {
  private config: RequestorScoringConfig;

  constructor(config: RequestorScoringConfig = DEFAULT_REQUESTOR_SCORING_CONFIG) {
    this.config = config;
  }

  /**
   * Check if a user is eligible to make requests based on gaming prevention rules
   */
  async isUserEligibleForRequest(
    userId: string,
    serverId: string
  ): Promise<{ eligible: boolean; reason?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          serverMemberships: {
            where: { serverId },
          },
          noteRequests: {
            where: {
              timestamp: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      if (!user) {
        return { eligible: false, reason: 'User not found' };
      }

      // Check account age
      const accountAge = Date.now() - user.joinedAt.getTime();
      const minAccountAgeMs = this.config.minAccountAge * 24 * 60 * 60 * 1000;
      if (accountAge < minAccountAgeMs) {
        return {
          eligible: false,
          reason: `Account must be at least ${this.config.minAccountAge} days old`
        };
      }

      // Check server membership
      const serverMembership = user.serverMemberships[0];
      if (!serverMembership) {
        return { eligible: false, reason: 'User not member of server' };
      }

      const membershipAge = Date.now() - serverMembership.joinedAt.getTime();
      const minMembershipMs = this.config.minServerMembershipDays * 24 * 60 * 60 * 1000;
      if (membershipAge < minMembershipMs) {
        return {
          eligible: false,
          reason: `Must be server member for at least ${this.config.minServerMembershipDays} days`
        };
      }

      // Check daily request limit
      const dailyRequests = await this.getDailyRequestCount(userId);
      if (dailyRequests >= this.config.maxRequestsPerDay) {
        return {
          eligible: false,
          reason: `Daily request limit of ${this.config.maxRequestsPerDay} reached`
        };
      }

      // Check hourly request limit
      const hourlyRequests = await this.getHourlyRequestCount(userId);
      if (hourlyRequests >= this.config.maxRequestsPerHour) {
        return {
          eligible: false,
          reason: `Hourly request limit of ${this.config.maxRequestsPerHour} reached`
        };
      }

      // Check minimum time between requests
      if (user.noteRequests.length > 0) {
        const lastRequest = user.noteRequests[0];
        const timeSinceLastRequest = Date.now() - lastRequest.timestamp.getTime();
        const minTimeMs = this.config.minTimeBetweenRequests * 60 * 1000;
        if (timeSinceLastRequest < minTimeMs) {
          return {
            eligible: false,
            reason: `Must wait ${this.config.minTimeBetweenRequests} minutes between requests`
          };
        }
      }

      return { eligible: true };
    } catch (error) {
      logger.error('Error checking user eligibility for request:', error);
      return { eligible: false, reason: 'System error' };
    }
  }

  /**
   * Track an eligible request made by a user
   */
  async trackEligibleRequest(
    userId: string,
    messageId: string,
    reason?: string,
    sources?: string[]
  ): Promise<NoteRequest> {
    try {
      // Note: The actual request creation is handled by NoteRequestService
      // This method would be called after request creation to track it for scoring

      const request = await prisma.noteRequest.findUnique({
        where: {
          messageId_requestorId: {
            messageId,
            requestorId: userId,
          },
        },
      });

      if (!request) {
        throw new Error('Request not found');
      }

      logger.info(`Tracked eligible request from user ${userId} for message ${messageId}`);
      return request;
    } catch (error) {
      logger.error('Error tracking eligible request:', error);
      throw error;
    }
  }

  /**
   * Calculate hit rate for a user based on successful vs total eligible requests
   */
  async calculateUserHitRate(userId: string): Promise<{
    totalEligibleRequests: number;
    successfulRequests: number;
    crhNoteCount: number;
    hitRate: number;
  }> {
    try {
      const windowStart = new Date(Date.now() - this.config.hitRateWindowDays * 24 * 60 * 60 * 1000);
      const minRequestAge = new Date(Date.now() - this.config.minRequestAge * 60 * 60 * 1000);

      // Get all eligible requests from user in the window
      const eligibleRequests = await prisma.noteRequest.findMany({
        where: {
          requestorId: userId,
          timestamp: {
            gte: windowStart,
            lte: minRequestAge, // Only count requests older than minRequestAge
          },
          isActive: true,
        },
        include: {
          message: {
            include: {
              communityNotes: {
                where: {
                  status: NoteStatus.CURRENTLY_RATED_HELPFUL,
                },
              },
            },
          },
        },
      });

      // Count successful requests (those that resulted in CRH notes)
      const successfulRequests = eligibleRequests.filter(request =>
        request.message.communityNotes.length > 0
      );

      const totalEligibleRequests = eligibleRequests.length;
      const successfulCount = successfulRequests.length;
      const crhNoteCount = successfulRequests.reduce(
        (sum, request) => sum + request.message.communityNotes.length,
        0
      );

      const hitRate = totalEligibleRequests > 0 ? successfulCount / totalEligibleRequests : 0;

      return {
        totalEligibleRequests,
        successfulRequests: successfulCount,
        crhNoteCount,
        hitRate,
      };
    } catch (error) {
      logger.error('Error calculating user hit rate:', error);
      throw error;
    }
  }

  /**
   * Update user helpfulness score based on hit rate and CRH note count
   */
  async updateUserHelpfulnessScore(userId: string): Promise<RequestorMetrics> {
    try {
      const hitRateData = await this.calculateUserHitRate(userId);
      const helpfulnessLevel = this.determineHelpfulnessLevel(hitRateData);

      // Update user record with new helpfulness metrics
      await prisma.user.update({
        where: { id: userId },
        data: {
          // Store hit rate in helpfulness score field for now
          // In a full implementation, we'd add specific requestor fields to the schema
          helpfulnessScore: hitRateData.hitRate,
          lastActiveAt: new Date(),
        },
      });

      const metrics: RequestorMetrics = {
        userId,
        ...hitRateData,
        helpfulnessLevel,
      };

      logger.info(`Updated helpfulness score for user ${userId}:`, metrics);
      return metrics;
    } catch (error) {
      logger.error('Error updating user helpfulness score:', error);
      throw error;
    }
  }

  /**
   * Determine helpfulness level based on hit rate and CRH note count
   */
  private determineHelpfulnessLevel(data: {
    hitRate: number;
    crhNoteCount: number;
  }): RequestorHelpfulnessLevel {
    // High helpfulness: hit rate >= 8% AND CRH notes >= 5
    if (data.hitRate >= this.config.highHelpfulnessHitRate &&
        data.crhNoteCount >= this.config.highHelpfulnessMinCrhNotes) {
      return RequestorHelpfulnessLevel.HIGH;
    }

    // Medium helpfulness: hit rate >= 3% AND CRH notes >= 1
    if (data.hitRate >= this.config.mediumHelpfulnessHitRate &&
        data.crhNoteCount >= this.config.mediumHelpfulnessMinCrhNotes) {
      return RequestorHelpfulnessLevel.MEDIUM;
    }

    return RequestorHelpfulnessLevel.DEFAULT;
  }

  /**
   * Get visibility threshold for requests based on user helpfulness level
   */
  async getVisibilityThreshold(userId: string): Promise<number> {
    try {
      const metrics = await this.calculateUserHitRate(userId);
      const helpfulnessLevel = this.determineHelpfulnessLevel(metrics);

      switch (helpfulnessLevel) {
        case RequestorHelpfulnessLevel.HIGH:
          return this.config.highVisibilityThreshold;
        case RequestorHelpfulnessLevel.MEDIUM:
          return this.config.mediumVisibilityThreshold;
        default:
          return this.config.defaultVisibilityThreshold;
      }
    } catch (error) {
      logger.error('Error getting visibility threshold:', error);
      return this.config.defaultVisibilityThreshold;
    }
  }

  /**
   * Check if a message should show requests based on user helpfulness levels
   */
  async shouldShowRequests(messageId: string): Promise<boolean> {
    try {
      const requests = await prisma.noteRequest.findMany({
        where: {
          messageId,
          isActive: true,
        },
        include: {
          requestor: true,
        },
      });

      if (requests.length === 0) {
        return false;
      }

      // Group requests by helpfulness level
      const requestsByLevel = {
        [RequestorHelpfulnessLevel.HIGH]: 0,
        [RequestorHelpfulnessLevel.MEDIUM]: 0,
        [RequestorHelpfulnessLevel.DEFAULT]: 0,
      };

      for (const request of requests) {
        const metrics = await this.calculateUserHitRate(request.requestorId);
        const level = this.determineHelpfulnessLevel(metrics);
        requestsByLevel[level]++;
      }

      // Check if any helpfulness level meets its threshold
      if (requestsByLevel[RequestorHelpfulnessLevel.HIGH] >= this.config.highVisibilityThreshold) {
        return true;
      }
      if (requestsByLevel[RequestorHelpfulnessLevel.MEDIUM] >= this.config.mediumVisibilityThreshold) {
        return true;
      }
      if (requestsByLevel[RequestorHelpfulnessLevel.DEFAULT] >= this.config.defaultVisibilityThreshold) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error checking if requests should show:', error);
      return false;
    }
  }

  /**
   * Bulk update helpfulness scores for all active users
   */
  async bulkUpdateHelpfulnessScores(batchSize = 100): Promise<{
    processed: number;
    updated: number;
    errors: number;
  }> {
    try {
      let processed = 0;
      let updated = 0;
      let errors = 0;
      let offset = 0;

      const windowStart = new Date(Date.now() - this.config.hitRateWindowDays * 24 * 60 * 60 * 1000);

      while (true) {
        // Get users who made requests in the scoring window
        const users = await prisma.user.findMany({
          where: {
            noteRequests: {
              some: {
                timestamp: {
                  gte: windowStart,
                },
              },
            },
          },
          skip: offset,
          take: batchSize,
        });

        if (users.length === 0) {
          break;
        }

        for (const user of users) {
          try {
            await this.updateUserHelpfulnessScore(user.id);
            updated++;
          } catch (error) {
            logger.error(`Error updating helpfulness score for user ${user.id}:`, error);
            errors++;
          }
          processed++;
        }

        offset += batchSize;
      }

      logger.info(`Bulk helpfulness score update completed: ${processed} processed, ${updated} updated, ${errors} errors`);
      return { processed, updated, errors };
    } catch (error) {
      logger.error('Error in bulk helpfulness score update:', error);
      throw error;
    }
  }

  /**
   * Get user's daily request count
   */
  private async getDailyRequestCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await prisma.noteRequest.count({
      where: {
        requestorId: userId,
        timestamp: {
          gte: today,
        },
        isActive: true,
      },
    });

    return count;
  }

  /**
   * Get user's hourly request count
   */
  private async getHourlyRequestCount(userId: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const count = await prisma.noteRequest.count({
      where: {
        requestorId: userId,
        timestamp: {
          gte: oneHourAgo,
        },
        isActive: true,
      },
    });

    return count;
  }

  /**
   * Get requestor metrics for a user
   */
  async getRequestorMetrics(userId: string): Promise<RequestorMetrics> {
    try {
      const hitRateData = await this.calculateUserHitRate(userId);
      const helpfulnessLevel = this.determineHelpfulnessLevel(hitRateData);

      return {
        userId,
        ...hitRateData,
        helpfulnessLevel,
      };
    } catch (error) {
      logger.error('Error getting requestor metrics:', error);
      throw error;
    }
  }

  /**
   * Process note status change to update requestor scores
   */
  async processNoteStatusChange(noteId: string, newStatus: string): Promise<void> {
    try {
      if (newStatus !== NoteStatus.CURRENTLY_RATED_HELPFUL) {
        return; // Only process CRH status changes
      }

      const note = await prisma.communityNote.findUnique({
        where: { id: noteId },
        include: {
          message: {
            include: {
              noteRequests: {
                where: { isActive: true },
                include: { requestor: true },
              },
            },
          },
        },
      });

      if (!note) {
        logger.warn(`Note ${noteId} not found for status change processing`);
        return;
      }

      // Update scores for all requestors of this message
      const updatePromises = note.message.noteRequests.map(request =>
        this.updateUserHelpfulnessScore(request.requestorId)
      );

      await Promise.allSettled(updatePromises);

      logger.info(`Processed note status change for note ${noteId}, updated ${note.message.noteRequests.length} requestor scores`);
    } catch (error) {
      logger.error('Error processing note status change:', error);
      throw error;
    }
  }
}