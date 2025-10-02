/**
 * Mock implementation of OpenNotes Client for testing
 */
import type { NoteSubmission, RatingSubmission, NoteScoreResponse, UserScoreResponse, RequestorMetricsResponse, BulkScoringRequest, BulkScoringResponse, ServiceHealthResponse } from '../opennotesClient.js';
export declare const mockNoteScores: Map<string, NoteScoreResponse>;
export declare const mockUserScores: Map<string, UserScoreResponse>;
export declare const mockRequestorMetrics: Map<string, RequestorMetricsResponse>;
export declare const defaultNoteScore: NoteScoreResponse;
export declare const defaultUserScore: UserScoreResponse;
export declare const defaultRequestorMetrics: RequestorMetricsResponse;
export declare const defaultHealthResponse: ServiceHealthResponse;
declare class MockOpenNotesClient {
    submitNoteCalls: NoteSubmission[];
    submitRatingCalls: RatingSubmission[];
    bulkScoreCalls: BulkScoringRequest[];
    healthCheckCalls: number;
    shouldFailHealthCheck: boolean;
    shouldFailRequests: boolean;
    requestDelay: number;
    constructor();
    reset(): void;
    private delay;
    private checkFailure;
    submitNote(note: NoteSubmission): Promise<NoteScoreResponse>;
    submitRating(rating: RatingSubmission): Promise<void>;
    getNoteScore(noteId: string): Promise<NoteScoreResponse>;
    getUserScore(userId: string): Promise<UserScoreResponse>;
    getRequestorMetrics(userId: string): Promise<RequestorMetricsResponse>;
    bulkScore(request: BulkScoringRequest): Promise<BulkScoringResponse>;
    triggerScoringRun(): Promise<BulkScoringResponse>;
    healthCheck(): Promise<ServiceHealthResponse>;
    isAvailable(): Promise<boolean>;
}
export declare const openNotesClient: MockOpenNotesClient;
export default openNotesClient;
export declare function setMockNoteScore(noteId: string, score: Partial<NoteScoreResponse>): void;
export declare function setMockUserScore(userId: string, score: Partial<UserScoreResponse>): void;
export declare function setMockRequestorMetrics(userId: string, metrics: Partial<RequestorMetricsResponse>): void;
export declare function resetMocks(): void;
//# sourceMappingURL=opennotesClient.d.ts.map