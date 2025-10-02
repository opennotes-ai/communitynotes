export interface SystemMetrics {
    database: DatabaseMetrics;
    noteRequests: RequestMetrics;
    communityNotes: NoteMetrics;
    users: UserMetrics;
    performance: PerformanceMetrics;
}
export interface DatabaseMetrics {
    totalUsers: number;
    totalServers: number;
    totalMessages: number;
    totalRequests: number;
    totalNotes: number;
    totalRatings: number;
    activeRequestsLast24h: number;
    newNotesLast24h: number;
}
export interface RequestMetrics {
    pendingRequests: number;
    requestsAboveThreshold: number;
    averageRequestsPerMessage: number;
    topRequestedMessages: Array<{
        messageId: string;
        requestCount: number;
        serverId: string;
    }>;
}
export interface NoteMetrics {
    pendingNotes: number;
    visibleNotes: number;
    averageHelpfulnessRatio: number;
    notesByStatus: Record<string, number>;
    topContributors: Array<{
        userId: string;
        username: string;
        noteCount: number;
        averageHelpfulness: number;
    }>;
}
export interface UserMetrics {
    totalActiveUsers: number;
    newUsersLast24h: number;
    usersByTrustLevel: Record<string, number>;
    averageHelpfulnessScore: number;
}
export interface PerformanceMetrics {
    averageResponseTime: number;
    slowQueriesCount: number;
    cacheHitRate: number;
    errorRate: number;
}
export declare class MetricsService {
    private performanceData;
    getSystemMetrics(): Promise<SystemMetrics>;
    private getDatabaseMetrics;
    private getRequestMetrics;
    private getNoteMetrics;
    private getUserMetrics;
    private getPerformanceMetrics;
    recordResponseTime(timeMs: number): void;
    recordCacheHit(): void;
    recordCacheMiss(): void;
    recordError(): void;
    recordRequest(): void;
    resetPerformanceData(): void;
    getServerSpecificMetrics(serverId: string): Promise<{
        totalMessages: number;
        totalRequests: number;
        totalNotes: number;
        activeMembers: number;
        contributorActivity: Array<{
            userId: string;
            username: string;
            notesCreated: number;
            ratingsGiven: number;
        }>;
    }>;
}
export declare const metricsService: MetricsService;
export default metricsService;
//# sourceMappingURL=metrics.d.ts.map