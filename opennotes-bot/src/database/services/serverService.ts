import { prisma } from '../client.js';
import { Server, Prisma } from '@prisma/client';
import { logger } from '../../shared/utils/logger.js';
import { DiscordServerConfig } from '../../shared/types/discord.js';

export class ServerService {
  async findByDiscordId(discordId: string): Promise<Server | null> {
    try {
      return await prisma.server.findUnique({
        where: { discordId },
        include: {
          serverMembers: {
            include: {
              user: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding server by Discord ID:', error);
      throw error;
    }
  }

  async createServer(data: {
    discordId: string;
    name: string;
    icon?: string;
    config?: Partial<DiscordServerConfig>;
  }): Promise<Server> {
    try {
      const serverData: Prisma.ServerCreateInput = {
        discordId: data.discordId,
        name: data.name,
        icon: data.icon,
      };

      if (data.config) {
        if (data.config.settings) {
          serverData.allowNoteRequests = data.config.settings.allowNoteRequests ?? true;
          serverData.allowNoteCreation = data.config.settings.allowNoteCreation ?? true;
          serverData.maxRequestsPerUser = data.config.settings.maxRequestsPerUser ?? 5;
          serverData.requireVerification = data.config.settings.requireVerification ?? true;
        }

        serverData.enabledChannels = data.config.enabledChannels ?? [];
        serverData.disabledChannels = data.config.disabledChannels ?? [];
        serverData.moderatorRoles = data.config.moderatorRoles ?? [];
        serverData.contributorRoles = data.config.contributorRoles ?? [];
      }

      return await prisma.server.create({
        data: serverData,
      });
    } catch (error) {
      logger.error('Error creating server:', error);
      throw error;
    }
  }

  async updateServer(
    discordId: string,
    data: Partial<{
      name: string;
      icon: string;
      enabled: boolean;
      allowNoteRequests: boolean;
      allowNoteCreation: boolean;
      maxRequestsPerUser: number;
      requireVerification: boolean;
      enabledChannels: string[];
      disabledChannels: string[];
      moderatorRoles: string[];
      contributorRoles: string[];
    }>
  ): Promise<Server> {
    try {
      return await prisma.server.update({
        where: { discordId },
        data,
      });
    } catch (error) {
      logger.error('Error updating server:', error);
      throw error;
    }
  }

  async addMember(serverId: string, userId: string, roles: string[] = []): Promise<void> {
    try {
      await prisma.serverMember.upsert({
        where: {
          userId_serverId: {
            userId,
            serverId,
          },
        },
        update: {
          roles,
        },
        create: {
          userId,
          serverId,
          roles,
        },
      });
    } catch (error) {
      logger.error('Error adding server member:', error);
      throw error;
    }
  }

  async removeMember(serverId: string, userId: string): Promise<boolean> {
    try {
      const member = await prisma.serverMember.findUnique({
        where: {
          userId_serverId: {
            userId,
            serverId,
          },
        },
      });

      if (!member) {
        return false;
      }

      await prisma.serverMember.delete({
        where: { id: member.id },
      });

      return true;
    } catch (error) {
      logger.error('Error removing server member:', error);
      throw error;
    }
  }

  async updateMemberRoles(serverId: string, userId: string, roles: string[]): Promise<void> {
    try {
      await prisma.serverMember.update({
        where: {
          userId_serverId: {
            userId,
            serverId,
          },
        },
        data: { roles },
      });
    } catch (error) {
      logger.error('Error updating member roles:', error);
      throw error;
    }
  }

  async getServerMembers(serverId: string, roleFilter?: string): Promise<any[]> {
    try {
      const where: Prisma.ServerMemberWhereInput = { serverId };

      if (roleFilter) {
        where.roles = {
          has: roleFilter,
        };
      }

      return await prisma.serverMember.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              discordId: true,
              username: true,
              helpfulnessScore: true,
              trustLevel: true,
              lastActiveAt: true,
            },
          },
        },
        orderBy: {
          user: {
            lastActiveAt: 'desc',
          },
        },
      });
    } catch (error) {
      logger.error('Error getting server members:', error);
      throw error;
    }
  }

  async getServerContributors(serverId: string): Promise<any[]> {
    try {
      const server = await prisma.server.findUnique({
        where: { id: serverId },
        select: { contributorRoles: true },
      });

      if (!server || server.contributorRoles.length === 0) {
        return [];
      }

      return await prisma.serverMember.findMany({
        where: {
          serverId,
          roles: {
            hasSome: server.contributorRoles,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              discordId: true,
              username: true,
              helpfulnessScore: true,
              trustLevel: true,
              totalNotes: true,
              totalRatings: true,
            },
          },
        },
        orderBy: {
          user: {
            helpfulnessScore: 'desc',
          },
        },
      });
    } catch (error) {
      logger.error('Error getting server contributors:', error);
      throw error;
    }
  }

  async isChannelEnabled(serverId: string, channelId: string): Promise<boolean> {
    try {
      const server = await prisma.server.findUnique({
        where: { id: serverId },
        select: {
          enabled: true,
          enabledChannels: true,
          disabledChannels: true,
        },
      });

      if (!server || !server.enabled) {
        return false;
      }

      // If disabled channels list contains this channel, return false
      if (server.disabledChannels.includes(channelId)) {
        return false;
      }

      // If enabled channels list is empty, all channels are enabled by default
      // Otherwise, channel must be in the enabled list
      return server.enabledChannels.length === 0 || server.enabledChannels.includes(channelId);
    } catch (error) {
      logger.error('Error checking if channel is enabled:', error);
      return false;
    }
  }

  async hasModeratorRole(serverId: string, userId: string): Promise<boolean> {
    try {
      const server = await prisma.server.findUnique({
        where: { id: serverId },
        select: { moderatorRoles: true },
      });

      if (!server || server.moderatorRoles.length === 0) {
        return false;
      }

      const member = await prisma.serverMember.findUnique({
        where: {
          userId_serverId: {
            userId,
            serverId,
          },
        },
        select: { roles: true },
      });

      if (!member) {
        return false;
      }

      return member.roles.some(role => server.moderatorRoles.includes(role));
    } catch (error) {
      logger.error('Error checking moderator role:', error);
      return false;
    }
  }

  async hasContributorRole(serverId: string, userId: string): Promise<boolean> {
    try {
      const server = await prisma.server.findUnique({
        where: { id: serverId },
        select: { contributorRoles: true },
      });

      if (!server || server.contributorRoles.length === 0) {
        return false;
      }

      const member = await prisma.serverMember.findUnique({
        where: {
          userId_serverId: {
            userId,
            serverId,
          },
        },
        select: { roles: true },
      });

      if (!member) {
        return false;
      }

      return member.roles.some(role => server.contributorRoles.includes(role));
    } catch (error) {
      logger.error('Error checking contributor role:', error);
      return false;
    }
  }

  async getServerStats(serverId: string): Promise<{
    totalMembers: number;
    totalMessages: number;
    totalRequests: number;
    totalNotes: number;
    activeContributors: number;
  }> {
    try {
      const [memberCount, messageCount, requestCount, noteCount, contributorCount] = await Promise.all([
        prisma.serverMember.count({ where: { serverId } }),
        prisma.message.count({ where: { serverId } }),
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
        this.getActiveContributorCount(serverId),
      ]);

      return {
        totalMembers: memberCount,
        totalMessages: messageCount,
        totalRequests: requestCount,
        totalNotes: noteCount,
        activeContributors: contributorCount,
      };
    } catch (error) {
      logger.error('Error getting server stats:', error);
      throw error;
    }
  }

  private async getActiveContributorCount(serverId: string): Promise<number> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const activeContributors = await prisma.user.count({
        where: {
          OR: [
            {
              communityNotes: {
                some: {
                  submittedAt: { gte: thirtyDaysAgo },
                  message: { serverId },
                },
              },
            },
            {
              noteRatings: {
                some: {
                  timestamp: { gte: thirtyDaysAgo },
                  note: {
                    message: { serverId },
                  },
                },
              },
            },
          ],
        },
      });

      return activeContributors;
    } catch (error) {
      logger.error('Error getting active contributor count:', error);
      return 0;
    }
  }

  async getAllServers(): Promise<Server[]> {
    try {
      return await prisma.server.findMany({
        where: {
          enabled: true,
        },
        orderBy: [
          { name: 'asc' },
        ],
      });
    } catch (error) {
      logger.error('Error getting all servers:', error);
      throw error;
    }
  }
}