interface BenchmarkResult {
    operation: string;
    technology: 'Redis' | 'NATS';
    totalMessages: number;
    totalTime: number;
    messagesPerSecond: number;
    averageLatency: number;
    minLatency: number;
    maxLatency: number;
    errors: number;
    memoryUsage?: number;
}
export declare class RedisVsNatsBenchmark {
    private readonly MESSAGE_COUNTS;
    private readonly MESSAGE_SIZE_BYTES;
    runFullBenchmark(): Promise<{
        results: BenchmarkResult[];
        summary: {
            redisWins: number;
            natsWins: number;
            ties: number;
        };
    }>;
    private benchmarkRedisPublish;
    private benchmarkNatsPublish;
    private benchmarkRedisTimeSeries;
    private benchmarkNatsTimeSeries;
    private generateTestMessage;
    private calculateSummary;
    cleanupBenchmarkData(): Promise<void>;
    getBenchmarkReport(results: BenchmarkResult[]): Promise<string>;
}
export declare const redisVsNatsBenchmark: RedisVsNatsBenchmark;
export default redisVsNatsBenchmark;
//# sourceMappingURL=RedisVsNatsBenchmark.d.ts.map