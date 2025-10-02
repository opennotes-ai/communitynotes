import { RateLimiting } from '@prisma/client';
export declare class RateLimitingService {
    checkRateLimit(userId: string, limitType: string, maxCount: number): Promise<{
        allowed: boolean;
        currentCount: number;
        resetAt: Date;
        remainingCount: number;
    }>;
    incrementRateLimit(userId: string, limitType: string): Promise<RateLimiting>;
    checkDailyRequestLimit(userId: string): Promise<{
        allowed: boolean;
        currentCount: number;
        maxCount: number;
        resetAt: Date;
    }>;
    incrementDailyRequestCount(userId: string): Promise<void>;
    checkNoteCreationLimit(userId: string, maxNotesPerDay?: number): Promise<{
        allowed: boolean;
        currentCount: number;
        maxCount: number;
        resetAt: Date;
    }>;
    incrementNoteCreationCount(userId: string): Promise<void>;
    checkRatingLimit(userId: string, maxRatingsPerDay?: number): Promise<{
        allowed: boolean;
        currentCount: number;
        maxCount: number;
        resetAt: Date;
    }>;
    incrementRatingCount(userId: string): Promise<void>;
    getRateLimitStatus(userId: string): Promise<{
        dailyRequests: {
            current: number;
            max: number;
            resetAt: Date;
        };
        noteCreation: {
            current: number;
            max: number;
            resetAt: Date;
        };
        rating: {
            current: number;
            max: number;
            resetAt: Date;
        };
    }>;
    resetRateLimit(userId: string, limitType: string): Promise<void>;
    cleanupExpiredLimits(): Promise<number>;
    private getResetTime;
    getUsersNearLimit(limitType: string, threshold?: number): Promise<any[]>;
    private getMaxCountForLimitType;
}
//# sourceMappingURL=rateLimitingService.d.ts.map