import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../database/client.js';
import { logger } from '../shared/utils/logger.js';
import { DiscordNotificationSender } from './DiscordNotificationSender.js';
import { notificationTemplates } from './templates.js';
import {
  NotificationType,
  NotificationPriority,
  NotificationMethod,
  NotificationData,
  NotificationPreferences,
  BatchedNotification
} from './types.js';
import { Client } from 'discord.js';

export class NotificationService {
  private sender: DiscordNotificationSender;
  private processingInterval: NodeJS.Timeout | null = null;
  private batchingInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(discordClient: Client) {
    this.sender = new DiscordNotificationSender(discordClient);
  }

  async start(): Promise<void> {
    logger.info('Starting notification service');

    // Process pending notifications every 30 seconds
    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processQueue();
      }
    }, 30000);

    // Process batched notifications every 5 minutes
    this.batchingInterval = setInterval(async () => {
      await this.processBatchedNotifications();
    }, 5 * 60 * 1000);

    // Process any pending notifications immediately
    await this.processQueue();
  }

  async stop(): Promise<void> {
    logger.info('Stopping notification service');

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    if (this.batchingInterval) {
      clearInterval(this.batchingInterval);
      this.batchingInterval = null;
    }
  }

  async queueNotification(
    userId: string,
    type: NotificationType,
    data: Record<string, any>,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    scheduledFor?: Date
  ): Promise<string> {
    try {
      // Check if user exists and get their preferences
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          notifyNewRequests: true,
          notifyNotePublished: true,
          notifyNoteRatings: true,
          notifyStatusChanged: true,
          notifyMilestones: true,
          notificationBatching: true,
          batchingInterval: true,
          notificationMethods: true,
          notificationsMutedUntil: true
        }
      });

      if (!user) {
        logger.warn('User not found for notification', { userId, type });
        return '';
      }

      // Check if notifications are muted
      if (user.notificationsMutedUntil && user.notificationsMutedUntil > new Date()) {
        logger.info('Notifications muted for user', { userId, mutedUntil: user.notificationsMutedUntil });
        return '';
      }

      // Check if user has this notification type enabled
      if (!this.isNotificationTypeEnabled(user, type)) {
        logger.info('Notification type disabled for user', { userId, type });
        return '';
      }

      const template = notificationTemplates.get(type);
      if (!template) {
        logger.error('No template found for notification type', { type });
        return '';
      }

      const notificationId = uuidv4();
      const batchKey = user.notificationBatching && template.shouldBatch()
        ? template.getBatchKey(data)
        : null;

      const notification = await prisma.notificationQueue.create({
        data: {
          id: notificationId,
          userId,
          type,
          priority,
          data,
          scheduledFor: scheduledFor || new Date(),
          batchKey
        }
      });

      logger.info('Notification queued', {
        id: notificationId,
        userId,
        type,
        priority,
        batchKey,
        scheduledFor
      });

      return notificationId;
    } catch (error) {
      logger.error('Failed to queue notification', {
        userId,
        type,
        error: error instanceof Error ? error.message : String(error)
      });
      return '';
    }
  }

  async processQueue(): Promise<void> {
    this.isProcessing = true;
    try {
      // Get pending notifications that are ready to be sent
      const notifications = await prisma.notificationQueue.findMany({
        where: {
          status: 'pending',
          scheduledFor: { lte: new Date() },
          batchKey: null // Process individual notifications only
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ],
        take: 50 // Process in batches
      });

      for (const notification of notifications) {
        await this.processNotification(notification);
      }
    } catch (error) {
      logger.error('Error processing notification queue', { error });
    } finally {
      this.isProcessing = false;
    }
  }

  private async processNotification(notification: any): Promise<void> {
    try {
      // Get user notification preferences
      const user = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: { notificationMethods: true }
      });

      if (!user) {
        await this.markNotificationFailed(notification.id, 'User not found');
        return;
      }

      const notificationData: NotificationData = {
        id: notification.id,
        type: notification.type as NotificationType,
        userId: notification.userId,
        priority: notification.priority as NotificationPriority,
        data: notification.data,
        createdAt: notification.createdAt,
        scheduledFor: notification.scheduledFor,
        attempts: notification.attempts,
        maxAttempts: notification.maxAttempts,
        lastAttemptAt: notification.lastAttemptAt,
        status: notification.status
      };

      let success = false;
      const methods = user.notificationMethods as NotificationMethod[];

      // Try each notification method
      for (const method of methods) {
        try {
          const sent = await this.sender.sendNotification(notificationData, method);
          if (sent) {
            success = true;
            break; // Successfully sent via one method, no need to try others
          }
        } catch (error) {
          logger.warn('Failed to send via method', {
            notificationId: notification.id,
            method,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      if (success) {
        await this.markNotificationSent(notification.id);
      } else {
        await this.incrementNotificationAttempts(notification.id);
      }
    } catch (error) {
      logger.error('Error processing individual notification', {
        notificationId: notification.id,
        error: error instanceof Error ? error.message : String(error)
      });
      await this.incrementNotificationAttempts(notification.id);
    }
  }

  async processBatchedNotifications(): Promise<void> {
    try {
      // Find notifications that should be batched
      const batchableNotifications = await prisma.notificationQueue.findMany({
        where: {
          status: 'pending',
          batchKey: { not: null },
          scheduledFor: { lte: new Date() }
        },
        orderBy: { createdAt: 'asc' }
      });

      // Group by user and batch key
      const batches = new Map<string, any[]>();
      for (const notification of batchableNotifications) {
        const key = `${notification.userId}_${notification.batchKey}`;
        if (!batches.has(key)) {
          batches.set(key, []);
        }
        batches.get(key)!.push(notification);
      }

      // Process each batch
      for (const [batchKey, notifications] of batches) {
        await this.processBatch(batchKey, notifications);
      }
    } catch (error) {
      logger.error('Error processing batched notifications', { error });
    }
  }

  private async processBatch(batchKey: string, notifications: any[]): Promise<void> {
    if (notifications.length === 0) return;

    const userId = notifications[0].userId;
    const type = notifications[0].type as NotificationType;

    try {
      // Get user notification preferences
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          notificationMethods: true,
          batchingInterval: true
        }
      });

      if (!user) {
        // Mark all notifications as failed
        await prisma.notificationQueue.updateMany({
          where: { id: { in: notifications.map(n => n.id) } },
          data: { status: 'failed' }
        });
        return;
      }

      // Check if batch should be sent (based on time or count)
      const oldestNotification = notifications[0];
      const batchAge = Date.now() - oldestNotification.createdAt.getTime();
      const batchAgeMinutes = batchAge / (1000 * 60);

      const shouldSendBatch = batchAgeMinutes >= user.batchingInterval || notifications.length >= 10;

      if (!shouldSendBatch) {
        return; // Wait for more notifications or more time
      }

      const batchedNotification: BatchedNotification = {
        userId,
        type,
        batchKey: batchKey.split('_')[1], // Remove userId prefix
        notifications: notifications.map(n => ({
          id: n.id,
          type: n.type,
          userId: n.userId,
          priority: n.priority,
          data: n.data,
          createdAt: n.createdAt,
          scheduledFor: n.scheduledFor,
          attempts: n.attempts,
          maxAttempts: n.maxAttempts,
          lastAttemptAt: n.lastAttemptAt,
          status: n.status
        })),
        createdAt: oldestNotification.createdAt,
        scheduledFor: new Date()
      };

      let success = false;
      const methods = user.notificationMethods as NotificationMethod[];

      // Try each notification method
      for (const method of methods) {
        try {
          const sent = await this.sender.sendBatchedNotification(batchedNotification, method);
          if (sent) {
            success = true;
            break;
          }
        } catch (error) {
          logger.warn('Failed to send batch via method', {
            batchKey,
            method,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      if (success) {
        // Mark all notifications as sent
        await prisma.notificationQueue.updateMany({
          where: { id: { in: notifications.map(n => n.id) } },
          data: {
            status: 'sent',
            batchedAt: new Date()
          }
        });

        logger.info('Batch notification sent successfully', {
          batchKey,
          userId,
          count: notifications.length
        });
      } else {
        // Increment attempts for all notifications
        await prisma.notificationQueue.updateMany({
          where: { id: { in: notifications.map(n => n.id) } },
          data: {
            attempts: { increment: 1 },
            lastAttemptAt: new Date()
          }
        });
      }
    } catch (error) {
      logger.error('Error processing batch', {
        batchKey,
        count: notifications.length,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async markNotificationSent(notificationId: string): Promise<void> {
    await prisma.notificationQueue.update({
      where: { id: notificationId },
      data: { status: 'sent' }
    });
  }

  private async markNotificationFailed(notificationId: string, reason: string): Promise<void> {
    await prisma.notificationQueue.update({
      where: { id: notificationId },
      data: {
        status: 'failed',
        lastAttemptAt: new Date()
      }
    });

    logger.warn('Notification marked as failed', { notificationId, reason });
  }

  private async incrementNotificationAttempts(notificationId: string): Promise<void> {
    const notification = await prisma.notificationQueue.findUnique({
      where: { id: notificationId },
      select: { attempts: true, maxAttempts: true }
    });

    if (!notification) return;

    const newAttempts = notification.attempts + 1;
    const status = newAttempts >= notification.maxAttempts ? 'failed' : 'pending';

    await prisma.notificationQueue.update({
      where: { id: notificationId },
      data: {
        attempts: newAttempts,
        status,
        lastAttemptAt: new Date()
      }
    });

    if (status === 'failed') {
      logger.warn('Notification failed after max attempts', {
        notificationId,
        attempts: newAttempts,
        maxAttempts: notification.maxAttempts
      });
    }
  }

  private isNotificationTypeEnabled(user: any, type: NotificationType): boolean {
    switch (type) {
      case NotificationType.NEW_REQUESTS_THRESHOLD_MET:
        return user.notifyNewRequests;
      case NotificationType.NOTE_PUBLISHED_ON_REQUEST:
        return user.notifyNotePublished;
      case NotificationType.NOTE_RECEIVED_RATINGS:
        return user.notifyNoteRatings;
      case NotificationType.NOTE_STATUS_CHANGED:
        return user.notifyStatusChanged;
      case NotificationType.CONTRIBUTOR_MILESTONE_REACHED:
        return user.notifyMilestones;
      default:
        return false;
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          notifyNewRequests: preferences.newRequestsThreshold,
          notifyNotePublished: preferences.notePublishedOnRequest,
          notifyNoteRatings: preferences.noteReceivedRatings,
          notifyStatusChanged: preferences.noteStatusChanged,
          notifyMilestones: preferences.contributorMilestones,
          notificationBatching: preferences.batchingEnabled,
          batchingInterval: preferences.batchingInterval,
          notificationMethods: preferences.methods,
          notificationsMutedUntil: preferences.mutedUntil
        }
      });

      logger.info('User notification preferences updated', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to update user notification preferences', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          notifyNewRequests: true,
          notifyNotePublished: true,
          notifyNoteRatings: true,
          notifyStatusChanged: true,
          notifyMilestones: true,
          notificationBatching: true,
          batchingInterval: true,
          notificationMethods: true,
          notificationsMutedUntil: true
        }
      });

      if (!user) return null;

      return {
        userId: user.id,
        newRequestsThreshold: user.notifyNewRequests,
        notePublishedOnRequest: user.notifyNotePublished,
        noteReceivedRatings: user.notifyNoteRatings,
        noteStatusChanged: user.notifyStatusChanged,
        contributorMilestones: user.notifyMilestones,
        batchingEnabled: user.notificationBatching,
        batchingInterval: user.batchingInterval,
        methods: user.notificationMethods as NotificationMethod[],
        mutedUntil: user.notificationsMutedUntil || undefined
      };
    } catch (error) {
      logger.error('Failed to get user notification preferences', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }
}