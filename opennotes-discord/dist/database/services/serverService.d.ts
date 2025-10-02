import { Server } from '@prisma/client';
import { DiscordServerConfig } from '../../shared/types/discord.js';
export declare class ServerService {
    findByDiscordId(discordId: string): Promise<Server | null>;
    createServer(data: {
        discordId: string;
        name: string;
        icon?: string;
        config?: Partial<DiscordServerConfig>;
    }): Promise<Server>;
    updateServer(discordId: string, data: Partial<{
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
    }>): Promise<Server>;
    addMember(serverId: string, userId: string, roles?: string[]): Promise<void>;
    removeMember(serverId: string, userId: string): Promise<boolean>;
    updateMemberRoles(serverId: string, userId: string, roles: string[]): Promise<void>;
    getServerMembers(serverId: string, roleFilter?: string): Promise<any[]>;
    getServerContributors(serverId: string): Promise<any[]>;
    isChannelEnabled(serverId: string, channelId: string): Promise<boolean>;
    hasModeratorRole(serverId: string, userId: string): Promise<boolean>;
    hasContributorRole(serverId: string, userId: string): Promise<boolean>;
    getServerStats(serverId: string): Promise<{
        totalMembers: number;
        totalMessages: number;
        totalRequests: number;
        totalNotes: number;
        activeContributors: number;
    }>;
    private getActiveContributorCount;
    getAllServers(): Promise<Server[]>;
}
//# sourceMappingURL=serverService.d.ts.map