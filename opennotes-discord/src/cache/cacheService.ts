import { redis } from './redis.js';
import { logger } from '../shared/utils/logger.js';

export class CacheService {
  private static readonly TTL = {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    DAILY: 86400, // 24 hours
  };

  private static readonly KEYS = {
    USER_PROFILE: (userId: string) => `user:profile:${userId}`,
    USER_STATS: (userId: string) => `user:stats:${userId}`,
    USER_RATE_LIMITS: (userId: string) => `user:limits:${userId}`,
    MESSAGE_REQUESTS: (messageId: string) => `message:requests:${messageId}`,
    MESSAGE_NOTES: (messageId: string) => `message:notes:${messageId}`,
    MESSAGE_STATS: (messageId: string) => `message:stats:${messageId}`,
    SERVER_CONFIG: (serverId: string) => `server:config:${serverId}`,
    SERVER_CONTRIBUTORS: (serverId: string) => `server:contributors:${serverId}`,
    NOTE_RATINGS: (noteId: string) => `note:ratings:${noteId}`,
    REQUEST_AGGREGATION: (messageId: string) => `aggregation:${messageId}`,
    TOP_CONTRIBUTORS: 'leaderboard:contributors',
    TRENDING_REQUESTS: (serverId?: string) => serverId ? `trending:requests:${serverId}` : 'trending:requests:global',
  };

  // User caching
  async cacheUserProfile(userId: string, profile: any): Promise<void> {
    try {
      const key = CacheService.KEYS.USER_PROFILE(userId);
      await redis.set(key, profile, CacheService.TTL.MEDIUM);
    } catch (error) {
      logger.error('Error caching user profile:', error);
    }
  }

  async getUserProfile(userId: string): Promise<any | null> {
    try {
      const key = CacheService.KEYS.USER_PROFILE(userId);
      return await redis.get(key);
    } catch (error) {
      logger.error('Error getting cached user profile:', error);
      return null;
    }
  }

  async cacheUserStats(userId: string, stats: any): Promise<void> {
    try {
      const key = CacheService.KEYS.USER_STATS(userId);
      await redis.set(key, stats, CacheService.TTL.SHORT);
    } catch (error) {
      logger.error('Error caching user stats:', error);
    }
  }

  async getUserStats(userId: string): Promise<any | null> {
    try {
      const key = CacheService.KEYS.USER_STATS(userId);
      return await redis.get(key);
    } catch (error) {
      logger.error('Error getting cached user stats:', error);
      return null;
    }
  }

  async cacheUserRateLimits(userId: string, limits: any): Promise<void> {
    try {
      const key = CacheService.KEYS.USER_RATE_LIMITS(userId);
      await redis.set(key, limits, CacheService.TTL.SHORT);
    } catch (error) {
      logger.error('Error caching user rate limits:', error);
    }
  }

  async getUserRateLimits(userId: string): Promise<any | null> {
    try {
      const key = CacheService.KEYS.USER_RATE_LIMITS(userId);
      return await redis.get(key);
    } catch (error) {
      logger.error('Error getting cached user rate limits:', error);
      return null;
    }
  }

  // Message caching
  async cacheMessageRequests(messageId: string, requests: any[]): Promise<void> {
    try {
      const key = CacheService.KEYS.MESSAGE_REQUESTS(messageId);
      await redis.set(key, requests, CacheService.TTL.SHORT);
    } catch (error) {
      logger.error('Error caching message requests:', error);
    }
  }

  async getMessageRequests(messageId: string): Promise<any[] | null> {
    try {
      const key = CacheService.KEYS.MESSAGE_REQUESTS(messageId);
      return await redis.get(key);
    } catch (error) {
      logger.error('Error getting cached message requests:', error);
      return null;
    }
  }

  async cacheMessageNotes(messageId: string, notes: any[]): Promise<void> {
    try {
      const key = CacheService.KEYS.MESSAGE_NOTES(messageId);
      await redis.set(key, notes, CacheService.TTL.SHORT);
    } catch (error) {
      logger.error('Error caching message notes:', error);
    }
  }

  async getMessageNotes(messageId: string): Promise<any[] | null> {
    try {
      const key = CacheService.KEYS.MESSAGE_NOTES(messageId);
      return await redis.get(key);
    } catch (error) {
      logger.error('Error getting cached message notes:', error);
      return null;
    }
  }

  async cacheMessageStats(messageId: string, stats: any): Promise<void> {
    try {
      const key = CacheService.KEYS.MESSAGE_STATS(messageId);
      await redis.set(key, stats, CacheService.TTL.SHORT);
    } catch (error) {
      logger.error('Error caching message stats:', error);
    }
  }

  async getMessageStats(messageId: string): Promise<any | null> {
    try {
      const key = CacheService.KEYS.MESSAGE_STATS(messageId);
      return await redis.get(key);
    } catch (error) {
      logger.error('Error getting cached message stats:', error);
      return null;
    }
  }

  // Server caching
  async cacheServerConfig(serverId: string, config: any): Promise<void> {
    try {
      const key = CacheService.KEYS.SERVER_CONFIG(serverId);
      await redis.set(key, config, CacheService.TTL.LONG);
    } catch (error) {
      logger.error('Error caching server config:', error);
    }
  }

  async getServerConfig(serverId: string): Promise<any | null> {
    try {
      const key = CacheService.KEYS.SERVER_CONFIG(serverId);
      return await redis.get(key);
    } catch (error) {
      logger.error('Error getting cached server config:', error);
      return null;
    }
  }

  async cacheServerContributors(serverId: string, contributors: any[]): Promise<void> {
    try {
      const key = CacheService.KEYS.SERVER_CONTRIBUTORS(serverId);
      await redis.set(key, contributors, CacheService.TTL.MEDIUM);
    } catch (error) {
      logger.error('Error caching server contributors:', error);
    }
  }

  async getServerContributors(serverId: string): Promise<any[] | null> {
    try {
      const key = CacheService.KEYS.SERVER_CONTRIBUTORS(serverId);
      return await redis.get(key);
    } catch (error) {
      logger.error('Error getting cached server contributors:', error);
      return null;
    }
  }

  // Note caching
  async cacheNoteRatings(noteId: string, ratings: any[]): Promise<void> {
    try {
      const key = CacheService.KEYS.NOTE_RATINGS(noteId);
      await redis.set(key, ratings, CacheService.TTL.SHORT);
    } catch (error) {
      logger.error('Error caching note ratings:', error);
    }
  }

  async getNoteRatings(noteId: string): Promise<any[] | null> {
    try {
      const key = CacheService.KEYS.NOTE_RATINGS(noteId);
      return await redis.get(key);
    } catch (error) {
      logger.error('Error getting cached note ratings:', error);
      return null;
    }
  }

  // Aggregation caching
  async cacheRequestAggregation(messageId: string, aggregation: any): Promise<void> {
    try {
      const key = CacheService.KEYS.REQUEST_AGGREGATION(messageId);
      await redis.set(key, aggregation, CacheService.TTL.SHORT);
    } catch (error) {
      logger.error('Error caching request aggregation:', error);
    }
  }

  async getRequestAggregation(messageId: string): Promise<any | null> {
    try {
      const key = CacheService.KEYS.REQUEST_AGGREGATION(messageId);
      return await redis.get(key);
    } catch (error) {
      logger.error('Error getting cached request aggregation:', error);
      return null;
    }
  }

  // Leaderboards and trending
  async cacheTopContributors(contributors: any[]): Promise<void> {
    try {
      const key = CacheService.KEYS.TOP_CONTRIBUTORS;
      await redis.set(key, contributors, CacheService.TTL.LONG);
    } catch (error) {
      logger.error('Error caching top contributors:', error);
    }
  }

  async getTopContributors(): Promise<any[] | null> {
    try {
      const key = CacheService.KEYS.TOP_CONTRIBUTORS;
      return await redis.get(key);
    } catch (error) {
      logger.error('Error getting cached top contributors:', error);
      return null;
    }
  }

  async cacheTrendingRequests(requests: any[], serverId?: string): Promise<void> {
    try {
      const key = CacheService.KEYS.TRENDING_REQUESTS(serverId);
      await redis.set(key, requests, CacheService.TTL.MEDIUM);
    } catch (error) {
      logger.error('Error caching trending requests:', error);
    }
  }

  async getTrendingRequests(serverId?: string): Promise<any[] | null> {
    try {
      const key = CacheService.KEYS.TRENDING_REQUESTS(serverId);
      return await redis.get(key);
    } catch (error) {
      logger.error('Error getting cached trending requests:', error);
      return null;
    }
  }

  // Cache invalidation
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      const keys = [
        CacheService.KEYS.USER_PROFILE(userId),
        CacheService.KEYS.USER_STATS(userId),
        CacheService.KEYS.USER_RATE_LIMITS(userId),
      ];

      await Promise.all(keys.map(key => redis.del(key)));
    } catch (error) {
      logger.error('Error invalidating user cache:', error);
    }
  }

  async invalidateMessageCache(messageId: string): Promise<void> {
    try {
      const keys = [
        CacheService.KEYS.MESSAGE_REQUESTS(messageId),
        CacheService.KEYS.MESSAGE_NOTES(messageId),
        CacheService.KEYS.MESSAGE_STATS(messageId),
        CacheService.KEYS.REQUEST_AGGREGATION(messageId),
      ];

      await Promise.all(keys.map(key => redis.del(key)));
    } catch (error) {
      logger.error('Error invalidating message cache:', error);
    }
  }

  async invalidateServerCache(serverId: string): Promise<void> {
    try {
      const keys = [
        CacheService.KEYS.SERVER_CONFIG(serverId),
        CacheService.KEYS.SERVER_CONTRIBUTORS(serverId),
        CacheService.KEYS.TRENDING_REQUESTS(serverId),
      ];

      await Promise.all(keys.map(key => redis.del(key)));
    } catch (error) {
      logger.error('Error invalidating server cache:', error);
    }
  }

  async invalidateNoteCache(noteId: string): Promise<void> {
    try {
      const key = CacheService.KEYS.NOTE_RATINGS(noteId);
      await redis.del(key);
    } catch (error) {
      logger.error('Error invalidating note cache:', error);
    }
  }

  async invalidateGlobalCache(): Promise<void> {
    try {
      const keys = [
        CacheService.KEYS.TOP_CONTRIBUTORS,
        CacheService.KEYS.TRENDING_REQUESTS(),
      ];

      await Promise.all(keys.map(key => redis.del(key)));
    } catch (error) {
      logger.error('Error invalidating global cache:', error);
    }
  }

  // Rate limiting with Redis
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
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
    } catch (error) {
      logger.error('Error checking rate limit:', error);
      return { allowed: true, remaining: limit - 1, resetTime: Date.now() + windowSeconds * 1000 };
    }
  }

  // Utility methods
  async clearAllCaches(): Promise<void> {
    try {
      if (!redis.isReady()) {
        return;
      }

      await redis.flushAll();
      logger.info('All caches cleared');
    } catch (error) {
      logger.error('Error clearing all caches:', error);
    }
  }

  async getCacheInfo(): Promise<{
    connected: boolean;
    keyCount: number;
    memory: string;
  }> {
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
    } catch (error) {
      logger.error('Error getting cache info:', error);
      return { connected: false, keyCount: 0, memory: '0B' };
    }
  }
}

export const cacheService = new CacheService();
export default cacheService;