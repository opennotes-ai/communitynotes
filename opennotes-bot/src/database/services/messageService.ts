import { prisma } from '../client.js';
import { Message, Prisma } from '@prisma/client';
import { logger } from '../../shared/utils/logger.js';
import { MessageContext } from '../../shared/types/discord.js';

export class MessageService {
  async findByDiscordId(discordId: string): Promise<Message | null> {
    try {
      return await prisma.message.findUnique({
        where: { discordId },
        include: {
          noteRequests: {
            include: {
              requestor: true,
            },
          },
          communityNotes: {
            include: {
              author: true,
              ratings: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding message by Discord ID:', error);
      throw error;
    }
  }

  async createMessage(context: MessageContext): Promise<Message> {
    try {
      const server = await prisma.server.findUnique({
        where: { discordId: context.serverId },
      });

      if (!server) {
        throw new Error(`Server ${context.serverId} not found`);
      }

      return await prisma.message.create({
        data: {
          discordId: context.messageId,
          channelId: context.channelId,
          serverId: server.id,
          authorId: context.authorId,
          content: context.content,
          attachments: context.attachments || [],
          timestamp: context.timestamp,
        },
      });
    } catch (error) {
      logger.error('Error creating message:', error);
      throw error;
    }
  }

  async updateRequestStats(messageId: string): Promise<Message> {
    try {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          noteRequests: {
            where: { isActive: true },
            select: { requestorId: true },
          },
        },
      });

      if (!message) {
        throw new Error('Message not found');
      }

      const uniqueRequestors = new Set(
        message.noteRequests.map(req => req.requestorId)
      ).size;

      return await prisma.message.update({
        where: { id: messageId },
        data: {
          totalRequests: message.noteRequests.length,
          uniqueRequestors,
        },
      });
    } catch (error) {
      logger.error('Error updating request stats:', error);
      throw error;
    }
  }

  async getMessagesNeedingNotes(serverId: string, minRequests: number, limit = 50): Promise<Message[]> {
    try {
      return await prisma.message.findMany({
        where: {
          serverId,
          totalRequests: { gte: minRequests },
          hasActiveNote: false,
        },
        include: {
          noteRequests: {
            where: { isActive: true },
            include: {
              requestor: true,
            },
          },
        },
        orderBy: [
          { totalRequests: 'desc' },
          { timestamp: 'desc' },
        ],
        take: limit,
      });
    } catch (error) {
      logger.error('Error getting messages needing notes:', error);
      throw error;
    }
  }

  async getRecentMessages(serverId: string, channelId?: string, hours = 24): Promise<Message[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      return await prisma.message.findMany({
        where: {
          serverId,
          ...(channelId && { channelId }),
          timestamp: { gte: since },
        },
        include: {
          noteRequests: true,
          communityNotes: true,
        },
        orderBy: { timestamp: 'desc' },
      });
    } catch (error) {
      logger.error('Error getting recent messages:', error);
      throw error;
    }
  }

  async markHasActiveNote(messageId: string, hasActiveNote: boolean): Promise<Message> {
    try {
      return await prisma.message.update({
        where: { id: messageId },
        data: { hasActiveNote },
      });
    } catch (error) {
      logger.error('Error marking message has active note:', error);
      throw error;
    }
  }

  async getMessageStats(messageId: string): Promise<{
    totalRequests: number;
    uniqueRequestors: number;
    totalNotes: number;
    visibleNotes: number;
  }> {
    try {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          noteRequests: { where: { isActive: true } },
          communityNotes: true,
        },
      });

      if (!message) {
        throw new Error('Message not found');
      }

      const uniqueRequestors = new Set(
        message.noteRequests.map(req => req.requestorId)
      ).size;

      const visibleNotes = message.communityNotes.filter(note => note.isVisible).length;

      return {
        totalRequests: message.noteRequests.length,
        uniqueRequestors,
        totalNotes: message.communityNotes.length,
        visibleNotes,
      };
    } catch (error) {
      logger.error('Error getting message stats:', error);
      throw error;
    }
  }

  async getMessagesWithRequests(serverId?: string, limit = 50): Promise<any[]> {
    try {
      const where: any = {
        totalRequests: { gt: 0 },
        hasActiveNote: false,
      };

      if (serverId) {
        where.serverId = serverId;
      }

      return await prisma.message.findMany({
        where,
        include: {
          noteRequests: {
            where: { isActive: true },
            include: {
              requestor: {
                select: {
                  id: true,
                  discordId: true,
                  username: true,
                  trustLevel: true,
                  helpfulnessScore: true,
                },
              },
            },
          },
          server: {
            select: {
              id: true,
              name: true,
              discordId: true,
            },
          },
        },
        orderBy: [
          { totalRequests: 'desc' },
          { timestamp: 'desc' },
        ],
        take: limit,
      });
    } catch (error) {
      logger.error('Error getting messages with requests:', error);
      throw error;
    }
  }
}