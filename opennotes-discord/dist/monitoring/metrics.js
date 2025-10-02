import { prisma } from '../database/client.js';
import { logger } from '../shared/utils/logger.js';
export class MetricsService {
    performanceData = {
        responseTimes: [],
        slowQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
        errors: 0,
        requests: 0,
    };
    async getSystemMetrics() {
        try {
            const [database, noteRequests, communityNotes, users, performance] = await Promise.all([
                this.getDatabaseMetrics(),
                this.getRequestMetrics(),
                this.getNoteMetrics(),
                this.getUserMetrics(),
                this.getPerformanceMetrics(),
            ]);
            return {
                database,
                noteRequests,
                communityNotes,
                users,
                performance,
            };
        }
        catch (error) {
            logger.error('Error getting system metrics:', error);
            throw error;
        }
    }
    async getDatabaseMetrics() {
        try {
            const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const [totalUsers, totalServers, totalMessages, totalRequests, totalNotes, totalRatings, activeRequestsLast24h, newNotesLast24h,] = await Promise.all([
                prisma.user.count(),
                prisma.server.count(),
                prisma.message.count(),
                prisma.noteRequest.count(),
                prisma.openNote.count(),
                prisma.noteRating.count(),
                prisma.noteRequest.count({
                    where: {
                        timestamp: { gte: last24h },
                        isActive: true,
                    },
                }),
                prisma.openNote.count({
                    where: {
                        submittedAt: { gte: last24h },
                    },
                }),
            ]);
            return {
                totalUsers,
                totalServers,
                totalMessages,
                totalRequests,
                totalNotes,
                totalRatings,
                activeRequestsLast24h,
                newNotesLast24h,
            };
        }
        catch (error) {
            logger.error('Error getting database metrics:', error);
            throw error;
        }
    }
    async getRequestMetrics() {
        try {
            const [pendingRequests, requestsAboveThreshold, messagesWithRequests] = await Promise.all([
                prisma.noteRequest.count({
                    where: { isActive: true },
                }),
                prisma.requestAggregation.count({
                    where: { thresholdMet: true },
                }),
                prisma.requestAggregation.findMany({
                    where: { totalRequests: { gt: 0 } },
                    select: { totalRequests: true },
                }),
            ]);
            const totalRequests = messagesWithRequests.reduce((sum, msg) => sum + msg.totalRequests, 0);
            const averageRequestsPerMessage = messagesWithRequests.length > 0
                ? totalRequests / messagesWithRequests.length
                : 0;
            // @ts-ignore - Complex Prisma include type issue
            const topRequestedMessages = await prisma.requestAggregation.findMany({
                where: { totalRequests: { gt: 0 } },
                include: {
                    message: {
                        select: {
                            serverId: true,
                        },
                    },
                },
                orderBy: { totalRequests: 'desc' },
                take: 10,
            });
            return {
                pendingRequests,
                requestsAboveThreshold,
                averageRequestsPerMessage: Math.round(averageRequestsPerMessage * 100) / 100,
                topRequestedMessages: topRequestedMessages.map(agg => ({
                    messageId: agg.messageId,
                    requestCount: agg.totalRequests,
                    serverId: agg.message?.serverId || 'unknown',
                })),
            };
        }
        catch (error) {
            logger.error('Error getting request metrics:', error);
            throw error;
        }
    }
    async getNoteMetrics() {
        try {
            const [pendingNotes, visibleNotes, notesByStatus, noteHelpfulness] = await Promise.all([
                prisma.openNote.count({
                    where: { status: 'pending' },
                }),
                prisma.openNote.count({
                    where: { isVisible: true },
                }),
                prisma.openNote.groupBy({
                    by: ['status'],
                    _count: { status: true },
                }),
                prisma.openNote.aggregate({
                    _avg: { helpfulnessRatio: true },
                    where: { totalRatings: { gt: 0 } },
                }),
            ]);
            const statusCounts = {};
            notesByStatus.forEach(group => {
                statusCounts[group.status] = group._count.status;
            });
            const topContributors = await prisma.user.findMany({
                where: { totalNotes: { gt: 0 } },
                select: {
                    id: true,
                    username: true,
                    totalNotes: true,
                    helpfulnessScore: true,
                },
                orderBy: [
                    { totalNotes: 'desc' },
                    { helpfulnessScore: 'desc' },
                ],
                take: 10,
            });
            return {
                pendingNotes,
                visibleNotes,
                averageHelpfulnessRatio: Math.round((noteHelpfulness._avg.helpfulnessRatio || 0) * 100) / 100,
                notesByStatus: statusCounts,
                topContributors: topContributors.map(user => ({
                    userId: user.id,
                    username: user.username,
                    noteCount: user.totalNotes,
                    averageHelpfulness: Math.round(user.helpfulnessScore * 100) / 100,
                })),
            };
        }
        catch (error) {
            logger.error('Error getting note metrics:', error);
            throw error;
        }
    }
    async getUserMetrics() {
        try {
            const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const [totalActiveUsers, newUsersLast24h, usersByTrustLevel, averageHelpfulness,] = await Promise.all([
                prisma.user.count({
                    where: {
                        lastActiveAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Active in last 30 days
                    },
                }),
                prisma.user.count({
                    where: {
                        joinedAt: { gte: last24h },
                    },
                }),
                prisma.user.groupBy({
                    by: ['trustLevel'],
                    _count: { trustLevel: true },
                }),
                prisma.user.aggregate({
                    _avg: { helpfulnessScore: true },
                }),
            ]);
            const trustLevelCounts = {};
            usersByTrustLevel.forEach(group => {
                trustLevelCounts[group.trustLevel] = group._count.trustLevel;
            });
            return {
                totalActiveUsers,
                newUsersLast24h,
                usersByTrustLevel: trustLevelCounts,
                averageHelpfulnessScore: Math.round((averageHelpfulness._avg.helpfulnessScore || 0) * 100) / 100,
            };
        }
        catch (error) {
            logger.error('Error getting user metrics:', error);
            throw error;
        }
    }
    async getPerformanceMetrics() {
        try {
            const averageResponseTime = this.performanceData.responseTimes.length > 0
                ? this.performanceData.responseTimes.reduce((sum, time) => sum + time, 0) / this.performanceData.responseTimes.length
                : 0;
            const cacheHitRate = (this.performanceData.cacheHits + this.performanceData.cacheMisses) > 0
                ? this.performanceData.cacheHits / (this.performanceData.cacheHits + this.performanceData.cacheMisses)
                : 0;
            const errorRate = this.performanceData.requests > 0
                ? this.performanceData.errors / this.performanceData.requests
                : 0;
            return {
                averageResponseTime: Math.round(averageResponseTime * 100) / 100,
                slowQueriesCount: this.performanceData.slowQueries,
                cacheHitRate: Math.round(cacheHitRate * 100) / 100,
                errorRate: Math.round(errorRate * 100) / 100,
            };
        }
        catch (error) {
            logger.error('Error getting performance metrics:', error);
            throw error;
        }
    }
    // Performance tracking methods
    recordResponseTime(timeMs) {
        this.performanceData.responseTimes.push(timeMs);
        // Keep only last 1000 response times
        if (this.performanceData.responseTimes.length > 1000) {
            this.performanceData.responseTimes = this.performanceData.responseTimes.slice(-1000);
        }
        if (timeMs > 1000) { // Consider > 1s as slow
            this.performanceData.slowQueries++;
        }
    }
    recordCacheHit() {
        this.performanceData.cacheHits++;
    }
    recordCacheMiss() {
        this.performanceData.cacheMisses++;
    }
    recordError() {
        this.performanceData.errors++;
    }
    recordRequest() {
        this.performanceData.requests++;
    }
    resetPerformanceData() {
        this.performanceData = {
            responseTimes: [],
            slowQueries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            errors: 0,
            requests: 0,
        };
    }
    async getServerSpecificMetrics(serverId) {
        try {
            const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const [totalMessages, totalRequests, totalNotes, activeMembers, contributorActivity,] = await Promise.all([
                prisma.message.count({
                    where: { serverId },
                }),
                prisma.noteRequest.count({
                    where: {
                        message: { serverId },
                        isActive: true,
                    },
                }),
                prisma.openNote.count({
                    where: {
                        message: { serverId },
                    },
                }),
                prisma.serverMember.count({
                    where: {
                        serverId,
                        user: {
                            lastActiveAt: { gte: last30Days },
                        },
                    },
                }),
                prisma.user.findMany({
                    where: {
                        serverMemberships: {
                            some: { serverId },
                        },
                        OR: [
                            {
                                communityNotes: {
                                    some: {
                                        submittedAt: { gte: last30Days },
                                        message: { serverId },
                                    },
                                },
                            },
                            {
                                noteRatings: {
                                    some: {
                                        timestamp: { gte: last30Days },
                                        note: {
                                            message: { serverId },
                                        },
                                    },
                                },
                            },
                        ],
                    },
                    select: {
                        id: true,
                        username: true,
                        communityNotes: {
                            where: {
                                submittedAt: { gte: last30Days },
                                message: { serverId },
                            },
                            select: { id: true },
                        },
                        noteRatings: {
                            where: {
                                timestamp: { gte: last30Days },
                                note: {
                                    message: { serverId },
                                },
                            },
                            select: { id: true },
                        },
                    },
                }),
            ]);
            return {
                totalMessages,
                totalRequests,
                totalNotes,
                activeMembers,
                contributorActivity: contributorActivity.map(user => ({
                    userId: user.id,
                    username: user.username,
                    notesCreated: user.communityNotes.length,
                    ratingsGiven: user.noteRatings.length,
                })),
            };
        }
        catch (error) {
            logger.error('Error getting server-specific metrics:', error);
            throw error;
        }
    }
}
export const metricsService = new MetricsService();
export default metricsService;
//# sourceMappingURL=metrics.js.map