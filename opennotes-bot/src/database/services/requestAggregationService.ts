import { prisma } from '../client.js';
import { RequestAggregation, Prisma } from '@prisma/client';
import { logger } from '../../shared/utils/logger.js';
import { appConfig } from '../../shared/config/index.js';

export class RequestAggregationService {
  async updateAggregation(messageId: string): Promise<RequestAggregation> {
    try {
      const requests = await prisma.noteRequest.findMany({
        where: {
          messageId,
          isActive: true,
        },
        orderBy: { timestamp: 'asc' },
      });

      const totalRequests = requests.length;
      const uniqueRequestors = new Set(requests.map(req => req.requestorId)).size;
      const firstRequestAt = requests.length > 0 ? requests[0].timestamp : null;
      const lastRequestAt = requests.length > 0 ? requests[requests.length - 1].timestamp : null;

      // Check if threshold is met
      const thresholdMet = totalRequests >= appConfig.MIN_REQUESTS_FOR_VISIBILITY;

      return await prisma.requestAggregation.upsert({
        where: { messageId },
        update: {
          totalRequests,
          uniqueRequestors,
          firstRequestAt,
          lastRequestAt,
          thresholdMet,
          thresholdMetAt: thresholdMet ? new Date() : null,
        },
        create: {
          messageId,
          totalRequests,
          uniqueRequestors,
          firstRequestAt,
          lastRequestAt,
          thresholdMet,
          thresholdMetAt: thresholdMet ? new Date() : null,
        },
      });
    } catch (error) {
      logger.error('Error updating request aggregation:', error);
      throw error;
    }
  }

  async getAggregation(messageId: string): Promise<RequestAggregation | null> {
    try {
      return await prisma.requestAggregation.findUnique({
        where: { messageId },
      });
    } catch (error) {
      logger.error('Error getting request aggregation:', error);
      throw error;
    }
  }

  async getMessagesNeedingContributorNotification(): Promise<RequestAggregation[]> {
    try {
      return await prisma.requestAggregation.findMany({
        where: {
          thresholdMet: true,
          contributorsNotified: false,
        },
        orderBy: { thresholdMetAt: 'asc' },
      });
    } catch (error) {
      logger.error('Error getting messages needing contributor notification:', error);
      throw error;
    }
  }

  async markContributorsNotified(messageId: string): Promise<RequestAggregation> {
    try {
      return await prisma.requestAggregation.update({
        where: { messageId },
        data: {
          contributorsNotified: true,
          notifiedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error marking contributors notified:', error);
      throw error;
    }
  }

  async shouldNotifyContributors(messageId: string): Promise<{
    shouldNotify: boolean;
    totalRequests: number;
    uniqueRequestors: number;
    threshold: number;
  }> {
    try {
      const aggregation = await this.getAggregation(messageId);

      if (!aggregation) {
        return {
          shouldNotify: false,
          totalRequests: 0,
          uniqueRequestors: 0,
          threshold: appConfig.MIN_REQUESTS_FOR_VISIBILITY,
        };
      }

      const shouldNotify = aggregation.thresholdMet && !aggregation.contributorsNotified;

      return {
        shouldNotify,
        totalRequests: aggregation.totalRequests,
        uniqueRequestors: aggregation.uniqueRequestors,
        threshold: appConfig.MIN_REQUESTS_FOR_VISIBILITY,
      };
    } catch (error) {
      logger.error('Error checking if should notify contributors:', error);
      throw error;
    }
  }

  async getTopRequestedMessages(serverId?: string, limit = 20, hours = 24): Promise<any[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const whereClause: any = {
        totalRequests: { gt: 0 },
        lastRequestAt: { gte: since },
      };

      const aggregations = await prisma.requestAggregation.findMany({
        where: whereClause,
        orderBy: [
          { totalRequests: 'desc' },
          { uniqueRequestors: 'desc' },
          { lastRequestAt: 'desc' },
        ],
        take: limit,
      });

      // Get message details for each aggregation
      const messageIds = aggregations.map(agg => agg.messageId);
      const messages = await prisma.message.findMany({
        where: {
          id: { in: messageIds },
          ...(serverId && { serverId }),
        },
        include: {
          server: {
            select: {
              id: true,
              discordId: true,
              name: true,
            },
          },
          communityNotes: {
            where: { isVisible: true },
            select: { id: true },
          },
        },
      });

      // Combine aggregation data with message data
      return aggregations
        .map(agg => {
          const message = messages.find(msg => msg.id === agg.messageId);
          if (!message) return null;

          return {
            ...agg,
            message,
            hasVisibleNotes: message.communityNotes.length > 0,
          };
        })
        .filter(Boolean);
    } catch (error) {
      logger.error('Error getting top requested messages:', error);
      throw error;
    }
  }

  async getRequestTrends(serverId?: string, days = 7): Promise<{
    date: string;
    totalRequests: number;
    uniqueMessages: number;
    thresholdMet: number;
  }[]> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const requests = await prisma.noteRequest.findMany({
        where: {
          timestamp: { gte: since },
          isActive: true,
          ...(serverId && {
            message: { serverId },
          }),
        },
        include: {
          message: {
            select: {
              id: true,
              serverId: true,
            },
          },
        },
      });

      const trendsMap = new Map<string, {
        requests: number;
        messages: Set<string>;
        thresholdMet: Set<string>;
      }>();

      for (const request of requests) {
        const dateKey = request.timestamp.toISOString().split('T')[0];
        if (!trendsMap.has(dateKey)) {
          trendsMap.set(dateKey, {
            requests: 0,
            messages: new Set(),
            thresholdMet: new Set(),
          });
        }

        const dayData = trendsMap.get(dateKey)!;
        dayData.requests++;
        dayData.messages.add(request.messageId);

        // Check if this message has met threshold
        const aggregation = await this.getAggregation(request.messageId);
        if (aggregation?.thresholdMet) {
          dayData.thresholdMet.add(request.messageId);
        }
      }

      return Array.from(trendsMap.entries()).map(([date, data]) => ({
        date,
        totalRequests: data.requests,
        uniqueMessages: data.messages.size,
        thresholdMet: data.thresholdMet.size,
      })).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      logger.error('Error getting request trends:', error);
      throw error;
    }
  }

  async cleanupExpiredRequests(): Promise<number> {
    try {
      const expiredThreshold = new Date(Date.now() - appConfig.REQUEST_TIMEOUT_HOURS * 60 * 60 * 1000);

      // Deactivate expired requests
      const result = await prisma.noteRequest.updateMany({
        where: {
          timestamp: { lt: expiredThreshold },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      // Update aggregations for affected messages
      const expiredRequests = await prisma.noteRequest.findMany({
        where: {
          timestamp: { lt: expiredThreshold },
          isActive: false,
        },
        select: { messageId: true },
        distinct: ['messageId'],
      });

      for (const request of expiredRequests) {
        await this.updateAggregation(request.messageId);
      }

      logger.info(`Cleaned up ${result.count} expired note requests`);
      return result.count;
    } catch (error) {
      logger.error('Error cleaning up expired requests:', error);
      throw error;
    }
  }

  async getAggregationStats(): Promise<{
    totalMessages: number;
    messagesWithRequests: number;
    messagesAboveThreshold: number;
    averageRequestsPerMessage: number;
    averageUniqueRequestors: number;
  }> {
    try {
      const aggregations = await prisma.requestAggregation.findMany({
        where: {
          totalRequests: { gt: 0 },
        },
      });

      const totalMessages = await prisma.message.count();
      const messagesWithRequests = aggregations.length;
      const messagesAboveThreshold = aggregations.filter(agg => agg.thresholdMet).length;

      const totalRequests = aggregations.reduce((sum, agg) => sum + agg.totalRequests, 0);
      const totalUniqueRequestors = aggregations.reduce((sum, agg) => sum + agg.uniqueRequestors, 0);

      const averageRequestsPerMessage = messagesWithRequests > 0 ? totalRequests / messagesWithRequests : 0;
      const averageUniqueRequestors = messagesWithRequests > 0 ? totalUniqueRequestors / messagesWithRequests : 0;

      return {
        totalMessages,
        messagesWithRequests,
        messagesAboveThreshold,
        averageRequestsPerMessage,
        averageUniqueRequestors,
      };
    } catch (error) {
      logger.error('Error getting aggregation stats:', error);
      throw error;
    }
  }
}