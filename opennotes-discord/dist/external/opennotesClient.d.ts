/**
 * HTTP Client for External OpenNotes Service
 *
 * This client handles all communication with the external OpenNotes service
 * which is responsible for scoring calculations and data persistence.
 */
export interface NoteSubmission {
    noteId: string;
    messageId: string;
    authorId: string;
    content: string;
    classification: string;
    submittedAt: Date;
}
export interface RatingSubmission {
    ratingId: string;
    noteId: string;
    raterId: string;
    helpful: boolean;
    reason?: string;
    timestamp: Date;
}
export interface NoteScoreResponse {
    noteId: string;
    score: number;
    status: 'pending' | 'crh' | 'nrh' | 'needs-more-ratings';
    confidence: number;
    helpfulRatings: number;
    notHelpfulRatings: number;
    totalRatings: number;
    helpfulnessRatio: number;
}
export interface UserScoreResponse {
    userId: string;
    helpfulnessScore: number;
    trustLevel: string;
    successfulRatings: number;
    unsuccessfulRatings: number;
    agreementRatio: number;
    aboveHelpfulnessThreshold: boolean;
}
export interface RequestorMetricsResponse {
    userId: string;
    totalRequests: number;
    helpfulRequests: number;
    notHelpfulRequests: number;
    pendingRequests: number;
    helpfulnessLevel: 'newcomer' | 'developing' | 'reliable' | 'highly_reliable';
    score: number;
    trustScore: number;
    recentActivityScore: number;
}
export interface BulkScoringRequest {
    noteIds?: string[];
    userIds?: string[];
    includeRatings?: boolean;
}
export interface BulkScoringResponse {
    noteScores: NoteScoreResponse[];
    userScores: UserScoreResponse[];
    timestamp: Date;
    processingTimeMs: number;
}
export interface ServiceHealthResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    uptime: number;
    lastScoringRun?: Date;
}
declare class OpenNotesClient {
    private baseUrl;
    private apiKey?;
    private timeout;
    private retryAttempts;
    private retryDelay;
    constructor();
    private makeRequest;
    /**
     * Submit a new note for scoring
     */
    submitNote(note: NoteSubmission): Promise<NoteScoreResponse>;
    /**
     * Submit a rating for a note
     */
    submitRating(rating: RatingSubmission): Promise<void>;
    /**
     * Get score for a specific note
     */
    getNoteScore(noteId: string): Promise<NoteScoreResponse>;
    /**
     * Get score for a specific user
     */
    getUserScore(userId: string): Promise<UserScoreResponse>;
    /**
     * Get requestor metrics for a user
     */
    getRequestorMetrics(userId: string): Promise<RequestorMetricsResponse>;
    /**
     * Perform bulk scoring for multiple notes and/or users
     */
    bulkScore(request: BulkScoringRequest): Promise<BulkScoringResponse>;
    /**
     * Trigger a full scoring recalculation
     */
    triggerScoringRun(): Promise<BulkScoringResponse>;
    /**
     * Check health status of the external service
     */
    healthCheck(): Promise<ServiceHealthResponse>;
    /**
     * Check if the service is available
     */
    isAvailable(): Promise<boolean>;
}
export declare const openNotesClient: OpenNotesClient;
export default openNotesClient;
//# sourceMappingURL=opennotesClient.d.ts.map