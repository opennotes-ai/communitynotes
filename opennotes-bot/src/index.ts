import { DiscordBot } from './bot/client.js';
import { ApiServer } from './api/server.js';
import { logger } from './shared/utils/logger.js';
import { appConfig } from './shared/config/index.js';
import { connectDatabase, disconnectDatabase } from './database/index.js';
import { redis } from './cache/redis.js';
import { natsConnection } from './streaming/NatsConnection.js';
import { initializeScoringJob, getScoringJob } from './scoring/index.js';

class Application {
  private bot: DiscordBot;
  private apiServer: ApiServer;

  constructor() {
    this.bot = new DiscordBot();
    this.apiServer = new ApiServer(this.bot);

    this.setupGracefulShutdown();
  }

  public async start(): Promise<void> {
    try {
      logger.info('Starting Community Notes Discord Bot...', {
        nodeEnv: appConfig.NODE_ENV,
        logLevel: appConfig.LOG_LEVEL,
      });

      // Connect to database
      await connectDatabase();

      // Connect to Redis
      await redis.connect();

      // Connect to NATS
      await natsConnection.connect();

      // Start API server
      await this.apiServer.start();

      // Start Discord bot
      await this.bot.start();

      // Initialize scoring background job
      initializeScoringJob();

      logger.info('Community Notes Discord Bot started successfully!');
    } catch (error) {
      logger.error('Failed to start application', { error });
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    logger.info('Stopping Community Notes Discord Bot...');

    try {
      // Stop scoring background job
      getScoringJob().stop();

      // Stop Discord bot
      await this.bot.stop();

      // Stop API server
      await this.apiServer.stop();

      // Disconnect from Redis
      await redis.disconnect();

      // Disconnect from NATS
      await natsConnection.disconnect();

      // Disconnect from database
      await disconnectDatabase();

      logger.info('Community Notes Discord Bot stopped successfully');
    } catch (error) {
      logger.error('Error during shutdown', { error });
    }
  }

  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, starting graceful shutdown...`);
        await this.stop();
        process.exit(0);
      });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      process.exit(1);
    });
  }
}

// Start the application
const app = new Application();
app.start();