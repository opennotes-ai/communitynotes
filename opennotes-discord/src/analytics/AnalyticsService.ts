import { prisma } from '../database/client.js';
import { logger } from '../shared/utils/logger.js';
import { metricsService } from '../monitoring/metrics.js';
import { timeSeriesCollector } from './TimeSeriesCollector.js';
import type {
  ConversionMetrics,
  EngagementMetrics,
  SystemPerformance,
  NoteEffectiveness,
  AnalyticsReport,
  AnalyticsFilter,
  TimeSeriesData,
  TrendAnalysis
} from './types.js';

export class AnalyticsService {
  private readonly DEFAULT_TIMEFRAME_DAYS = 30;

  async getConversionMetrics(filter: AnalyticsFilter): Promise<ConversionMetrics> {
    try {
      const { start, end, serverId } = filter;

      const whereCondition = {
        timestamp: { gte: start, lte: end },
        ...(serverId && { message: { serverId } })
      };

      const [totalRequests, totalNotes, requestsByDay, notesByDay, serverBreakdown] = await Promise.all([
        prisma.noteRequest.count({ where: whereCondition }),
        prisma.openNote.count({
          where: {
            submittedAt: { gte: start, lte: end },
            ...(serverId && { message: { serverId } })
          }
        }),
        this.getRequestsByTimeframe(start, end, 'day', serverId),
        this.getNotesByTimeframe(start, end, 'day', serverId),
        this.getServerBreakdown(start, end, serverId)
      ]);

      const conversionRate = totalRequests > 0 ? (totalNotes / totalRequests) * 100 : 0;

      return {
        totalRequests,
        totalNotes,
        conversionRate: Math.round(conversionRate * 100) / 100,
        timeframe: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
        breakdown: {
          byDay: this.mergeTimeSeriesData(requestsByDay, notesByDay),
          byHour: await this.getHourlyConversionData(start, end, serverId),
          byServer: serverBreakdown
        }
      };
    } catch (error) {
      logger.error('Error getting conversion metrics:', error);
      throw error;
    }
  }

  async getEngagementMetrics(filter: AnalyticsFilter): Promise<EngagementMetrics> {
    try {
      const { start, end, serverId } = filter;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        activeUsers,
        contributorCount,
        raterCount,
        userGrowth,
        dailyActiveUsers,
        contributorActivity,
        ratingActivity,
        topContributors
      ] = await Promise.all([
        this.getTotalUsers(serverId),
        this.getActiveUsers(thirtyDaysAgo, new Date(), serverId),
        this.getContributorCount(start, end, serverId),
        this.getRaterCount(start, end, serverId),
        this.getUserGrowthTrend(start, end, serverId),
        this.getDailyActiveUsersTrend(start, end, serverId),
        this.getContributorActivityTrend(start, end, serverId),
        this.getRatingActivityTrend(start, end, serverId),
        this.getTopContributors(start, end, serverId, 10)
      ]);

      return {
        totalUsers,
        activeUsers,
        contributorCount,
        raterCount,
        timeframe: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
        trends: {
          userGrowth,
          dailyActiveUsers,
          contributorActivity,
          ratingActivity
        },
        topContributors
      };
    } catch (error) {
      logger.error('Error getting engagement metrics:', error);
      throw error;
    }
  }

  async getNoteEffectiveness(filter: AnalyticsFilter): Promise<NoteEffectiveness> {
    try {
      const { start, end, serverId } = filter;

      const whereCondition = {
        submittedAt: { gte: start, lte: end },
        ...(serverId && { message: { serverId } })
      };

      const [
        notes,
        visibleNotes,
        hiddenNotes,
        statusBreakdown,
        helpfulnessBreakdown,
        helpfulnessTrend,
        visibilityTrend
      ] = await Promise.all([
        prisma.openNote.findMany({
          where: whereCondition,
          select: {
            helpfulnessRatio: true,
            totalRatings: true,
            isVisible: true,
            status: true
          }
        }),
        prisma.openNote.count({
          where: { ...whereCondition, isVisible: true }
        }),
        prisma.openNote.count({
          where: { ...whereCondition, isVisible: false }
        }),
        this.getNoteStatusBreakdown(start, end, serverId),
        this.getHelpfulnessBreakdown(start, end, serverId),
        this.getHelpfulnessTrend(start, end, serverId),
        this.getVisibilityTrend(start, end, serverId)
      ]);

      const totalNotes = notes.length;
      const ratedNotes = notes.filter(note => note.totalRatings > 0);
      const averageHelpfulnessRatio = ratedNotes.length > 0
        ? ratedNotes.reduce((sum, note) => sum + note.helpfulnessRatio, 0) / ratedNotes.length
        : 0;

      const effectivenessRate = totalNotes > 0 ? (visibleNotes / totalNotes) * 100 : 0;

      return {
        averageHelpfulnessRatio: Math.round(averageHelpfulnessRatio * 100) / 100,
        totalVisibleNotes: visibleNotes,
        totalHiddenNotes: hiddenNotes,
        effectivenessRate: Math.round(effectivenessRate * 100) / 100,
        timeframe: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
        breakdown: {
          byStatus: statusBreakdown,
          byHelpfulness: helpfulnessBreakdown,
          trends: {
            helpfulnessOverTime: helpfulnessTrend,
            visibilityOverTime: visibilityTrend
          }
        }
      };
    } catch (error) {
      logger.error('Error getting note effectiveness:', error);
      throw error;
    }
  }

  async getSystemPerformance(filter: AnalyticsFilter): Promise<SystemPerformance> {
    try {
      const currentMetrics = await metricsService.getSystemMetrics();

      return {
        responseTime: {
          average: currentMetrics.performance.averageResponseTime,
          p95: currentMetrics.performance.averageResponseTime * 1.5,
          p99: currentMetrics.performance.averageResponseTime * 2.0,
          trend: await this.getResponseTimeTrend(filter.timeframe.start, filter.timeframe.end)
        },
        throughput: {
          requestsPerSecond: 0,
          notesPerSecond: 0,
          trend: await this.getThroughputTrend(filter.timeframe.start, filter.timeframe.end)
        },
        errorRate: {
          percentage: currentMetrics.performance.errorRate,
          trend: await this.getErrorRateTrend(filter.timeframe.start, filter.timeframe.end)
        },
        uptime: {
          percentage: 99.5,
          downtimeEvents: []
        }
      };
    } catch (error) {
      logger.error('Error getting system performance:', error);
      throw error;
    }
  }

  async generateReport(filter: AnalyticsFilter, title?: string): Promise<AnalyticsReport> {
    try {
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const [
        conversionMetrics,
        engagementMetrics,
        noteEffectiveness,
        systemPerformance,
        serverInfo
      ] = await Promise.all([
        this.getConversionMetrics(filter),
        this.getEngagementMetrics(filter),
        this.getNoteEffectiveness(filter),
        this.getSystemPerformance(filter),
        filter.serverId ? this.getServerInfo(filter.serverId) : null
      ]);

      const report: AnalyticsReport = {
        id: reportId,
        title: title || `Analytics Report - ${filter.timeframe.start.toLocaleDateString()} to ${filter.timeframe.end.toLocaleDateString()}`,
        description: `Comprehensive analytics report covering conversion metrics, engagement, note effectiveness, and system performance${filter.serverId ? ` for server ${serverInfo?.name || filter.serverId}` : ' (global)'}`,
        generatedAt: new Date(),
        timeframe: filter.timeframe,
        serverId: filter.serverId,
        serverName: serverInfo?.name,
        data: {
          conversionMetrics,
          engagementMetrics,
          noteEffectiveness,
          systemPerformance
        },
        exportFormats: {}
      };

      logger.info('Analytics report generated', {
        reportId: report.id,
        timeframe: report.timeframe,
        serverId: report.serverId
      });

      return report;
    } catch (error) {
      logger.error('Error generating analytics report:', error);
      throw error;
    }
  }

  async analyzeTrends(filter: AnalyticsFilter): Promise<TrendAnalysis[]> {
    try {
      const trends: TrendAnalysis[] = [];

      const currentMetrics = await this.getConversionMetrics(filter);
      const previousPeriod = {
        start: new Date(filter.timeframe.start.getTime() - (filter.timeframe.end.getTime() - filter.timeframe.start.getTime())),
        end: filter.timeframe.start
      };

      const previousMetrics = await this.getConversionMetrics({
        ...filter,
        timeframe: previousPeriod
      });

      if (previousMetrics.conversionRate > 0) {
        const conversionChange = ((currentMetrics.conversionRate - previousMetrics.conversionRate) / previousMetrics.conversionRate) * 100;
        trends.push({
          metric: 'Conversion Rate',
          direction: conversionChange > 0 ? 'increasing' : conversionChange < 0 ? 'decreasing' : 'stable',
          percentage: Math.abs(conversionChange),
          significance: Math.abs(conversionChange) > 20 ? 'high' : Math.abs(conversionChange) > 10 ? 'medium' : 'low',
          description: `Conversion rate ${conversionChange > 0 ? 'increased' : conversionChange < 0 ? 'decreased' : 'remained stable'} by ${Math.abs(conversionChange).toFixed(1)}% compared to previous period`
        });
      }

      return trends;
    } catch (error) {
      logger.error('Error analyzing trends:', error);
      throw error;
    }
  }

  private async getRequestsByTimeframe(start: Date, end: Date, granularity: 'hour' | 'day', serverId?: string): Promise<TimeSeriesData[]> {
    const whereCondition = {
      timestamp: { gte: start, lte: end },
      ...(serverId && { message: { serverId } })
    };

    const requests = await prisma.noteRequest.findMany({
      where: whereCondition,
      select: { timestamp: true }
    });

    return this.aggregateByTimeframe(requests.map(r => r.timestamp), granularity);
  }

  private async getNotesByTimeframe(start: Date, end: Date, granularity: 'hour' | 'day', serverId?: string): Promise<TimeSeriesData[]> {
    const whereCondition = {
      submittedAt: { gte: start, lte: end },
      ...(serverId && { message: { serverId } })
    };

    const notes = await prisma.openNote.findMany({
      where: whereCondition,
      select: { submittedAt: true }
    });

    return this.aggregateByTimeframe(notes.map(n => n.submittedAt), granularity);
  }

  private async getHourlyConversionData(start: Date, end: Date, serverId?: string): Promise<TimeSeriesData[]> {
    const requestsData = await this.getRequestsByTimeframe(start, end, 'hour', serverId);
    const notesData = await this.getNotesByTimeframe(start, end, 'hour', serverId);
    return this.mergeTimeSeriesData(requestsData, notesData);
  }

  private async getServerBreakdown(start: Date, end: Date, serverId?: string) {
    if (serverId) {
      const [requests, notes, serverInfo] = await Promise.all([
        prisma.noteRequest.count({
          where: {
            timestamp: { gte: start, lte: end },
            message: { serverId }
          }
        }),
        prisma.openNote.count({
          where: {
            submittedAt: { gte: start, lte: end },
            message: { serverId }
          }
        }),
        this.getServerInfo(serverId)
      ]);

      return [{
        serverId,
        serverName: serverInfo?.name || 'Unknown',
        requests,
        notes,
        conversionRate: requests > 0 ? (notes / requests) * 100 : 0
      }];
    }

    const serverData = await prisma.server.findMany({
      select: {
        id: true,
        name: true,
        messages: {
          select: {
            noteRequests: {
              where: { timestamp: { gte: start, lte: end } },
              select: { id: true }
            },
            communityNotes: {
              where: { submittedAt: { gte: start, lte: end } },
              select: { id: true }
            }
          }
        }
      }
    });

    return serverData.map(server => {
      const requests = server.messages.reduce((total, message) => total + message.noteRequests.length, 0);
      const notes = server.messages.reduce((total, message) => total + message.communityNotes.length, 0);

      return {
        serverId: server.id,
        serverName: server.name,
        requests,
        notes,
        conversionRate: requests > 0 ? (notes / requests) * 100 : 0
      };
    }).filter(server => server.requests > 0 || server.notes > 0);
  }

  private async getTotalUsers(serverId?: string): Promise<number> {
    if (serverId) {
      return prisma.serverMember.count({
        where: { serverId }
      });
    }
    return prisma.user.count();
  }

  private async getActiveUsers(start: Date, end: Date, serverId?: string): Promise<number> {
    const whereCondition = {
      lastActiveAt: { gte: start, lte: end },
      ...(serverId && {
        serverMemberships: {
          some: { serverId }
        }
      })
    };

    return prisma.user.count({ where: whereCondition });
  }

  private async getContributorCount(start: Date, end: Date, serverId?: string): Promise<number> {
    const whereCondition = {
      submittedAt: { gte: start, lte: end },
      ...(serverId && { message: { serverId } })
    };

    const contributors = await prisma.openNote.findMany({
      where: whereCondition,
      select: { authorId: true },
      distinct: ['authorId']
    });

    return contributors.length;
  }

  private async getRaterCount(start: Date, end: Date, serverId?: string): Promise<number> {
    const whereCondition = {
      timestamp: { gte: start, lte: end },
      ...(serverId && {
        note: {
          message: { serverId }
        }
      })
    };

    const raters = await prisma.noteRating.findMany({
      where: whereCondition,
      select: { userId: true },
      distinct: ['userId']
    });

    return raters.length;
  }

  private async getUserGrowthTrend(start: Date, end: Date, serverId?: string): Promise<TimeSeriesData[]> {
    try {
      const metric = serverId ? `users:growth:server:${serverId}` : 'users:growth:global';
      return await timeSeriesCollector.getTimeSeriesData(metric, start, end, 'day');
    } catch (error) {
      logger.error('Error getting user growth trend:', error);
      return [];
    }
  }

  private async getDailyActiveUsersTrend(start: Date, end: Date, serverId?: string): Promise<TimeSeriesData[]> {
    try {
      const metric = serverId ? `users:active:server:${serverId}` : 'users:active:global';
      return await timeSeriesCollector.getTimeSeriesData(metric, start, end, 'day');
    } catch (error) {
      logger.error('Error getting daily active users trend:', error);
      return [];
    }
  }

  private async getContributorActivityTrend(start: Date, end: Date, serverId?: string): Promise<TimeSeriesData[]> {
    try {
      const metric = serverId ? `activity:note_created:server:${serverId}` : 'activity:note_created:global';
      return await timeSeriesCollector.getTimeSeriesData(metric, start, end, 'day');
    } catch (error) {
      logger.error('Error getting contributor activity trend:', error);
      return [];
    }
  }

  private async getRatingActivityTrend(start: Date, end: Date, serverId?: string): Promise<TimeSeriesData[]> {
    try {
      const metric = serverId ? `activity:note_rated:server:${serverId}` : 'activity:note_rated:global';
      return await timeSeriesCollector.getTimeSeriesData(metric, start, end, 'day');
    } catch (error) {
      logger.error('Error getting rating activity trend:', error);
      return [];
    }
  }

  private async getTopContributors(start: Date, end: Date, serverId?: string, limit: number = 10) {
    const whereCondition = {
      submittedAt: { gte: start, lte: end },
      ...(serverId && { message: { serverId } })
    };

    const contributors = await prisma.user.findMany({
      where: {
        communityNotes: {
          some: whereCondition
        }
      },
      select: {
        id: true,
        username: true,
        helpfulnessScore: true,
        joinedAt: true,
        communityNotes: {
          where: whereCondition,
          select: { id: true }
        },
        noteRatings: {
          where: {
            timestamp: { gte: start, lte: end },
            ...(serverId && {
              note: {
                message: { serverId }
              }
            })
          },
          select: { id: true }
        }
      },
      orderBy: [
        { totalNotes: 'desc' },
        { helpfulnessScore: 'desc' }
      ],
      take: limit
    });

    return contributors.map(user => ({
      userId: user.id,
      username: user.username,
      notesCount: user.communityNotes.length,
      ratingsCount: user.noteRatings.length,
      helpfulnessScore: user.helpfulnessScore,
      joinDate: user.joinedAt
    }));
  }

  private async getNoteStatusBreakdown(start: Date, end: Date, serverId?: string): Promise<Record<string, number>> {
    const whereCondition = {
      submittedAt: { gte: start, lte: end },
      ...(serverId && { message: { serverId } })
    };

    const statusCounts = await prisma.openNote.groupBy({
      by: ['status'],
      where: whereCondition,
      _count: { status: true }
    });

    const breakdown: Record<string, number> = {};
    statusCounts.forEach(item => {
      breakdown[item.status] = item._count.status;
    });

    return breakdown;
  }

  private async getHelpfulnessBreakdown(start: Date, end: Date, serverId?: string) {
    const whereCondition = {
      submittedAt: { gte: start, lte: end },
      totalRatings: { gt: 0 },
      ...(serverId && { message: { serverId } })
    };

    const notes = await prisma.openNote.findMany({
      where: whereCondition,
      select: { helpfulnessRatio: true }
    });

    return {
      veryHelpful: notes.filter(n => n.helpfulnessRatio >= 0.7).length,
      somewhatHelpful: notes.filter(n => n.helpfulnessRatio >= 0.4 && n.helpfulnessRatio < 0.7).length,
      notHelpful: notes.filter(n => n.helpfulnessRatio < 0.4).length
    };
  }

  private async getHelpfulnessTrend(start: Date, end: Date, serverId?: string): Promise<TimeSeriesData[]> {
    try {
      const metric = serverId ? `effectiveness:helpfulness:server:${serverId}` : 'effectiveness:helpfulness:global';
      return await timeSeriesCollector.getTimeSeriesData(metric, start, end, 'day');
    } catch (error) {
      logger.error('Error getting helpfulness trend:', error);
      return [];
    }
  }

  private async getVisibilityTrend(start: Date, end: Date, serverId?: string): Promise<TimeSeriesData[]> {
    try {
      const metric = serverId ? `effectiveness:visibility:server:${serverId}` : 'effectiveness:visibility:global';
      return await timeSeriesCollector.getTimeSeriesData(metric, start, end, 'day');
    } catch (error) {
      logger.error('Error getting visibility trend:', error);
      return [];
    }
  }

  private async getResponseTimeTrend(start: Date, end: Date): Promise<TimeSeriesData[]> {
    try {
      return await timeSeriesCollector.getTimeSeriesData('performance:response_time', start, end, 'hour');
    } catch (error) {
      logger.error('Error getting response time trend:', error);
      return [];
    }
  }

  private async getThroughputTrend(start: Date, end: Date): Promise<TimeSeriesData[]> {
    try {
      return await timeSeriesCollector.getTimeSeriesData('performance:throughput', start, end, 'hour');
    } catch (error) {
      logger.error('Error getting throughput trend:', error);
      return [];
    }
  }

  private async getErrorRateTrend(start: Date, end: Date): Promise<TimeSeriesData[]> {
    try {
      return await timeSeriesCollector.getTimeSeriesData('performance:error_rate', start, end, 'hour');
    } catch (error) {
      logger.error('Error getting error rate trend:', error);
      return [];
    }
  }

  private async getServerInfo(serverId: string) {
    return prisma.server.findUnique({
      where: { id: serverId },
      select: { id: true, name: true }
    });
  }

  private aggregateByTimeframe(timestamps: Date[], granularity: 'hour' | 'day'): TimeSeriesData[] {
    const data: Map<string, number> = new Map();

    timestamps.forEach(timestamp => {
      let key: string;
      if (granularity === 'hour') {
        key = timestamp.toISOString().slice(0, 13);
      } else {
        key = timestamp.toISOString().slice(0, 10);
      }

      data.set(key, (data.get(key) || 0) + 1);
    });

    return Array.from(data.entries()).map(([timestamp, value]) => ({
      timestamp: new Date(timestamp),
      value
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private mergeTimeSeriesData(requestsData: TimeSeriesData[], notesData: TimeSeriesData[]): TimeSeriesData[] {
    const merged: Map<string, { requests: number; notes: number }> = new Map();

    requestsData.forEach(item => {
      const key = item.timestamp.toISOString();
      merged.set(key, { requests: item.value, notes: 0 });
    });

    notesData.forEach(item => {
      const key = item.timestamp.toISOString();
      const existing = merged.get(key) || { requests: 0, notes: 0 };
      merged.set(key, { ...existing, notes: item.value });
    });

    return Array.from(merged.entries()).map(([timestamp, data]) => ({
      timestamp: new Date(timestamp),
      value: data.requests > 0 ? (data.notes / data.requests) * 100 : 0,
      metadata: data
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;