import { NotificationIntegration } from './NotificationIntegration.js';
import { logger } from '../shared/utils/logger.js';

export class NotificationScheduler {
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(private notificationIntegration: NotificationIntegration) {}

  start(): void {
    if (this.isRunning) {
      logger.warn('Notification scheduler is already running');
      return;
    }

    logger.info('Starting notification scheduler');
    this.isRunning = true;

    // Run scheduled notifications every 2 minutes
    this.schedulerInterval = setInterval(async () => {
      try {
        await this.notificationIntegration.processScheduledNotifications();
      } catch (error) {
        logger.error('Error in notification scheduler', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, 2 * 60 * 1000); // 2 minutes

    // Run initial check immediately
    this.notificationIntegration.processScheduledNotifications().catch(error => {
      logger.error('Error in initial notification check', {
        error: error instanceof Error ? error.message : String(error)
      });
    });
  }

  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    this.isRunning = false;
    logger.info('Notification scheduler stopped');
  }

  isActive(): boolean {
    return this.isRunning;
  }
}