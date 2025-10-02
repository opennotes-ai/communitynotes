import { prisma } from '../client.js';
import { NoteRequest, Prisma } from '@prisma/client';
import { logger } from '../../shared/utils/logger.js';
import { appConfig } from '../../shared/config/index.js';
import { requestorScoringService } from '../../external/scoringAdapter.js';

export class NoteRequestService {
  async createRequest(data: {
    messageId: string;
    requestorId: string;
    serverId: string;
    reason?: string;
    sources?: string[];
  }): Promise<NoteRequest> {
    try {
      // Check requestor eligibility first
      const eligibility = await requestorScoringService.isUserEligibleForRequest(
        data.requestorId,
        data.serverId
      );

      if (!eligibility.eligible) {
        throw new Error(`Request not allowed: ${eligibility.reason}`);
      }

      // Check if user already requested for this message
      const existingRequest = await prisma.noteRequest.findUnique({
        where: {
          messageId_requestorId: {
            messageId: data.messageId,
            requestorId: data.requestorId,
          },
        },
      });

      if (existingRequest) {
        if (existingRequest.isActive) {
          throw new Error('User has already requested a note for this message');
        }
        // Reactivate existing request
        const reactivatedRequest = await prisma.noteRequest.update({
          where: { id: existingRequest.id },
          data: {
            isActive: true,
            reason: data.reason,
            sources: data.sources || [],
            timestamp: new Date(),
          },
        });

        // Track the reactivated request
        await requestorScoringService.trackEligibleRequest(
          data.requestorId,
          data.messageId,
          data.reason,
          data.sources
        );

        return reactivatedRequest;
      }

      const newRequest = await prisma.noteRequest.create({
        data: {
          messageId: data.messageId,
          requestorId: data.requestorId,
          reason: data.reason,
          sources: data.sources || [],
        },
      });

      // Track the new eligible request
      await requestorScoringService.trackEligibleRequest(
        data.requestorId,
        data.messageId,
        data.reason,
        data.sources
      );

      return newRequest;
    } catch (error) {
      logger.error('Error creating note request:', error);
      throw error;
    }
  }

  async deactivateRequest(messageId: string, requestorId: string): Promise<NoteRequest | null> {
    try {
      const request = await prisma.noteRequest.findUnique({
        where: {
          messageId_requestorId: {
            messageId,
            requestorId,
          },
        },
      });

      if (!request) {
        return null;
      }

      return await prisma.noteRequest.update({
        where: { id: request.id },
        data: { isActive: false },
      });
    } catch (error) {
      logger.error('Error deactivating note request:', error);
      throw error;
    }
  }

  async getRequestsForMessage(messageId: string, activeOnly = true): Promise<NoteRequest[]> {
    try {
      return await prisma.noteRequest.findMany({
        where: {
          messageId,
          ...(activeOnly && { isActive: true }),
        },
        include: {
          requestor: {
            select: {
              id: true,
              discordId: true,
              username: true,
              helpfulnessScore: true,
              trustLevel: true,
            },
          },
        },
        orderBy: { timestamp: 'asc' },
      });
    } catch (error) {
      logger.error('Error getting requests for message:', error);
      throw error;
    }
  }

  async getUserRequests(requestorId: string, activeOnly = true, limit = 50): Promise<NoteRequest[]> {
    try {
      return await prisma.noteRequest.findMany({
        where: {
          requestorId,
          ...(activeOnly && { isActive: true }),
        },
        include: {
          message: {
            include: {
              server: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
    } catch (error) {
      logger.error('Error getting user requests:', error);
      throw error;
    }
  }

  async getRequestCountForMessage(messageId: string): Promise<{
    total: number;
    unique: number;
    recentHours: number;
    shouldShow: boolean;
  }> {
    try {
      const requests = await prisma.noteRequest.findMany({
        where: {
          messageId,
          isActive: true,
        },
      });

      const recentThreshold = new Date(Date.now() - appConfig.REQUEST_TIMEOUT_HOURS * 60 * 60 * 1000);
      const recentRequests = requests.filter(req => req.timestamp >= recentThreshold);

      const uniqueRequestors = new Set(requests.map(req => req.requestorId)).size;

      // Check if requests should be shown based on helpfulness scoring
      const shouldShow = await requestorScoringService.shouldShowRequests(messageId);

      return {
        total: requests.length,
        unique: uniqueRequestors,
        recentHours: recentRequests.length,
        shouldShow,
      };
    } catch (error) {
      logger.error('Error getting request count for message:', error);
      throw error;
    }
  }

  async getRecentRequests(hours = 24, limit = 100): Promise<NoteRequest[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      return await prisma.noteRequest.findMany({
        where: {
          timestamp: { gte: since },
          isActive: true,
        },
        include: {
          requestor: {
            select: {
              id: true,
              discordId: true,
              username: true,
              trustLevel: true,
            },
          },
          message: {
            include: {
              server: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
    } catch (error) {
      logger.error('Error getting recent requests:', error);
      throw error;
    }
  }

  async bulkDeactivateForMessage(messageId: string): Promise<number> {
    try {
      const result = await prisma.noteRequest.updateMany({
        where: {
          messageId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      return result.count;
    } catch (error) {
      logger.error('Error bulk deactivating requests:', error);
      throw error;
    }
  }

  async getRequestTrends(serverId: string, days = 7): Promise<{
    date: string;
    requests: number;
    uniqueUsers: number;
  }[]> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const requests = await prisma.noteRequest.findMany({
        where: {
          timestamp: { gte: since },
          message: {
            serverId,
          },
        },
        select: {
          timestamp: true,
          requestorId: true,
        },
      });

      const trendsMap = new Map<string, { requests: Set<string>; count: number }>();

      for (const request of requests) {
        const dateKey = request.timestamp.toISOString().split('T')[0];
        if (!trendsMap.has(dateKey)) {
          trendsMap.set(dateKey, { requests: new Set(), count: 0 });
        }
        const dayData = trendsMap.get(dateKey)!;
        dayData.requests.add(request.requestorId);
        dayData.count++;
      }

      return Array.from(trendsMap.entries()).map(([date, data]) => ({
        date,
        requests: data.count,
        uniqueUsers: data.requests.size,
      })).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      logger.error('Error getting request trends:', error);
      throw error;
    }
  }
}