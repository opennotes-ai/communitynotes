import { redis } from './redis.js';
import { logger } from '../shared/utils/logger.js';
export class CacheService {
    static TTL = {
        SHORT: 300, // 5 minutes
        MEDIUM: 1800, // 30 minutes
        LONG: 3600, // 1 hour
        DAILY: 86400, // 24 hours
    };
    static KEYS = {
        USER_PROFILE: (userId) => `user:profile:${userId}`,
        USER_STATS: (userId) => `user:stats:${userId}`,
        USER_RATE_LIMITS: (userId) => `user:limits:${userId}`,
        MESSAGE_REQUESTS: (messageId) => `message:requests:${messageId}`,
        MESSAGE_NOTES: (messageId) => `message:notes:${messageId}`,
        MESSAGE_STATS: (messageId) => `message:stats:${messageId}`,
        SERVER_CONFIG: (serverId) => `server:config:${serverId}`,
        SERVER_CONTRIBUTORS: (serverId) => `server:contributors:${serverId}`,
        NOTE_RATINGS: (noteId) => `note:ratings:${noteId}`,
        REQUEST_AGGREGATION: (messageId) => `aggregation:${messageId}`,
        TOP_CONTRIBUTORS: 'leaderboard:contributors',
        TRENDING_REQUESTS: (serverId) => serverId ? `trending:requests:${serverId}` : 'trending:requests:global',
    };
    // User caching
    async cacheUserProfile(userId, profile) {
        try {
            const key = CacheService.KEYS.USER_PROFILE(userId);
            await redis.set(key, profile, CacheService.TTL.MEDIUM);
        }
        catch (error) {
            logger.error('Error caching user profile:', error);
        }
    }
    async getUserProfile(userId) {
        try {
            const key = CacheService.KEYS.USER_PROFILE(userId);
            return await redis.get(key);
        }
        catch (error) {
            logger.error('Error getting cached user profile:', error);
            return null;
        }
    }
    async cacheUserStats(userId, stats) {
        try {
            const key = CacheService.KEYS.USER_STATS(userId);
            await redis.set(key, stats, CacheService.TTL.SHORT);
        }
        catch (error) {
            logger.error('Error caching user stats:', error);
        }
    }
    async getUserStats(userId) {
        try {
            const key = CacheService.KEYS.USER_STATS(userId);
            return await redis.get(key);
        }
        catch (error) {
            logger.error('Error getting cached user stats:', error);
            return null;
        }
    }
    async cacheUserRateLimits(userId, limits) {
        try {
            const key = CacheService.KEYS.USER_RATE_LIMITS(userId);
            await redis.set(key, limits, CacheService.TTL.SHORT);
        }
        catch (error) {
            logger.error('Error caching user rate limits:', error);
        }
    }
    async getUserRateLimits(userId) {
        try {
            const key = CacheService.KEYS.USER_RATE_LIMITS(userId);
            return await redis.get(key);
        }
        catch (error) {
            logger.error('Error getting cached user rate limits:', error);
            return null;
        }
    }
    // Message caching
    async cacheMessageRequests(messageId, requests) {
        try {
            const key = CacheService.KEYS.MESSAGE_REQUESTS(messageId);
            await redis.set(key, requests, CacheService.TTL.SHORT);
        }
        catch (error) {
            logger.error('Error caching message requests:', error);
        }
    }
    async getMessageRequests(messageId) {
        try {
            const key = CacheService.KEYS.MESSAGE_REQUESTS(messageId);
            return await redis.get(key);
        }
        catch (error) {
            logger.error('Error getting cached message requests:', error);
            return null;
        }
    }
    async cacheMessageNotes(messageId, notes) {
        try {
            const key = CacheService.KEYS.MESSAGE_NOTES(messageId);
            await redis.set(key, notes, CacheService.TTL.SHORT);
        }
        catch (error) {
            logger.error('Error caching message notes:', error);
        }
    }
    async getMessageNotes(messageId) {
        try {
            const key = CacheService.KEYS.MESSAGE_NOTES(messageId);
            return await redis.get(key);
        }
        catch (error) {
            logger.error('Error getting cached message notes:', error);
            return null;
        }
    }
    async cacheMessageStats(messageId, stats) {
        try {
            const key = CacheService.KEYS.MESSAGE_STATS(messageId);
            await redis.set(key, stats, CacheService.TTL.SHORT);
        }
        catch (error) {
            logger.error('Error caching message stats:', error);
        }
    }
    async getMessageStats(messageId) {
        try {
            const key = CacheService.KEYS.MESSAGE_STATS(messageId);
            return await redis.get(key);
        }
        catch (error) {
            logger.error('Error getting cached message stats:', error);
            return null;
        }
    }
    // Server caching
    async cacheServerConfig(serverId, config) {
        try {
            const key = CacheService.KEYS.SERVER_CONFIG(serverId);
            await redis.set(key, config, CacheService.TTL.LONG);
        }
        catch (error) {
            logger.error('Error caching server config:', error);
        }
    }
    async getServerConfig(serverId) {
        try {
            const key = CacheService.KEYS.SERVER_CONFIG(serverId);
            return await redis.get(key);
        }
        catch (error) {
            logger.error('Error getting cached server config:', error);
            return null;
        }
    }
    async cacheServerContributors(serverId, contributors) {
        try {
            const key = CacheService.KEYS.SERVER_CONTRIBUTORS(serverId);
            await redis.set(key, contributors, CacheService.TTL.MEDIUM);
        }
        catch (error) {
            logger.error('Error caching server contributors:', error);
        }
    }
    async getServerContributors(serverId) {
        try {
            const key = CacheService.KEYS.SERVER_CONTRIBUTORS(serverId);
            return await redis.get(key);
        }
        catch (error) {
            logger.error('Error getting cached server contributors:', error);
            return null;
        }
    }
    // Note caching
    async cacheNoteRatings(noteId, ratings) {
        try {
            const key = CacheService.KEYS.NOTE_RATINGS(noteId);
            await redis.set(key, ratings, CacheService.TTL.SHORT);
        }
        catch (error) {
            logger.error('Error caching note ratings:', error);
        }
    }
    async getNoteRatings(noteId) {
        try {
            const key = CacheService.KEYS.NOTE_RATINGS(noteId);
            return await redis.get(key);
        }
        catch (error) {
            logger.error('Error getting cached note ratings:', error);
            return null;
        }
    }
    // Aggregation caching
    async cacheRequestAggregation(messageId, aggregation) {
        try {
            const key = CacheService.KEYS.REQUEST_AGGREGATION(messageId);
            await redis.set(key, aggregation, CacheService.TTL.SHORT);
        }
        catch (error) {
            logger.error('Error caching request aggregation:', error);
        }
    }
    async getRequestAggregation(messageId) {
        try {
            const key = CacheService.KEYS.REQUEST_AGGREGATION(messageId);
            return await redis.get(key);
        }
        catch (error) {
            logger.error('Error getting cached request aggregation:', error);
            return null;
        }
    }
    // Leaderboards and trending
    async cacheTopContributors(contributors) {
        try {
            const key = CacheService.KEYS.TOP_CONTRIBUTORS;
            await redis.set(key, contributors, CacheService.TTL.LONG);
        }
        catch (error) {
            logger.error('Error caching top contributors:', error);
        }
    }
    async getTopContributors() {
        try {
            const key = CacheService.KEYS.TOP_CONTRIBUTORS;
            return await redis.get(key);
        }
        catch (error) {
            logger.error('Error getting cached top contributors:', error);
            return null;
        }
    }
    async cacheTrendingRequests(requests, serverId) {
        try {
            const key = CacheService.KEYS.TRENDING_REQUESTS(serverId);
            await redis.set(key, requests, CacheService.TTL.MEDIUM);
        }
        catch (error) {
            logger.error('Error caching trending requests:', error);
        }
    }
    async getTrendingRequests(serverId) {
        try {
            const key = CacheService.KEYS.TRENDING_REQUESTS(serverId);
            return await redis.get(key);
        }
        catch (error) {
            logger.error('Error getting cached trending requests:', error);
            return null;
        }
    }
    // Cache invalidation
    async invalidateUserCache(userId) {
        try {
            const keys = [
                CacheService.KEYS.USER_PROFILE(userId),
                CacheService.KEYS.USER_STATS(userId),
                CacheService.KEYS.USER_RATE_LIMITS(userId),
            ];
            await Promise.all(keys.map(key => redis.del(key)));
        }
        catch (error) {
            logger.error('Error invalidating user cache:', error);
        }
    }
    async invalidateMessageCache(messageId) {
        try {
            const keys = [
                CacheService.KEYS.MESSAGE_REQUESTS(messageId),
                CacheService.KEYS.MESSAGE_NOTES(messageId),
                CacheService.KEYS.MESSAGE_STATS(messageId),
                CacheService.KEYS.REQUEST_AGGREGATION(messageId),
            ];
            await Promise.all(keys.map(key => redis.del(key)));
        }
        catch (error) {
            logger.error('Error invalidating message cache:', error);
        }
    }
    async invalidateServerCache(serverId) {
        try {
            const keys = [
                CacheService.KEYS.SERVER_CONFIG(serverId),
                CacheService.KEYS.SERVER_CONTRIBUTORS(serverId),
                CacheService.KEYS.TRENDING_REQUESTS(serverId),
            ];
            await Promise.all(keys.map(key => redis.del(key)));
        }
        catch (error) {
            logger.error('Error invalidating server cache:', error);
        }
    }
    async invalidateNoteCache(noteId) {
        try {
            const key = CacheService.KEYS.NOTE_RATINGS(noteId);
            await redis.del(key);
        }
        catch (error) {
            logger.error('Error invalidating note cache:', error);
        }
    }
    async invalidateGlobalCache() {
        try {
            const keys = [
                CacheService.KEYS.TOP_CONTRIBUTORS,
                CacheService.KEYS.TRENDING_REQUESTS(),
            ];
            await Promise.all(keys.map(key => redis.del(key)));
        }
        catch (error) {
            logger.error('Error invalidating global cache:', error);
        }
    }
    // Rate limiting with Redis
    async checkRateLimit(key, limit, windowSeconds) {
        try {
            if (!redis.isReady()) {
                return { allowed: true, remaining: limit - 1, resetTime: Date.now() + windowSeconds * 1000 };
            }
            const now = Date.now();
            const windowStart = now - windowSeconds * 1000;
            // Clean old entries and count current requests
            const current = await redis.incr(key);
            if (current === 1) {
                await redis.expire(key, windowSeconds);
            }
            const allowed = (current || 0) <= limit;
            const remaining = Math.max(0, limit - (current || 0));
            const resetTime = now + windowSeconds * 1000;
            return { allowed, remaining, resetTime };
        }
        catch (error) {
            logger.error('Error checking rate limit:', error);
            return { allowed: true, remaining: limit - 1, resetTime: Date.now() + windowSeconds * 1000 };
        }
    }
    // Utility methods
    async clearAllCaches() {
        try {
            if (!redis.isReady()) {
                return;
            }
            await redis.flushAll();
            logger.info('All caches cleared');
        }
        catch (error) {
            logger.error('Error clearing all caches:', error);
        }
    }
    async getCacheInfo() {
        try {
            if (!redis.isReady()) {
                return { connected: false, keyCount: 0, memory: '0B' };
            }
            const keys = await redis.keys('*');
            return {
                connected: true,
                keyCount: keys.length,
                memory: 'N/A', // Redis doesn't expose memory usage easily
            };
        }
        catch (error) {
            logger.error('Error getting cache info:', error);
            return { connected: false, keyCount: 0, memory: '0B' };
        }
    }
}
export const cacheService = new CacheService();
export default cacheService;
//# sourceMappingURL=cacheService.js.map