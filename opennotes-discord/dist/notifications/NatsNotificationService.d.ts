import { Client } from 'discord.js';
import { NotificationType, NotificationPriority, NotificationPreferences } from './types.js';
export declare class NatsNotificationService {
    private sender;
    private isProcessing;
    private readonly NOTIFICATION_SUBJECT;
    private readonly BATCH_SUBJECT;
    constructor(discordClient: Client);
    start(): Promise<void>;
    stop(): Promise<void>;
    queueNotification(userId: string, type: NotificationType, data: Record<string, any>, priority?: NotificationPriority, scheduledFor?: Date): Promise<string>;
    private processNotificationMessage;
    private processBatchMessage;
    private mapNotificationPriority;
    private mapMessagePriority;
    private isNotificationTypeEnabled;
    updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean>;
    getUserPreferences(userId: string): Promise<NotificationPreferences | null>;
    getQueueStats(): Promise<{
        totalMessages: number;
        processingRate: number;
        errorRate: number;
    }>;
}
//# sourceMappingURL=NatsNotificationService.d.ts.map