import { logger } from '../shared/utils/logger.js';
import { ScoringService } from './scoringService.js';
import { RequestorScoringService } from './requestorScoringService.js';
import { BackgroundJobConfig, ScoringJobResult } from './types.js';
import { getBackgroundJobConfig } from './config.js';

/**
 * Background job scheduler for Community Notes scoring
 */
export class ScoringBackgroundJob {
  private config: BackgroundJobConfig;
  private scoringService: ScoringService;
  private requestorScoringService: RequestorScoringService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastRun: Date | null = null;
  private consecutiveErrors = 0;

  constructor(config?: BackgroundJobConfig) {
    this.config = config || getBackgroundJobConfig();
    this.scoringService = new ScoringService();
    this.requestorScoringService = new RequestorScoringService();
  }

  /**
   * Start the background job scheduler
   */
  start(): void {
    if (this.intervalId || !this.config.enabled) {
      return;
    }

    logger.info('Starting scoring background job', {
      intervalMinutes: this.config.intervalMinutes,
      batchSize: this.config.batchSize,
    });

    // Run immediately on start
    this.runScoringJob();

    // Schedule recurring runs
    this.intervalId = setInterval(
      () => this.runScoringJob(),
      this.config.intervalMinutes * 60 * 1000
    );
  }

  /**
   * Stop the background job scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Stopped scoring background job');
    }
  }

  /**
   * Run a single scoring job with error handling and retries
   */
  private async runScoringJob(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scoring job already running, skipping this execution');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting background scoring job');

      // Run both scoring systems in parallel
      const [scoringResult, requestorResult] = await Promise.all([
        this.executeWithTimeout(
          () => this.scoringService.runScoring({
            batchSize: this.config.batchSize,
          }),
          this.config.timeoutMs
        ),
        this.executeWithTimeout(
          () => this.requestorScoringService.bulkUpdateHelpfulnessScores(this.config.batchSize),
          this.config.timeoutMs
        )
      ]);

      // Combine results
      const result: ScoringJobResult & { requestorUpdates: any } = {
        ...scoringResult,
        requestorUpdates: requestorResult,
      };

      this.handleJobSuccess(result, startTime);

    } catch (error) {
      await this.handleJobError(error);
    } finally {
      this.isRunning = false;
      this.lastRun = new Date();
    }
  }

  /**
   * Execute a function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Scoring job timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Handle successful job execution
   */
  private handleJobSuccess(result: ScoringJobResult & { requestorUpdates?: any }, startTime: number): void {
    const duration = Date.now() - startTime;
    this.consecutiveErrors = 0;

    logger.info('Background scoring job completed successfully', {
      ...result,
      durationMs: duration,
    });

    // Log additional metrics
    if (result.statusChanges > 0) {
      logger.info('Note status changes detected', {
        changes: result.statusChanges,
        processedNotes: result.processedNotes,
        changeRate: (result.statusChanges / result.processedNotes) * 100,
      });
    }

    if (result.helpfulnessUpdates > 0) {
      logger.info('User helpfulness updates applied', {
        updates: result.helpfulnessUpdates,
        processedUsers: result.processedUsers,
        updateRate: (result.helpfulnessUpdates / result.processedUsers) * 100,
      });
    }

    // Log requestor scoring updates
    if (result.requestorUpdates) {
      logger.info('Requestor helpfulness scores updated', {
        processed: result.requestorUpdates.processed,
        updated: result.requestorUpdates.updated,
        errors: result.requestorUpdates.errors,
      });
    }
  }

  /**
   * Handle job errors with retry logic
   */
  private async handleJobError(error: unknown): Promise<void> {
    this.consecutiveErrors++;

    logger.error('Background scoring job failed', {
      error: error instanceof Error ? error.message : String(error),
      consecutiveErrors: this.consecutiveErrors,
      attempt: this.consecutiveErrors,
      maxRetries: this.config.maxRetries,
    });

    // If we haven't exceeded max retries, schedule a retry
    if (this.consecutiveErrors < this.config.maxRetries) {
      logger.info('Scheduling scoring job retry', {
        delayMs: this.config.retryDelayMs,
        attempt: this.consecutiveErrors + 1,
      });

      setTimeout(() => {
        if (!this.isRunning) {
          this.runScoringJob();
        }
      }, this.config.retryDelayMs);
    } else {
      logger.error('Max retries exceeded for scoring job, will wait for next scheduled run');
    }
  }

  /**
   * Force run a scoring job immediately
   */
  async forceRun(): Promise<ScoringJobResult> {
    logger.info('Force running scoring job');

    return this.scoringService.runScoring({
      batchSize: this.config.batchSize,
    });
  }

  /**
   * Get job status and statistics
   */
  getStatus(): {
    isRunning: boolean;
    enabled: boolean;
    lastRun: Date | null;
    consecutiveErrors: number;
    nextRun: Date | null;
  } {
    let nextRun: Date | null = null;

    if (this.intervalId && this.lastRun) {
      nextRun = new Date(
        this.lastRun.getTime() + this.config.intervalMinutes * 60 * 1000
      );
    }

    return {
      isRunning: this.isRunning,
      enabled: this.config.enabled,
      lastRun: this.lastRun,
      consecutiveErrors: this.consecutiveErrors,
      nextRun,
    };
  }

  /**
   * Update job configuration
   */
  updateConfig(newConfig: Partial<BackgroundJobConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // If interval changed and job is running, restart it
    if (this.intervalId && newConfig.intervalMinutes) {
      this.stop();
      this.start();
    }

    logger.info('Updated scoring job configuration', this.config);
  }

  /**
   * Get recent job statistics
   */
  async getRecentStats(): Promise<{
    totalNotes: number;
    crhNotes: number;
    nrhNotes: number;
    pendingNotes: number;
    averageHelpfulness: number;
    topContributors: Array<{ userId: string; score: number }>;
  }> {
    return this.scoringService.getScoringStats();
  }
}

// Global instance for the application
let scoringJob: ScoringBackgroundJob | null = null;

/**
 * Get or create the global scoring job instance
 */
export function getScoringJob(): ScoringBackgroundJob {
  if (!scoringJob) {
    scoringJob = new ScoringBackgroundJob();
  }
  return scoringJob;
}

/**
 * Initialize and start the scoring background job
 */
export function initializeScoringJob(): void {
  const job = getScoringJob();
  job.start();

  // Graceful shutdown handling
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, stopping scoring job');
    job.stop();
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, stopping scoring job');
    job.stop();
  });
}