import { logger } from '../shared/utils/logger.js';
export class RateLimitService {
    limits = new Map();
    // Rate limit configurations
    configs = {
        verification_start: {
            maxAttempts: 3,
            windowMinutes: 60,
            blockDurationMinutes: 60,
        },
        verification_complete: {
            maxAttempts: 10,
            windowMinutes: 15,
            blockDurationMinutes: 30,
        },
        general: {
            maxAttempts: 5,
            windowMinutes: 60,
            blockDurationMinutes: 60,
        },
    };
    async checkRateLimit(userId, action = 'general') {
        const key = `${userId}:${action}`;
        const config = this.configs[action];
        const now = new Date();
        let entry = this.limits.get(key);
        // Initialize entry if doesn't exist
        if (!entry) {
            entry = {
                count: 0,
                windowStart: now,
                blocked: false,
            };
        }
        // Check if user is currently blocked
        if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
            return {
                allowed: false,
                retryAfter: entry.blockedUntil,
            };
        }
        // Reset if window has expired
        const windowEnd = new Date(entry.windowStart.getTime() + config.windowMinutes * 60 * 1000);
        if (now > windowEnd) {
            entry = {
                count: 0,
                windowStart: now,
                blocked: false,
            };
        }
        // Check if adding this attempt would exceed the limit
        if (entry.count >= config.maxAttempts) {
            // Block the user
            entry.blocked = true;
            entry.blockedUntil = new Date(now.getTime() + config.blockDurationMinutes * 60 * 1000);
            this.limits.set(key, entry);
            logger.warn('Rate limit exceeded', {
                userId,
                action,
                count: entry.count,
                maxAttempts: config.maxAttempts,
                blockedUntil: entry.blockedUntil,
            });
            return {
                allowed: false,
                retryAfter: entry.blockedUntil,
            };
        }
        // Allow the request and increment count
        entry.count += 1;
        this.limits.set(key, entry);
        logger.debug('Rate limit check passed', {
            userId,
            action,
            count: entry.count,
            maxAttempts: config.maxAttempts,
            remaining: config.maxAttempts - entry.count,
        });
        return {
            allowed: true,
            remaining: config.maxAttempts - entry.count,
        };
    }
    async resetUserLimits(userId, action) {
        if (action) {
            const key = `${userId}:${action}`;
            this.limits.delete(key);
        }
        else {
            // Reset all limits for user
            const userKeys = Array.from(this.limits.keys()).filter(key => key.startsWith(`${userId}:`));
            userKeys.forEach(key => this.limits.delete(key));
        }
        logger.info('Rate limits reset', { userId, action });
    }
    async getRemainingAttempts(userId, action = 'general') {
        const key = `${userId}:${action}`;
        const config = this.configs[action];
        const entry = this.limits.get(key);
        if (!entry) {
            return config.maxAttempts;
        }
        const now = new Date();
        const windowEnd = new Date(entry.windowStart.getTime() + config.windowMinutes * 60 * 1000);
        // If window has expired, return max attempts
        if (now > windowEnd) {
            return config.maxAttempts;
        }
        return Math.max(0, config.maxAttempts - entry.count);
    }
    async getBlockStatus(userId, action = 'general') {
        const key = `${userId}:${action}`;
        const entry = this.limits.get(key);
        if (!entry || !entry.blocked) {
            return { isBlocked: false };
        }
        const now = new Date();
        if (entry.blockedUntil && now >= entry.blockedUntil) {
            // Block has expired
            entry.blocked = false;
            entry.blockedUntil = undefined;
            this.limits.set(key, entry);
            return { isBlocked: false };
        }
        return {
            isBlocked: true,
            blockedUntil: entry.blockedUntil,
        };
    }
    // Cleanup method to remove expired entries
    cleanup() {
        const now = new Date();
        const toDelete = [];
        for (const [key, entry] of this.limits.entries()) {
            // Remove entries that are no longer blocked and have expired windows
            const [, action] = key.split(':');
            const config = this.configs[action] || this.configs.general;
            const windowEnd = new Date(entry.windowStart.getTime() + config.windowMinutes * 60 * 1000);
            const isWindowExpired = now > windowEnd;
            const isBlockExpired = !entry.blocked || (entry.blockedUntil && now >= entry.blockedUntil);
            if (isWindowExpired && isBlockExpired) {
                toDelete.push(key);
            }
        }
        toDelete.forEach(key => this.limits.delete(key));
        if (toDelete.length > 0) {
            logger.debug('Cleaned up rate limit entries', { count: toDelete.length });
        }
    }
    // Start periodic cleanup
    startCleanupTimer() {
        setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000); // Cleanup every 5 minutes
    }
}
//# sourceMappingURL=RateLimitService.js.map