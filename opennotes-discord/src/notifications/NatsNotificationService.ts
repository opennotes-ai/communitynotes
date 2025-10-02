import { v4 as uuidv4 } from 'uuid';
import { Client } from 'discord.js';
import { jetStreamService } from '../streaming/JetStreamService.js';
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
import { NotificationMessage, MessagePriority } from '../streaming/StreamingService.js';
import { prisma } from '../database/client.js';

export class NatsNotificationService {
  private sender: DiscordNotificationSender;
  private isProcessing = false;
  private readonly NOTIFICATION_SUBJECT = 'notifications.queue';
  private readonly BATCH_SUBJECT = 'notifications.batch';

  constructor(discordClient: Client) {
    this.sender = new DiscordNotificationSender(discordClient);
  }

  async start(): Promise<void> {
    logger.info('Starting NATS notification service');

    try {
      // Subscribe to notification queue
      await jetStreamService.createConsumer(
        this.NOTIFICATION_SUBJECT,
        'notification-processor',
        this.processNotificationMessage.bind(this),
        {
          durable: 'notification-processor',
          maxDeliver: 3,
          ackWait: 30000
        }
      );

      // Subscribe to batch notifications
      await jetStreamService.createConsumer(
        this.BATCH_SUBJECT,
        'batch-processor',
        this.processBatchMessage.bind(this),
        {
          durable: 'batch-processor',
          maxDeliver: 3,
          ackWait: 60000
        }
      );

      logger.info('NATS notification service started successfully');
    } catch (error) {
      logger.error('Failed to start NATS notification service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping NATS notification service');
    // Consumers will be automatically cleaned up when NATS connection closes
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

      const notificationMessage: NotificationMessage = {
        id: notificationId,
        userId,
        type,
        priority: this.mapNotificationPriority(priority),
        data,
        scheduledFor,
        batchKey: batchKey || undefined
      };

      // If batching is enabled, send to batch subject, otherwise send directly
      const subject = batchKey ? this.BATCH_SUBJECT : this.NOTIFICATION_SUBJECT;

      await jetStreamService.publish(subject, notificationMessage);

      logger.info('Notification queued in NATS', {
        id: notificationId,
        userId,
        type,
        priority,
        batchKey,
        scheduledFor,
        subject
      });

      return notificationId;
    } catch (error) {
      logger.error('Failed to queue notification in NATS', {
        userId,
        type,
        error: error instanceof Error ? error.message : String(error)
      });
      return '';
    }
  }

  private async processNotificationMessage(message: any): Promise<void> {
    if (this.isProcessing) {
      return; // Skip if already processing to avoid concurrent processing
    }

    this.isProcessing = true;

    try {
      const notificationMsg = message.data as NotificationMessage;

      // Check if scheduled time has arrived
      if (notificationMsg.scheduledFor && notificationMsg.scheduledFor > new Date()) {
        logger.debug('Notification not yet scheduled, skipping', {
          id: notificationMsg.id,
          scheduledFor: notificationMsg.scheduledFor
        });
        // We'll process this message again later when it's time
        return;
      }

      // Get user notification preferences
      const user = await prisma.user.findUnique({
        where: { id: notificationMsg.userId },
        select: { notificationMethods: true }
      });

      if (!user) {
        logger.warn('User not found during notification processing', {
          notificationId: notificationMsg.id,
          userId: notificationMsg.userId
        });
        return;
      }

      const notificationData: NotificationData = {
        id: notificationMsg.id,
        type: notificationMsg.type as NotificationType,
        userId: notificationMsg.userId,
        priority: this.mapMessagePriority(notificationMsg.priority),
        data: notificationMsg.data,
        createdAt: new Date(),
        scheduledFor: notificationMsg.scheduledFor || new Date(),
        attempts: 0,
        maxAttempts: 3,
        lastAttemptAt: undefined,
        status: 'pending'
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
            notificationId: notificationMsg.id,
            method,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      if (success) {
        logger.info('Notification sent successfully via NATS', {
          id: notificationMsg.id,
          userId: notificationMsg.userId
        });
      } else {
        logger.error('Failed to send notification via all methods', {
          id: notificationMsg.id,
          userId: notificationMsg.userId
        });
        // Could republish with retry logic here
      }

    } catch (error) {
      logger.error('Error processing notification message', {
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      this.isProcessing = false;
    }
  }

  private async processBatchMessage(message: any): Promise<void> {
    try {
      const batchMsg = message.data as NotificationMessage;

      // For batching, we could collect multiple messages with the same batchKey
      // and send them together. For now, we'll send individually but could be enhanced
      // to implement true batching logic by collecting messages over time intervals.

      await this.processNotificationMessage(message);

    } catch (error) {
      logger.error('Error processing batch message', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private mapNotificationPriority(priority: NotificationPriority): MessagePriority {
    switch (priority) {
      case NotificationPriority.LOW:
        return MessagePriority.LOW;
      case NotificationPriority.MEDIUM:
        return MessagePriority.NORMAL;
      case NotificationPriority.HIGH:
        return MessagePriority.HIGH;
      default:
        return MessagePriority.NORMAL;
    }
  }

  private mapMessagePriority(priority: MessagePriority): NotificationPriority {
    switch (priority) {
      case MessagePriority.LOW:
        return NotificationPriority.LOW;
      case MessagePriority.NORMAL:
        return NotificationPriority.MEDIUM;
      case MessagePriority.HIGH:
        return NotificationPriority.HIGH;
      case MessagePriority.CRITICAL:
        return NotificationPriority.HIGH;
      default:
        return NotificationPriority.MEDIUM;
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

  async getQueueStats(): Promise<{
    totalMessages: number;
    processingRate: number;
    errorRate: number;
  }> {
    try {
      // Get stream info for notifications
      const streamInfo = await jetStreamService.getStreamInfo(this.NOTIFICATION_SUBJECT);

      return {
        totalMessages: streamInfo?.state?.messages || 0,
        processingRate: 0, // Would need to track this over time
        errorRate: 0 // Would need to track this over time
      };
    } catch (error) {
      logger.error('Failed to get queue stats', { error });
      return {
        totalMessages: 0,
        processingRate: 0,
        errorRate: 0
      };
    }
  }
}