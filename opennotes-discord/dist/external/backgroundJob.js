/**
 * Background job for triggering external scoring service
 */
import * as cron from 'node-cron';
import { logger } from '../shared/utils/logger.js';
import { scoringService } from './scoringAdapter.js';
import { openNotesClient } from './opennotesClient.js';
export class ExternalScoringJob {
    config;
    task = null;
    isRunning = false;
    runCount = 0;
    lastRunTime = null;
    lastError = null;
    constructor(config) {
        this.config = config;
    }
    /**
     * Initialize the background job
     */
    initialize() {
        if (!this.config.enabled) {
            logger.info('External scoring job disabled by configuration');
            return;
        }
        // Set up the main scoring job
        const cronExpression = `*/${this.config.intervalMinutes} * * * *`;
        this.task = cron.schedule(cronExpression, async () => {
            await this.run();
        }, {
            scheduled: true,
            timezone: 'UTC',
        });
        // Set up health check job
        const healthCheckInterval = this.config.healthCheckIntervalMinutes || 5;
        cron.schedule(`*/${healthCheckInterval} * * * *`, async () => {
            await this.healthCheck();
        }, {
            scheduled: true,
            timezone: 'UTC',
        });
        logger.info('External scoring job initialized', {
            intervalMinutes: this.config.intervalMinutes,
            healthCheckIntervalMinutes: healthCheckInterval,
        });
    }
    /**
     * Run the scoring job
     */
    async run() {
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
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            this.lastError = error;
            logger.error('External scoring job failed', {
                runNumber: this.runCount,
                processingTimeMs: processingTime,
                error: this.lastError.message,
            });
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Perform health check on external service
     */
    async healthCheck() {
        try {
            const health = await openNotesClient.healthCheck();
            if (health.status === 'unhealthy') {
                logger.warn('External OpenNotes service is unhealthy', { health });
            }
            else {
                logger.debug('External OpenNotes service health check passed', {
                    status: health.status,
                    version: health.version,
                });
            }
        }
        catch (error) {
            logger.error('Failed to check external service health', { error });
        }
    }
    /**
     * Stop the background job
     */
    stop() {
        if (this.task) {
            this.task.stop();
            this.task = null;
            logger.info('External scoring job stopped');
        }
    }
    /**
     * Get job statistics
     */
    getStats() {
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
let scoringJob = null;
/**
 * Initialize the scoring background job
 */
export function initializeScoringJob(config) {
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
export function getScoringJob() {
    return scoringJob;
}
/**
 * Stop the scoring job
 */
export function stopScoringJob() {
    if (scoringJob) {
        scoringJob.stop();
        scoringJob = null;
    }
}
//# sourceMappingURL=backgroundJob.js.map