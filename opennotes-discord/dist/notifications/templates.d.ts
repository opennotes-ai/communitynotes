import { NotificationType, NotificationTemplate } from './types.js';
export declare class NewRequestsThresholdTemplate implements NotificationTemplate {
    type: NotificationType;
    getTitle(data: Record<string, any>): string;
    getDescription(data: Record<string, any>): string;
    getEmbedColor(): number;
    shouldBatch(): boolean;
    getBatchKey(data: Record<string, any>): string;
}
export declare class NotePublishedTemplate implements NotificationTemplate {
    type: NotificationType;
    getTitle(data: Record<string, any>): string;
    getDescription(data: Record<string, any>): string;
    getEmbedColor(): number;
    shouldBatch(): boolean;
    getBatchKey(data: Record<string, any>): string;
}
export declare class NoteRatingsReceivedTemplate implements NotificationTemplate {
    type: NotificationType;
    getTitle(data: Record<string, any>): string;
    getDescription(data: Record<string, any>): string;
    getEmbedColor(): number;
    shouldBatch(): boolean;
    getBatchKey(data: Record<string, any>): string;
}
export declare class NoteStatusChangedTemplate implements NotificationTemplate {
    type: NotificationType;
    getTitle(data: Record<string, any>): string;
    getDescription(data: Record<string, any>): string;
    getEmbedColor(): number;
    shouldBatch(): boolean;
    getBatchKey(data: Record<string, any>): string;
    private getStatusEmoji;
    private getStatusDescription;
}
export declare class ContributorMilestoneTemplate implements NotificationTemplate {
    type: NotificationType;
    getTitle(data: Record<string, any>): string;
    getDescription(data: Record<string, any>): string;
    getEmbedColor(): number;
    shouldBatch(): boolean;
    getBatchKey(data: Record<string, any>): string;
}
export declare const notificationTemplates: Map<NotificationType, NotificationTemplate>;
//# sourceMappingURL=templates.d.ts.map