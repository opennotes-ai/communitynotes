import { NotificationService } from './NotificationService.js';
import { RequestAggregationService } from '../database/services/requestAggregationService.js';
import { UserService } from '../database/services/userService.js';
export declare class NotificationIntegration {
    private notificationService;
    private requestAggregationService;
    private userService;
    constructor(notificationService: NotificationService, requestAggregationService: RequestAggregationService, userService: UserService);
    handleNewRequestThresholdMet(messageId: string): Promise<void>;
    handleNotePublishedOnRequest(noteId: string): Promise<void>;
    handleNoteReceivedRatings(noteId: string, newRating: {
        helpful: boolean;
        raterId: string;
    }): Promise<void>;
    handleNoteStatusChanged(noteId: string, oldStatus: string, newStatus: string): Promise<void>;
    handleContributorMilestone(userId: string, milestone: {
        type: 'notes' | 'ratings' | 'helpfulness' | 'trust_level';
        metric: string;
        value: number;
        milestoneName: string;
    }): Promise<void>;
    checkAndTriggerMilestones(userId: string): Promise<void>;
    private getEligibleContributors;
    private shouldNotifyForRatingCount;
    processScheduledNotifications(): Promise<void>;
}
//# sourceMappingURL=NotificationIntegration.d.ts.map