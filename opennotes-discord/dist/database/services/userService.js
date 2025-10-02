import { prisma } from '../client.js';
import { logger } from '../../shared/utils/logger.js';
export class UserService {
    async findByDiscordId(discordId) {
        try {
            return await prisma.user.findUnique({
                where: { discordId },
                include: {
                    serverMemberships: {
                        include: {
                            server: true,
                        },
                    },
                },
            });
        }
        catch (error) {
            logger.error('Error finding user by Discord ID:', error);
            throw error;
        }
    }
    async createUser(data) {
        try {
            return await prisma.user.create({
                data: {
                    discordId: data.discordId,
                    username: data.username,
                    discriminator: data.discriminator,
                    avatar: data.avatar,
                },
            });
        }
        catch (error) {
            logger.error('Error creating user:', error);
            throw error;
        }
    }
    async updateUser(discordId, data) {
        try {
            return await prisma.user.update({
                where: { discordId },
                data: {
                    ...data,
                    lastActiveAt: new Date(),
                },
            });
        }
        catch (error) {
            logger.error('Error updating user:', error);
            throw error;
        }
    }
    async updateHelpfulnessScore(userId, scoreChange) {
        try {
            return await prisma.user.update({
                where: { id: userId },
                data: {
                    helpfulnessScore: {
                        increment: scoreChange,
                    },
                },
            });
        }
        catch (error) {
            logger.error('Error updating helpfulness score:', error);
            throw error;
        }
    }
    async incrementDailyRequestCount(userId) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const user = await prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new Error('User not found');
            }
            const lastRequestDate = user.lastRequestDate ? new Date(user.lastRequestDate) : null;
            const isNewDay = !lastRequestDate || lastRequestDate < today;
            return await prisma.user.update({
                where: { id: userId },
                data: {
                    dailyRequestCount: isNewDay ? 1 : { increment: 1 },
                    lastRequestDate: new Date(),
                },
            });
        }
        catch (error) {
            logger.error('Error incrementing daily request count:', error);
            throw error;
        }
    }
    async getDailyRequestCount(userId) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    dailyRequestCount: true,
                    lastRequestDate: true,
                },
            });
            if (!user || !user.lastRequestDate) {
                return 0;
            }
            const lastRequestDate = new Date(user.lastRequestDate);
            const isToday = lastRequestDate >= today;
            return isToday ? user.dailyRequestCount : 0;
        }
        catch (error) {
            logger.error('Error getting daily request count:', error);
            throw error;
        }
    }
    async updateTrustLevel(userId, trustLevel) {
        try {
            return await prisma.user.update({
                where: { id: userId },
                data: { trustLevel },
            });
        }
        catch (error) {
            logger.error('Error updating trust level:', error);
            throw error;
        }
    }
    async getTopContributors(limit = 10) {
        try {
            return await prisma.user.findMany({
                orderBy: [
                    { helpfulnessScore: 'desc' },
                    { totalNotes: 'desc' },
                    { totalRatings: 'desc' },
                ],
                take: limit,
                where: {
                    totalNotes: { gt: 0 },
                },
            });
        }
        catch (error) {
            logger.error('Error getting top contributors:', error);
            throw error;
        }
    }
    async getUserStats(userId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    communityNotes: {
                        where: {
                            submittedAt: {
                                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                            },
                        },
                    },
                },
            });
            if (!user) {
                throw new Error('User not found');
            }
            return {
                totalNotes: user.totalNotes,
                totalRatings: user.totalRatings,
                helpfulnessScore: user.helpfulnessScore,
                trustLevel: user.trustLevel,
                recentNotes: user.communityNotes.length,
            };
        }
        catch (error) {
            logger.error('Error getting user stats:', error);
            throw error;
        }
    }
    async incrementNoteCount(userId) {
        try {
            return await prisma.user.update({
                where: { id: userId },
                data: {
                    totalNotes: { increment: 1 },
                    lastActiveAt: new Date(),
                },
            });
        }
        catch (error) {
            logger.error('Error incrementing note count:', error);
            throw error;
        }
    }
}
//# sourceMappingURL=userService.js.map