export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    services: {
        database: ServiceHealth;
        redis: ServiceHealth;
        nats: ServiceHealth;
        memory: MemoryHealth;
        disk: DiskHealth;
    };
    version: string;
    environment: string;
}
export interface ServiceHealth {
    status: 'healthy' | 'unhealthy';
    responseTime?: number;
    error?: string;
}
export interface MemoryHealth {
    status: 'healthy' | 'warning' | 'critical';
    usage: {
        used: number;
        total: number;
        percentage: number;
    };
}
export interface DiskHealth {
    status: 'healthy' | 'warning' | 'critical';
    usage: {
        used: number;
        total: number;
        percentage: number;
    };
}
export declare class HealthCheckService {
    private startTime;
    getHealthStatus(): Promise<HealthStatus>;
    private checkDatabase;
    private checkRedis;
    private checkNats;
    private checkMemory;
    private checkDisk;
    private determineOverallStatus;
    getDetailedDatabaseStats(): Promise<{
        connectionCount: number;
        slowQueries: number;
        tableStats: Array<{
            table: string;
            rowCount: number;
            sizeBytes: number;
        }>;
    }>;
    getDetailedRedisStats(): Promise<{
        connectedClients: number;
        memoryUsageBytes: number;
        keyCount: number;
        hitRate: number;
    }>;
    getDetailedNatsStats(): Promise<{
        connected: boolean;
        reconnectAttempts: number;
        serverInfo: any;
        streamCount: number;
        consumerCount: number;
    }>;
}
export declare const healthCheckService: HealthCheckService;
export default healthCheckService;
//# sourceMappingURL=healthCheck.d.ts.map