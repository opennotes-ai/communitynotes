export declare class CacheService {
    private static readonly TTL;
    private static readonly KEYS;
    cacheUserProfile(userId: string, profile: any): Promise<void>;
    getUserProfile(userId: string): Promise<any | null>;
    cacheUserStats(userId: string, stats: any): Promise<void>;
    getUserStats(userId: string): Promise<any | null>;
    cacheUserRateLimits(userId: string, limits: any): Promise<void>;
    getUserRateLimits(userId: string): Promise<any | null>;
    cacheMessageRequests(messageId: string, requests: any[]): Promise<void>;
    getMessageRequests(messageId: string): Promise<any[] | null>;
    cacheMessageNotes(messageId: string, notes: any[]): Promise<void>;
    getMessageNotes(messageId: string): Promise<any[] | null>;
    cacheMessageStats(messageId: string, stats: any): Promise<void>;
    getMessageStats(messageId: string): Promise<any | null>;
    cacheServerConfig(serverId: string, config: any): Promise<void>;
    getServerConfig(serverId: string): Promise<any | null>;
    cacheServerContributors(serverId: string, contributors: any[]): Promise<void>;
    getServerContributors(serverId: string): Promise<any[] | null>;
    cacheNoteRatings(noteId: string, ratings: any[]): Promise<void>;
    getNoteRatings(noteId: string): Promise<any[] | null>;
    cacheRequestAggregation(messageId: string, aggregation: any): Promise<void>;
    getRequestAggregation(messageId: string): Promise<any | null>;
    cacheTopContributors(contributors: any[]): Promise<void>;
    getTopContributors(): Promise<any[] | null>;
    cacheTrendingRequests(requests: any[], serverId?: string): Promise<void>;
    getTrendingRequests(serverId?: string): Promise<any[] | null>;
    invalidateUserCache(userId: string): Promise<void>;
    invalidateMessageCache(messageId: string): Promise<void>;
    invalidateServerCache(serverId: string): Promise<void>;
    invalidateNoteCache(noteId: string): Promise<void>;
    invalidateGlobalCache(): Promise<void>;
    checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{
        allowed: boolean;
        remaining: number;
        resetTime: number;
    }>;
    clearAllCaches(): Promise<void>;
    getCacheInfo(): Promise<{
        connected: boolean;
        keyCount: number;
        memory: string;
    }>;
}
export declare const cacheService: CacheService;
export default cacheService;
//# sourceMappingURL=cacheService.d.ts.map