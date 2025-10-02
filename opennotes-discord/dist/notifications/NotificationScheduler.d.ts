import { NotificationIntegration } from './NotificationIntegration.js';
export declare class NotificationScheduler {
    private notificationIntegration;
    private schedulerInterval;
    private isRunning;
    constructor(notificationIntegration: NotificationIntegration);
    start(): void;
    stop(): void;
    isActive(): boolean;
}
//# sourceMappingURL=NotificationScheduler.d.ts.map