/**
 * Adapter to replace internal scoring with external OpenNotes service
 */
export declare class RequestorScoringAdapter {
    /**
     * Check if a user is eligible to make a request
     */
    isUserEligibleForRequest(userId: string, serverId: string): Promise<{
        eligible: boolean;
        reason?: string;
        remainingRequests?: number;
    }>;
    /**
     * Track that an eligible request was made
     */
    trackEligibleRequest(userId: string, messageId: string, reason?: string, sources?: string[]): Promise<void>;
    /**
     * Determine if requests should be shown for a message
     */
    shouldShowRequests(messageId: string): Promise<boolean>;
    /**
     * Get requestor metrics
     */
    getRequestorMetrics(userId: string): Promise<import("./opennotesClient.js").RequestorMetricsResponse>;
    /**
     * Calculate requestor helpfulness
     */
    calculateRequestorHelpfulness(userId: string): Promise<{
        score: number;
        level: "newcomer" | "developing" | "reliable" | "highly_reliable";
        trustScore: number;
        totalRequests: number;
        helpfulRequests: number;
        notHelpfulRequests: number;
    } | null>;
}
export declare class ScoringAdapter {
    /**
     * Calculate note scores using external service
     */
    calculateNoteScore(noteId: string): Promise<import("./opennotesClient.js").NoteScoreResponse>;
    /**
     * Calculate user scores using external service
     */
    calculateUserScore(userId: string): Promise<import("./opennotesClient.js").UserScoreResponse>;
    /**
     * Submit a rating
     */
    submitRating(rating: {
        ratingId: string;
        noteId: string;
        raterId: string;
        helpful: boolean;
        reason?: string;
    }): Promise<void>;
    /**
     * Perform bulk scoring
     */
    performBulkScoring(noteIds?: string[], userIds?: string[]): Promise<import("./opennotesClient.js").BulkScoringResponse>;
    /**
     * Run scoring job
     */
    runScoringJob(): Promise<import("./opennotesClient.js").BulkScoringResponse>;
}
export declare const requestorScoringService: RequestorScoringAdapter;
export declare const scoringService: ScoringAdapter;
//# sourceMappingURL=scoringAdapter.d.ts.map