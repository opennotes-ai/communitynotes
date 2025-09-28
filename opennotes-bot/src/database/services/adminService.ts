import { prisma } from '../client.js';
import { AuditLog, ModerationQueue, Prisma } from '@prisma/client';
import { logger } from '../../shared/utils/logger.js';
import { ServerService } from './serverService.js';

export class AdminService {
  private serverService: ServerService;

  constructor() {
    this.serverService = new ServerService();
  }

  // Permission checks
  async isAdmin(serverId: string, userId: string): Promise<boolean> {
    try {
      return await this.serverService.hasModeratorRole(serverId, userId);
    } catch (error) {
      logger.error('Error checking admin permissions:', error);
      return false;
    }
  }

  // Audit logging
  async logAction(data: {
    serverId: string;
    adminId: string;
    action: string;
    target?: string;
    details?: any;
  }): Promise<AuditLog> {
    try {
      return await prisma.auditLog.create({
        data: {
          serverId: data.serverId,
          adminId: data.adminId,
          action: data.action,
          target: data.target,
          details: data.details ? JSON.stringify(data.details) : undefined,
        },
      });
    } catch (error) {
      logger.error('Error logging admin action:', error);
      throw error;
    }
  }

  // Channel management
  async enableChannel(serverId: string, channelId: string, adminId: string): Promise<void> {
    try {
      const server = await prisma.server.findUnique({
        where: { id: serverId },
        select: { enabledChannels: true, disabledChannels: true },
      });

      if (!server) {
        throw new Error('Server not found');
      }

      const enabledChannels = [...server.enabledChannels];
      const disabledChannels = server.disabledChannels.filter(id => id !== channelId);

      if (!enabledChannels.includes(channelId)) {
        enabledChannels.push(channelId);
      }

      await prisma.server.update({
        where: { id: serverId },
        data: {
          enabledChannels,
          disabledChannels,
        },
      });

      await this.logAction({
        serverId,
        adminId,
        action: 'enable_channel',
        target: channelId,
      });
    } catch (error) {
      logger.error('Error enabling channel:', error);
      throw error;
    }
  }

  async disableChannel(serverId: string, channelId: string, adminId: string): Promise<void> {
    try {
      const server = await prisma.server.findUnique({
        where: { id: serverId },
        select: { enabledChannels: true, disabledChannels: true },
      });

      if (!server) {
        throw new Error('Server not found');
      }

      const enabledChannels = server.enabledChannels.filter(id => id !== channelId);
      const disabledChannels = [...server.disabledChannels];

      if (!disabledChannels.includes(channelId)) {
        disabledChannels.push(channelId);
      }

      await prisma.server.update({
        where: { id: serverId },
        data: {
          enabledChannels,
          disabledChannels,
        },
      });

      await this.logAction({
        serverId,
        adminId,
        action: 'disable_channel',
        target: channelId,
      });
    } catch (error) {
      logger.error('Error disabling channel:', error);
      throw error;
    }
  }

  // Contributor management
  async addContributor(serverId: string, userId: string, roleId: string, adminId: string): Promise<void> {
    try {
      const server = await prisma.server.findUnique({
        where: { id: serverId },
        select: { contributorRoles: true },
      });

      if (!server) {
        throw new Error('Server not found');
      }

      const contributorRoles = [...server.contributorRoles];
      if (!contributorRoles.includes(roleId)) {
        contributorRoles.push(roleId);

        await prisma.server.update({
          where: { id: serverId },
          data: { contributorRoles },
        });
      }

      // Update user's roles
      await this.serverService.updateMemberRoles(serverId, userId, [roleId]);

      await this.logAction({
        serverId,
        adminId,
        action: 'add_contributor',
        target: userId,
        details: { roleId },
      });
    } catch (error) {
      logger.error('Error adding contributor:', error);
      throw error;
    }
  }

  async removeContributor(serverId: string, userId: string, adminId: string): Promise<void> {
    try {
      const member = await prisma.serverMember.findUnique({
        where: {
          userId_serverId: {
            userId,
            serverId,
          },
        },
      });

      if (member) {
        await prisma.serverMember.update({
          where: { id: member.id },
          data: { roles: [] },
        });
      }

      await this.logAction({
        serverId,
        adminId,
        action: 'remove_contributor',
        target: userId,
      });
    } catch (error) {
      logger.error('Error removing contributor:', error);
      throw error;
    }
  }

  // Emergency controls
  async pauseSystem(serverId: string, adminId: string, reason?: string): Promise<void> {
    try {
      await prisma.server.update({
        where: { id: serverId },
        data: {
          isPaused: true,
          pausedAt: new Date(),
          pausedBy: adminId,
          pauseReason: reason,
        },
      });

      await this.logAction({
        serverId,
        adminId,
        action: 'pause_system',
        details: { reason },
      });
    } catch (error) {
      logger.error('Error pausing system:', error);
      throw error;
    }
  }

  async resumeSystem(serverId: string, adminId: string): Promise<void> {
    try {
      await prisma.server.update({
        where: { id: serverId },
        data: {
          isPaused: false,
          pausedAt: null,
          pausedBy: null,
          pauseReason: null,
        },
      });

      await this.logAction({
        serverId,
        adminId,
        action: 'resume_system',
      });
    } catch (error) {
      logger.error('Error resuming system:', error);
      throw error;
    }
  }

  // Moderation queue
  async addToModerationQueue(data: {
    serverId: string;
    itemType: string;
    itemId: string;
    flagType: string;
    flaggedBy: string;
    reason?: string;
  }): Promise<ModerationQueue> {
    try {
      return await prisma.moderationQueue.create({
        data,
      });
    } catch (error) {
      logger.error('Error adding to moderation queue:', error);
      throw error;
    }
  }

  async getModerationQueue(serverId: string, status?: string): Promise<ModerationQueue[]> {
    try {
      const where: Prisma.ModerationQueueWhereInput = { serverId };
      if (status) {
        where.status = status;
      }

      return await prisma.moderationQueue.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error getting moderation queue:', error);
      throw error;
    }
  }

  async reviewModerationItem(
    id: string,
    reviewerId: string,
    action: string,
    actionTaken?: string
  ): Promise<void> {
    try {
      const item = await prisma.moderationQueue.update({
        where: { id },
        data: {
          status: action,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          actionTaken,
        },
      });

      await this.logAction({
        serverId: item.serverId,
        adminId: reviewerId,
        action: 'review_moderation',
        target: item.itemId,
        details: { action, actionTaken, flagType: item.flagType },
      });
    } catch (error) {
      logger.error('Error reviewing moderation item:', error);
      throw error;
    }
  }

  // Bulk actions
  async bulkDeleteNoteRequests(serverId: string, messageIds: string[], adminId: string): Promise<number> {
    try {
      const result = await prisma.noteRequest.updateMany({
        where: {
          message: {
            serverId,
            discordId: { in: messageIds },
          },
        },
        data: {
          isActive: false,
        },
      });

      await this.logAction({
        serverId,
        adminId,
        action: 'bulk_delete_requests',
        details: { messageIds, count: result.count },
      });

      return result.count;
    } catch (error) {
      logger.error('Error bulk deleting note requests:', error);
      throw error;
    }
  }

  async bulkDeleteCommunityNotes(serverId: string, noteIds: string[], adminId: string): Promise<number> {
    try {
      const result = await prisma.communityNote.deleteMany({
        where: {
          id: { in: noteIds },
          message: { serverId },
        },
      });

      await this.logAction({
        serverId,
        adminId,
        action: 'bulk_delete_notes',
        details: { noteIds, count: result.count },
      });

      return result.count;
    } catch (error) {
      logger.error('Error bulk deleting community notes:', error);
      throw error;
    }
  }

  // Statistics and monitoring
  async getAdminStats(serverId: string): Promise<{
    totalRequests: number;
    totalNotes: number;
    pendingModeration: number;
    recentActions: AuditLog[];
    topContributors: any[];
    channelActivity: any[];
  }> {
    try {
      const [
        totalRequests,
        totalNotes,
        pendingModeration,
        recentActions,
        topContributors,
      ] = await Promise.all([
        prisma.noteRequest.count({
          where: {
            message: { serverId },
            isActive: true,
          },
        }),
        prisma.communityNote.count({
          where: {
            message: { serverId },
          },
        }),
        prisma.moderationQueue.count({
          where: {
            serverId,
            status: 'pending',
          },
        }),
        prisma.auditLog.findMany({
          where: { serverId },
          orderBy: { timestamp: 'desc' },
          take: 10,
        }),
        this.getTopContributors(serverId),
      ]);

      const channelActivity = await this.getChannelActivity(serverId);

      return {
        totalRequests,
        totalNotes,
        pendingModeration,
        recentActions,
        topContributors,
        channelActivity,
      };
    } catch (error) {
      logger.error('Error getting admin stats:', error);
      throw error;
    }
  }

  private async getTopContributors(serverId: string): Promise<any[]> {
    try {
      return await prisma.user.findMany({
        where: {
          OR: [
            {
              communityNotes: {
                some: {
                  message: { serverId },
                },
              },
            },
            {
              noteRatings: {
                some: {
                  note: {
                    message: { serverId },
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          discordId: true,
          username: true,
          helpfulnessScore: true,
          totalNotes: true,
          totalRatings: true,
        },
        orderBy: {
          helpfulnessScore: 'desc',
        },
        take: 10,
      });
    } catch (error) {
      logger.error('Error getting top contributors:', error);
      return [];
    }
  }

  private async getChannelActivity(serverId: string): Promise<any[]> {
    try {
      return await prisma.message.groupBy({
        by: ['channelId'],
        where: { serverId },
        _count: {
          id: true,
        },
        _sum: {
          totalRequests: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      });
    } catch (error) {
      logger.error('Error getting channel activity:', error);
      return [];
    }
  }

  // Get audit logs
  async getAuditLogs(serverId: string, limit = 50): Promise<AuditLog[]> {
    try {
      return await prisma.auditLog.findMany({
        where: { serverId },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      throw error;
    }
  }
}