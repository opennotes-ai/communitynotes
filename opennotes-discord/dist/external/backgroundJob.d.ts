/**
 * Background job for triggering external scoring service
 */
export declare class ExternalScoringJob {
    private config;
    private task;
    private isRunning;
    private runCount;
    private lastRunTime;
    private lastError;
    constructor(config: {
        enabled: boolean;
        intervalMinutes: number;
        healthCheckIntervalMinutes?: number;
    });
    /**
     * Initialize the background job
     */
    initialize(): void;
    /**
     * Run the scoring job
     */
    run(): Promise<void>;
    /**
     * Perform health check on external service
     */
    private healthCheck;
    /**
     * Stop the background job
     */
    stop(): void;
    /**
     * Get job statistics
     */
    getStats(): {
        isRunning: boolean;
        runCount: number;
        lastRunTime: Date | null;
        lastError: Error | null;
        config: typeof this.config;
    };
}
/**
 * Initialize the scoring background job
 */
export declare function initializeScoringJob(config?: {
    enabled?: boolean;
    intervalMinutes?: number;
    healthCheckIntervalMinutes?: number;
}): void;
/**
 * Get the current scoring job instance
 */
export declare function getScoringJob(): ExternalScoringJob | null;
/**
 * Stop the scoring job
 */
export declare function stopScoringJob(): void;
//# sourceMappingURL=backgroundJob.d.ts.map