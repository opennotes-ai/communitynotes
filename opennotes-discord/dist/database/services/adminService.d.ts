import { AuditLog, ModerationQueue } from '@prisma/client';
export declare class AdminService {
    private serverService;
    constructor();
    isAdmin(serverId: string, userId: string): Promise<boolean>;
    logAction(data: {
        serverId: string;
        adminId: string;
        action: string;
        target?: string;
        details?: any;
    }): Promise<AuditLog>;
    enableChannel(serverId: string, channelId: string, adminId: string): Promise<void>;
    disableChannel(serverId: string, channelId: string, adminId: string): Promise<void>;
    addContributor(serverId: string, userId: string, roleId: string, adminId: string): Promise<void>;
    removeContributor(serverId: string, userId: string, adminId: string): Promise<void>;
    pauseSystem(serverId: string, adminId: string, reason?: string): Promise<void>;
    resumeSystem(serverId: string, adminId: string): Promise<void>;
    addToModerationQueue(data: {
        serverId: string;
        itemType: string;
        itemId: string;
        flagType: string;
        flaggedBy: string;
        reason?: string;
    }): Promise<ModerationQueue>;
    getModerationQueue(serverId: string, status?: string): Promise<ModerationQueue[]>;
    reviewModerationItem(id: string, reviewerId: string, action: string, actionTaken?: string): Promise<void>;
    bulkDeleteNoteRequests(serverId: string, messageIds: string[], adminId: string): Promise<number>;
    bulkDeleteOpenNotes(serverId: string, noteIds: string[], adminId: string): Promise<number>;
    getAdminStats(serverId: string): Promise<{
        totalRequests: number;
        totalNotes: number;
        pendingModeration: number;
        recentActions: AuditLog[];
        topContributors: any[];
        channelActivity: any[];
    }>;
    private getTopContributors;
    private getChannelActivity;
    getAuditLogs(serverId: string, limit?: number): Promise<AuditLog[]>;
}
//# sourceMappingURL=adminService.d.ts.map