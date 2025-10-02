import { RequestAggregation } from '@prisma/client';
export declare class RequestAggregationService {
    updateAggregation(messageId: string): Promise<RequestAggregation>;
    getAggregation(messageId: string): Promise<RequestAggregation | null>;
    getMessagesNeedingContributorNotification(): Promise<RequestAggregation[]>;
    markContributorsNotified(messageId: string): Promise<RequestAggregation>;
    shouldNotifyContributors(messageId: string): Promise<{
        shouldNotify: boolean;
        totalRequests: number;
        uniqueRequestors: number;
        threshold: number;
    }>;
    getTopRequestedMessages(serverId?: string, limit?: number, hours?: number): Promise<any[]>;
    getRequestTrends(serverId?: string, days?: number): Promise<{
        date: string;
        totalRequests: number;
        uniqueMessages: number;
        thresholdMet: number;
    }[]>;
    cleanupExpiredRequests(): Promise<number>;
    getAggregationStats(): Promise<{
        totalMessages: number;
        messagesWithRequests: number;
        messagesAboveThreshold: number;
        averageRequestsPerMessage: number;
        averageUniqueRequestors: number;
    }>;
}
//# sourceMappingURL=requestAggregationService.d.ts.map