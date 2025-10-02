import { NotificationType, NotificationPriority, NotificationPreferences } from './types.js';
import { Client } from 'discord.js';
export declare class NotificationService {
    private sender;
    private processingInterval;
    private batchingInterval;
    private isProcessing;
    constructor(discordClient: Client);
    start(): Promise<void>;
    stop(): Promise<void>;
    queueNotification(userId: string, type: NotificationType, data: Record<string, any>, priority?: NotificationPriority, scheduledFor?: Date): Promise<string>;
    processQueue(): Promise<void>;
    private processNotification;
    processBatchedNotifications(): Promise<void>;
    private processBatch;
    private markNotificationSent;
    private markNotificationFailed;
    private incrementNotificationAttempts;
    private isNotificationTypeEnabled;
    updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean>;
    getUserPreferences(userId: string): Promise<NotificationPreferences | null>;
}
//# sourceMappingURL=NotificationService.d.ts.map