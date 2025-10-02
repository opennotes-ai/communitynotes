import { createClient } from 'redis';
import { logger } from '../shared/utils/logger.js';
import { appConfig } from '../shared/config/index.js';
class RedisManager {
    client = null;
    isConnected = false;
    async connect() {
        try {
            if (!appConfig.REDIS_URL) {
                logger.warn('Redis URL not configured, running without cache');
                return;
            }
            this.client = createClient({
                url: appConfig.REDIS_URL,
            });
            this.client.on('error', (err) => {
                logger.error('Redis Client Error:', err);
                this.isConnected = false;
            });
            this.client.on('connect', () => {
                logger.info('Redis client connected');
                this.isConnected = true;
            });
            this.client.on('disconnect', () => {
                logger.warn('Redis client disconnected');
                this.isConnected = false;
            });
            await this.client.connect();
        }
        catch (error) {
            logger.error('Failed to connect to Redis:', error);
            this.client = null;
            this.isConnected = false;
        }
    }
    async disconnect() {
        try {
            if (this.client) {
                await this.client.disconnect();
                this.client = null;
                this.isConnected = false;
                logger.info('Redis client disconnected');
            }
        }
        catch (error) {
            logger.error('Error disconnecting from Redis:', error);
        }
    }
    async get(key) {
        try {
            if (!this.client || !this.isConnected) {
                return null;
            }
            const value = await this.client.get(key);
            if (!value) {
                return null;
            }
            return JSON.parse(value);
        }
        catch (error) {
            logger.error(`Error getting key ${key} from Redis:`, error);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        try {
            if (!this.client || !this.isConnected) {
                return false;
            }
            const serialized = JSON.stringify(value);
            if (ttlSeconds) {
                await this.client.setEx(key, ttlSeconds, serialized);
            }
            else {
                await this.client.set(key, serialized);
            }
            return true;
        }
        catch (error) {
            logger.error(`Error setting key ${key} in Redis:`, error);
            return false;
        }
    }
    async del(key) {
        try {
            if (!this.client || !this.isConnected) {
                return false;
            }
            const result = await this.client.del(key);
            return result > 0;
        }
        catch (error) {
            logger.error(`Error deleting key ${key} from Redis:`, error);
            return false;
        }
    }
    async exists(key) {
        try {
            if (!this.client || !this.isConnected) {
                return false;
            }
            const result = await this.client.exists(key);
            return result > 0;
        }
        catch (error) {
            logger.error(`Error checking existence of key ${key} in Redis:`, error);
            return false;
        }
    }
    async incr(key) {
        try {
            if (!this.client || !this.isConnected) {
                return null;
            }
            return await this.client.incr(key);
        }
        catch (error) {
            logger.error(`Error incrementing key ${key} in Redis:`, error);
            return null;
        }
    }
    async expire(key, ttlSeconds) {
        try {
            if (!this.client || !this.isConnected) {
                return false;
            }
            const result = await this.client.expire(key, ttlSeconds);
            return result;
        }
        catch (error) {
            logger.error(`Error setting expiration for key ${key} in Redis:`, error);
            return false;
        }
    }
    async hget(hash, field) {
        try {
            if (!this.client || !this.isConnected) {
                return null;
            }
            return (await this.client.hGet(hash, field)) || null;
        }
        catch (error) {
            logger.error(`Error getting hash field ${hash}:${field} from Redis:`, error);
            return null;
        }
    }
    async hset(hash, field, value) {
        try {
            if (!this.client || !this.isConnected) {
                return false;
            }
            await this.client.hSet(hash, field, value);
            return true;
        }
        catch (error) {
            logger.error(`Error setting hash field ${hash}:${field} in Redis:`, error);
            return false;
        }
    }
    async hgetall(hash) {
        try {
            if (!this.client || !this.isConnected) {
                return null;
            }
            return await this.client.hGetAll(hash);
        }
        catch (error) {
            logger.error(`Error getting all hash fields for ${hash} from Redis:`, error);
            return null;
        }
    }
    async keys(pattern) {
        try {
            if (!this.client || !this.isConnected) {
                return [];
            }
            return await this.client.keys(pattern);
        }
        catch (error) {
            logger.error(`Error getting keys with pattern ${pattern} from Redis:`, error);
            return [];
        }
    }
    async flushAll() {
        try {
            if (!this.client || !this.isConnected) {
                return false;
            }
            await this.client.flushAll();
            return true;
        }
        catch (error) {
            logger.error('Error flushing all keys from Redis:', error);
            return false;
        }
    }
    async zadd(key, score, member) {
        try {
            if (!this.client || !this.isConnected) {
                return null;
            }
            return await this.client.zAdd(key, { score, value: member });
        }
        catch (error) {
            logger.error(`Error adding to sorted set ${key}:`, error);
            return null;
        }
    }
    async zrangebyscore(key, min, max, withScores) {
        try {
            if (!this.client || !this.isConnected) {
                return [];
            }
            if (withScores === 'WITHSCORES') {
                const result = await this.client.zRangeByScoreWithScores(key, min, max);
                const flattened = [];
                for (const item of result) {
                    flattened.push(item.value, item.score.toString());
                }
                return flattened;
            }
            else {
                return await this.client.zRangeByScore(key, min, max);
            }
        }
        catch (error) {
            logger.error(`Error getting range by score from ${key}:`, error);
            return [];
        }
    }
    async scan(cursor, match, pattern, count, countValue) {
        try {
            if (!this.client || !this.isConnected) {
                return ['0', []];
            }
            const options = {};
            if (match === 'MATCH' && pattern) {
                options.MATCH = pattern;
            }
            if (count === 'COUNT' && countValue) {
                options.COUNT = countValue;
            }
            const result = await this.client.scan(parseInt(cursor), options);
            return [result.cursor.toString(), result.keys];
        }
        catch (error) {
            logger.error('Error scanning Redis keys:', error);
            return ['0', []];
        }
    }
    async zremrangebyscore(key, min, max) {
        try {
            if (!this.client || !this.isConnected) {
                return 0;
            }
            return await this.client.zRemRangeByScore(key, min, max);
        }
        catch (error) {
            logger.error(`Error removing range by score from ${key}:`, error);
            return 0;
        }
    }
    async zcard(key) {
        try {
            if (!this.client || !this.isConnected) {
                return 0;
            }
            return await this.client.zCard(key);
        }
        catch (error) {
            logger.error(`Error getting cardinality of ${key}:`, error);
            return 0;
        }
    }
    async healthCheck() {
        try {
            if (!this.client || !this.isConnected) {
                return false;
            }
            const result = await this.client.ping();
            return result === 'PONG';
        }
        catch (error) {
            logger.error('Redis health check failed:', error);
            return false;
        }
    }
    isReady() {
        return this.isConnected && this.client !== null;
    }
}
export const redis = new RedisManager();
export default redis;
//# sourceMappingURL=redis.js.map