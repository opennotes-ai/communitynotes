import { Client, EmbedBuilder, User } from 'discord.js';
import { logger } from '../shared/utils/logger.js';
import { NotificationData, NotificationMethod, BatchedNotification } from './types.js';
import { notificationTemplates } from './templates.js';

export class DiscordNotificationSender {
  constructor(private client: Client) {}

  async sendNotification(notification: NotificationData, method: NotificationMethod): Promise<boolean> {
    try {
      const template = notificationTemplates.get(notification.type);
      if (!template) {
        logger.error('No template found for notification type', { type: notification.type });
        return false;
      }

      const embed = new EmbedBuilder()
        .setTitle(template.getTitle(notification.data))
        .setDescription(template.getDescription(notification.data))
        .setColor(template.getEmbedColor())
        .setTimestamp(notification.createdAt)
        .setFooter({ text: 'Open Notes Notification' });

      if (notification.data.messageUrl) {
        embed.addFields({ name: 'Original Message', value: `[Jump to message](${notification.data.messageUrl})` });
      }

      if (notification.data.noteId) {
        embed.addFields({ name: 'Note ID', value: notification.data.noteId, inline: true });
      }

      switch (method) {
        case NotificationMethod.DISCORD_DM:
          return await this.sendDirectMessage(notification.userId, embed);
        case NotificationMethod.CHANNEL_MENTION:
          return await this.sendChannelMention(notification.data.channelId, notification.userId, embed);
        default:
          logger.error('Unknown notification method', { method });
          return false;
      }
    } catch (error) {
      logger.error('Failed to send notification', {
        notificationId: notification.id,
        userId: notification.userId,
        method,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async sendBatchedNotification(batch: BatchedNotification, method: NotificationMethod): Promise<boolean> {
    try {
      const template = notificationTemplates.get(batch.type);
      if (!template) {
        logger.error('No template found for batched notification type', { type: batch.type });
        return false;
      }

      const count = batch.notifications.length;
      const embed = new EmbedBuilder()
        .setTitle(`📦 Batched Notifications (${count} items)`)
        .setColor(template.getEmbedColor())
        .setTimestamp(batch.createdAt)
        .setFooter({ text: 'Open Notes Notification' });

      if (count <= 5) {
        // Show individual notifications for small batches
        for (const notification of batch.notifications) {
          embed.addFields({
            name: template.getTitle(notification.data),
            value: template.getDescription(notification.data).substring(0, 1024),
            inline: false
          });
        }
      } else {
        // Summarize for large batches
        embed.setDescription(`You have ${count} ${batch.type.replace(/_/g, ' ')} notifications. Check the dashboard for details.`);
      }

      switch (method) {
        case NotificationMethod.DISCORD_DM:
          return await this.sendDirectMessage(batch.userId, embed);
        case NotificationMethod.CHANNEL_MENTION:
          // For batched notifications, we'll use DM only to avoid channel spam
          return await this.sendDirectMessage(batch.userId, embed);
        default:
          logger.error('Unknown notification method for batch', { method });
          return false;
      }
    } catch (error) {
      logger.error('Failed to send batched notification', {
        batchKey: batch.batchKey,
        userId: batch.userId,
        method,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  private async sendDirectMessage(userId: string, embed: EmbedBuilder): Promise<boolean> {
    try {
      const user = await this.client.users.fetch(userId);
      if (!user) {
        logger.warn('User not found for DM notification', { userId });
        return false;
      }

      await user.send({ embeds: [embed] });
      logger.info('Direct message notification sent successfully', { userId });
      return true;
    } catch (error) {
      // User might have DMs disabled or blocked the bot
      if (error instanceof Error && error.message.includes('Cannot send messages to this user')) {
        logger.info('User has DMs disabled, notification skipped', { userId });
      } else {
        logger.error('Failed to send direct message', {
          userId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return false;
    }
  }

  private async sendChannelMention(channelId: string, userId: string, embed: EmbedBuilder): Promise<boolean> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        logger.warn('Channel not found or not text-based for mention notification', { channelId });
        return false;
      }

      await channel.send({
        content: `<@${userId}>`,
        embeds: [embed]
      });

      logger.info('Channel mention notification sent successfully', { channelId, userId });
      return true;
    } catch (error) {
      logger.error('Failed to send channel mention', {
        channelId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      return this.client.isReady();
    } catch (error) {
      logger.error('Discord client connection test failed', { error });
      return false;
    }
  }
}