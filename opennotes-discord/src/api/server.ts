import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { appConfig } from '../shared/config/index.js';
import { logger } from '../shared/utils/logger.js';
import { VerificationService } from '../verification/VerificationService.js';
import { VerificationMiddleware } from '../verification/VerificationMiddleware.js';
import { createVerificationRoutes } from './routes/verification.js';
import { createDashboardRoutes } from './routes/dashboard.js';
import { createAnalyticsRoutes } from './routes/analytics.js';
import { healthCheckService } from '../monitoring/healthCheck.js';
import { metricsService } from '../monitoring/metrics.js';
import type { DiscordBot } from '../bot/client.js';

export class ApiServer {
  private app: express.Application;
  private server: any;
  private io?: SocketServer;
  private verificationService: VerificationService;
  private verificationMiddleware: VerificationMiddleware;

  constructor(private bot: DiscordBot) {
    this.app = express();
    this.verificationService = new VerificationService();
    this.verificationMiddleware = new VerificationMiddleware(this.verificationService);
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('API request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      next();
    });
  }

  private setupRoutes(): void {
    // API routes
    this.app.use('/api/verification', createVerificationRoutes(this.verificationService, this.verificationMiddleware));
    this.app.use('/api/dashboard', createDashboardRoutes(this.verificationService));
    this.app.use('/api/analytics', createAnalyticsRoutes(this.verificationService, this.verificationMiddleware));

    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const healthStatus = await healthCheckService.getHealthStatus();
        const statusCode = healthStatus.status === 'healthy' ? 200 :
                          healthStatus.status === 'degraded' ? 200 : 503;

        res.status(statusCode).json(healthStatus);
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
        });
      }
    });

    // Detailed health check endpoint
    this.app.get('/api/health/detailed', async (req, res) => {
      try {
        const [healthStatus, dbStats, redisStats] = await Promise.all([
          healthCheckService.getHealthStatus(),
          healthCheckService.getDetailedDatabaseStats(),
          healthCheckService.getDetailedRedisStats(),
        ]);

        res.json({
          ...healthStatus,
          detailed: {
            database: dbStats,
            redis: redisStats,
          },
        });
      } catch (error) {
        logger.error('Detailed health check failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          error: 'Detailed health check failed',
        });
      }
    });

    // Bot status endpoint
    this.app.get('/api/bot/status', (req, res) => {
      const status = this.bot.getStatus();
      res.json(status);
    });

    // System metrics endpoint
    this.app.get('/api/metrics', async (req, res) => {
      try {
        const metrics = await metricsService.getSystemMetrics();
        res.json(metrics);
      } catch (error) {
        logger.error('Failed to get system metrics:', error);
        res.status(500).json({
          error: 'Failed to get system metrics',
        });
      }
    });

    // Server-specific metrics endpoint
    this.app.get('/api/metrics/server/:serverId', async (req, res) => {
      try {
        const { serverId } = req.params;
        const metrics = await metricsService.getServerSpecificMetrics(serverId);
        res.json(metrics);
      } catch (error) {
        logger.error('Failed to get server metrics:', error);
        res.status(500).json({
          error: 'Failed to get server metrics',
        });
      }
    });

    // Serve dashboard static files
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dashboardPath = path.join(__dirname, '../../dist/dashboard');

    this.app.use('/dashboard', express.static(dashboardPath));

    // Serve dashboard index.html for SPA routing
    this.app.get('/dashboard/*', (req, res) => {
      res.sendFile(path.join(dashboardPath, 'index.html'));
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Open Notes Discord Bot API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          status: '/api/bot/status',
          metrics: '/api/metrics',
          verification: '/api/verification',
          dashboard: '/dashboard',
        },
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
      });
    });

    // Error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('API error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      });
    });
  }

  private setupSocketIO(): void {
    if (!this.io) return;

    // Socket authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, appConfig.JWT_SECRET) as any;
        const isVerified = await this.verificationService.isUserVerified(decoded.discordId);

        if (!isVerified) {
          return next(new Error('Authentication error: User not verified'));
        }

        const permissions = await this.verificationService.getUserPermissions(decoded.discordId);
        if (!permissions.canCreateNotes) {
          return next(new Error('Authentication error: Insufficient permissions'));
        }

        socket.data.user = {
          discordId: decoded.discordId,
          userId: decoded.userId,
          permissions
        };

        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });

    // Connection handling
    this.io.on('connection', (socket) => {
      const user = socket.data.user;
      logger.info('Dashboard user connected via socket', { discordId: user.discordId });

      // Join dashboard room for real-time updates
      socket.join('dashboard');

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info('Dashboard user disconnected', { discordId: user.discordId, reason });
      });

      // Handle dashboard-specific events
      socket.on('join_server_room', (serverId: string) => {
        socket.join(`server:${serverId}`);
        logger.debug('User joined server room', { discordId: user.discordId, serverId });
      });

      socket.on('leave_server_room', (serverId: string) => {
        socket.leave(`server:${serverId}`);
        logger.debug('User left server room', { discordId: user.discordId, serverId });
      });
    });

    logger.info('Socket.IO server initialized for dashboard');
  }

  // Method to emit real-time updates to dashboard clients
  public emitDashboardUpdate(event: string, data: any, serverId?: string): void {
    if (!this.io) return;

    if (serverId) {
      this.io.to(`server:${serverId}`).emit(event, data);
    } else {
      this.io.to('dashboard').emit(event, data);
    }

    logger.debug('Dashboard update emitted', { event, serverId });
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer(this.app);
      this.io = new SocketServer(this.server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      });
      this.setupSocketIO();

      this.server.listen(appConfig.PORT, () => {
        logger.info(`API server started on port ${appConfig.PORT}`);
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          logger.info('API server stopped');
          resolve();
        });
      });
    }
  }
}