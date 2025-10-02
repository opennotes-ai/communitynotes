declare class RedisManager {
    private client;
    private isConnected;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttlSeconds?: number): Promise<boolean>;
    del(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
    incr(key: string): Promise<number | null>;
    expire(key: string, ttlSeconds: number): Promise<boolean>;
    hget(hash: string, field: string): Promise<string | null>;
    hset(hash: string, field: string, value: string): Promise<boolean>;
    hgetall(hash: string): Promise<Record<string, string> | null>;
    keys(pattern: string): Promise<string[]>;
    flushAll(): Promise<boolean>;
    zadd(key: string, score: number, member: string): Promise<number | null>;
    zrangebyscore(key: string, min: number, max: number, withScores?: string): Promise<string[]>;
    scan(cursor: string, match?: string, pattern?: string, count?: string, countValue?: number): Promise<[string, string[]]>;
    zremrangebyscore(key: string, min: string | number, max: number): Promise<number>;
    zcard(key: string): Promise<number>;
    healthCheck(): Promise<boolean>;
    isReady(): boolean;
}
export declare const redis: RedisManager;
export default redis;
//# sourceMappingURL=redis.d.ts.map