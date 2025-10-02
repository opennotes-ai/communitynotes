import { Client } from 'discord.js';
import { NotificationData, NotificationMethod, BatchedNotification } from './types.js';
export declare class DiscordNotificationSender {
    private client;
    constructor(client: Client);
    sendNotification(notification: NotificationData, method: NotificationMethod): Promise<boolean>;
    sendBatchedNotification(batch: BatchedNotification, method: NotificationMethod): Promise<boolean>;
    private sendDirectMessage;
    private sendChannelMention;
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=DiscordNotificationSender.d.ts.map