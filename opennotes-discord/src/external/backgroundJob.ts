/**
 * Background job for triggering external scoring service
 */

import * as cron from 'node-cron';
import { logger } from '../shared/utils/logger.js';
import { scoringService } from './scoringAdapter.js';
import { openNotesClient } from './opennotesClient.js';

export class ExternalScoringJob {
  private task: cron.ScheduledTask | null = null;
  private isRunning = false;
  private runCount = 0;
  private lastRunTime: Date | null = null;
  private lastError: Error | null = null;

  constructor(
    private config: {
      enabled: boolean;
      intervalMinutes: number;
      healthCheckIntervalMinutes?: number;
    }
  ) {}

  /**
   * Initialize the background job
   */
  public initialize(): void {
    if (!this.config.enabled) {
      logger.info('External scoring job disabled by configuration');
      return;
    }

    // Set up the main scoring job
    const cronExpression = `*/${this.config.intervalMinutes} * * * *`;
    this.task = cron.schedule(
      cronExpression,
      async () => {
        await this.run();
      },
      {
        scheduled: true,
        timezone: 'UTC',
      }
    );

    // Set up health check job
    const healthCheckInterval = this.config.healthCheckIntervalMinutes || 5;
    cron.schedule(
      `*/${healthCheckInterval} * * * *`,
      async () => {
        await this.healthCheck();
      },
      {
        scheduled: true,
        timezone: 'UTC',
      }
    );

    logger.info('External scoring job initialized', {
      intervalMinutes: this.config.intervalMinutes,
      healthCheckIntervalMinutes: healthCheckInterval,
    });
  }

  /**
   * Run the scoring job
   */
  public async run(): Promise<void> {
    if (this.isRunning) {
      logger.warn('External scoring job already running, skipping');
      return;
    }

    this.isRunning = true;
    this.runCount++;
    const startTime = Date.now();

    try {
      logger.info('Starting external scoring job run', {
        runNumber: this.runCount,
      });

      // Check if external service is available
      const isAvailable = await openNotesClient.isAvailable();
      if (!isAvailable) {
        throw new Error('External OpenNotes service is not available');
      }

      // Trigger scoring run on external service
      const result = await scoringService.runScoringJob();

      const processingTime = Date.now() - startTime;
      this.lastRunTime = new Date();
      this.lastError = null;

      logger.info('External scoring job completed successfully', {
        runNumber: this.runCount,
        processingTimeMs: processingTime,
        noteScoresProcessed: result.noteScores.length,
        userScoresProcessed: result.userScores.length,
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.lastError = error as Error;

      logger.error('External scoring job failed', {
        runNumber: this.runCount,
        processingTimeMs: processingTime,
        error: this.lastError.message,
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Perform health check on external service
   */
  private async healthCheck(): Promise<void> {
    try {
      const health = await openNotesClient.healthCheck();

      if (health.status === 'unhealthy') {
        logger.warn('External OpenNotes service is unhealthy', { health });
      } else {
        logger.debug('External OpenNotes service health check passed', {
          status: health.status,
          version: health.version,
        });
      }
    } catch (error) {
      logger.error('Failed to check external service health', { error });
    }
  }

  /**
   * Stop the background job
   */
  public stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('External scoring job stopped');
    }
  }

  /**
   * Get job statistics
   */
  public getStats(): {
    isRunning: boolean;
    runCount: number;
    lastRunTime: Date | null;
    lastError: Error | null;
    config: typeof this.config;
  } {
    return {
      isRunning: this.isRunning,
      runCount: this.runCount,
      lastRunTime: this.lastRunTime,
      lastError: this.lastError,
      config: this.config,
    };
  }
}

// Singleton instance
let scoringJob: ExternalScoringJob | null = null;

/**
 * Initialize the scoring background job
 */
export function initializeScoringJob(config?: {
  enabled?: boolean;
  intervalMinutes?: number;
  healthCheckIntervalMinutes?: number;
}): void {
  const jobConfig = {
    enabled: config?.enabled ?? true,
    intervalMinutes: config?.intervalMinutes ?? 30,
    healthCheckIntervalMinutes: config?.healthCheckIntervalMinutes ?? 5,
  };

  scoringJob = new ExternalScoringJob(jobConfig);
  scoringJob.initialize();
}

/**
 * Get the current scoring job instance
 */
export function getScoringJob(): ExternalScoringJob | null {
  return scoringJob;
}

/**
 * Stop the scoring job
 */
export function stopScoringJob(): void {
  if (scoringJob) {
    scoringJob.stop();
    scoringJob = null;
  }
}