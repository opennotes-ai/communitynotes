import { healthCheck as dbHealthCheck } from '../database/client.js';
import { redis } from '../cache/redis.js';
import { natsConnection } from '../streaming/NatsConnection.js';
import { logger } from '../shared/utils/logger.js';

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

export class HealthCheckService {
  private startTime = Date.now();

  async getHealthStatus(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    const [database, redisHealth, natsHealth, memory, disk] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkNats(),
      this.checkMemory(),
      this.checkDisk(),
    ]);

    const services = {
      database,
      redis: redisHealth,
      nats: natsHealth,
      memory,
      disk,
    };

    const overallStatus = this.determineOverallStatus(services);

    return {
      status: overallStatus,
      timestamp,
      uptime,
      services,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();
      const isHealthy = await dbHealthCheck();
      const responseTime = Date.now() - startTime;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime,
        ...(isHealthy ? {} : { error: 'Database connection failed' }),
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    try {
      if (!redis.isReady()) {
        return {
          status: 'unhealthy',
          error: 'Redis not connected',
        };
      }

      const startTime = Date.now();
      const isHealthy = await redis.healthCheck();
      const responseTime = Date.now() - startTime;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime,
        ...(isHealthy ? {} : { error: 'Redis ping failed' }),
      };
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown Redis error',
      };
    }
  }

  private async checkNats(): Promise<ServiceHealth> {
    try {
      if (!natsConnection.isReady()) {
        return {
          status: 'unhealthy',
          error: 'NATS not connected',
        };
      }

      const startTime = Date.now();
      const isHealthy = await natsConnection.healthCheck();
      const responseTime = Date.now() - startTime;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime,
        ...(isHealthy ? {} : { error: 'NATS health check failed' }),
      };
    } catch (error) {
      logger.error('NATS health check failed:', error);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown NATS error',
      };
    }
  }

  private async checkMemory(): Promise<MemoryHealth> {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal;
      const usedMemory = memoryUsage.heapUsed;
      const percentage = (usedMemory / totalMemory) * 100;

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (percentage > 90) {
        status = 'critical';
      } else if (percentage > 75) {
        status = 'warning';
      }

      return {
        status,
        usage: {
          used: usedMemory,
          total: totalMemory,
          percentage: Math.round(percentage * 100) / 100,
        },
      };
    } catch (error) {
      logger.error('Memory health check failed:', error);
      return {
        status: 'critical',
        usage: {
          used: 0,
          total: 0,
          percentage: 0,
        },
      };
    }
  }

  private async checkDisk(): Promise<DiskHealth> {
    try {
      // Note: This is a simplified disk check
      // In production, you might want to use a library like 'node-disk-info'
      // For now, we'll return a default healthy status
      return {
        status: 'healthy',
        usage: {
          used: 0,
          total: 0,
          percentage: 0,
        },
      };
    } catch (error) {
      logger.error('Disk health check failed:', error);
      return {
        status: 'critical',
        usage: {
          used: 0,
          total: 0,
          percentage: 0,
        },
      };
    }
  }

  private determineOverallStatus(services: HealthStatus['services']): 'healthy' | 'degraded' | 'unhealthy' {
    const criticalServices = ['database'];
    const hasCriticalFailure = criticalServices.some(
      service => services[service as keyof typeof services].status === 'unhealthy'
    );

    if (hasCriticalFailure) {
      return 'unhealthy';
    }

    const hasAnyFailure = Object.values(services).some(
      service => service.status === 'unhealthy' || service.status === 'critical' || service.status === 'warning'
    );

    if (hasAnyFailure) {
      return 'degraded';
    }

    return 'healthy';
  }

  async getDetailedDatabaseStats(): Promise<{
    connectionCount: number;
    slowQueries: number;
    tableStats: Array<{
      table: string;
      rowCount: number;
      sizeBytes: number;
    }>;
  }> {
    try {
      // This would need to be implemented based on your specific database setup
      // For now, return mock data
      return {
        connectionCount: 1,
        slowQueries: 0,
        tableStats: [],
      };
    } catch (error) {
      logger.error('Failed to get detailed database stats:', error);
      return {
        connectionCount: 0,
        slowQueries: 0,
        tableStats: [],
      };
    }
  }

  async getDetailedRedisStats(): Promise<{
    connectedClients: number;
    memoryUsageBytes: number;
    keyCount: number;
    hitRate: number;
  }> {
    try {
      if (!redis.isReady()) {
        return {
          connectedClients: 0,
          memoryUsageBytes: 0,
          keyCount: 0,
          hitRate: 0,
        };
      }

      const keys = await redis.keys('*');

      return {
        connectedClients: 1, // Would need Redis INFO command
        memoryUsageBytes: 0, // Would need Redis INFO command
        keyCount: keys.length,
        hitRate: 0, // Would need to track hits/misses
      };
    } catch (error) {
      logger.error('Failed to get detailed Redis stats:', error);
      return {
        connectedClients: 0,
        memoryUsageBytes: 0,
        keyCount: 0,
        hitRate: 0,
      };
    }
  }

  async getDetailedNatsStats(): Promise<{
    connected: boolean;
    reconnectAttempts: number;
    serverInfo: any;
    streamCount: number;
    consumerCount: number;
  }> {
    try {
      if (!natsConnection.isReady()) {
        return {
          connected: false,
          reconnectAttempts: 0,
          serverInfo: null,
          streamCount: 0,
          consumerCount: 0,
        };
      }

      const stats = natsConnection.getStats();
      let streamCount = 0;
      let consumerCount = 0;

      try {
        const jsManager = await natsConnection.getJetStreamManager();
        const streamList = await jsManager.streams.list().next();
        streamCount = streamList.length;

        // Count consumers across all streams
        for (const stream of streamList) {
          const consumerList = await jsManager.consumers.list(stream.config.name).next();
          consumerCount += consumerList.length;
        }
      } catch (error) {
        logger.debug('Could not get detailed NATS stream stats:', error);
      }

      return {
        connected: stats.connected,
        reconnectAttempts: stats.reconnectAttempts,
        serverInfo: stats.serverInfo,
        streamCount,
        consumerCount,
      };
    } catch (error) {
      logger.error('Failed to get detailed NATS stats:', error);
      return {
        connected: false,
        reconnectAttempts: 0,
        serverInfo: null,
        streamCount: 0,
        consumerCount: 0,
      };
    }
  }
}

export const healthCheckService = new HealthCheckService();
export default healthCheckService;