interface RateLimitResult {
    allowed: boolean;
    retryAfter?: Date;
    remaining?: number;
}
export declare class RateLimitService {
    private limits;
    private readonly configs;
    checkRateLimit(userId: string, action?: keyof typeof this.configs): Promise<RateLimitResult>;
    resetUserLimits(userId: string, action?: keyof typeof this.configs): Promise<void>;
    getRemainingAttempts(userId: string, action?: keyof typeof this.configs): Promise<number>;
    getBlockStatus(userId: string, action?: keyof typeof this.configs): Promise<{
        isBlocked: boolean;
        blockedUntil?: Date;
    }>;
    cleanup(): void;
    startCleanupTimer(): void;
}
export {};
//# sourceMappingURL=RateLimitService.d.ts.map