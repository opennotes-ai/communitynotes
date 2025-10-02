import { NoteRequest } from '@prisma/client';
export declare class NoteRequestService {
    createRequest(data: {
        messageId: string;
        requestorId: string;
        serverId: string;
        reason?: string;
        sources?: string[];
    }): Promise<NoteRequest>;
    deactivateRequest(messageId: string, requestorId: string): Promise<NoteRequest | null>;
    getRequestsForMessage(messageId: string, activeOnly?: boolean): Promise<NoteRequest[]>;
    getUserRequests(requestorId: string, activeOnly?: boolean, limit?: number): Promise<NoteRequest[]>;
    getRequestCountForMessage(messageId: string): Promise<{
        total: number;
        unique: number;
        recentHours: number;
        shouldShow: boolean;
    }>;
    getRecentRequests(hours?: number, limit?: number): Promise<NoteRequest[]>;
    bulkDeactivateForMessage(messageId: string): Promise<number>;
    getRequestTrends(serverId: string, days?: number): Promise<{
        date: string;
        requests: number;
        uniqueUsers: number;
    }[]>;
}
//# sourceMappingURL=noteRequestService.d.ts.map