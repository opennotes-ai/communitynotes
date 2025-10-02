/**
 * Adapter to replace internal scoring with external OpenNotes service
 */
import { openNotesClient } from './opennotesClient.js';
import { logger } from '../shared/utils/logger.js';
import { appConfig } from '../shared/config/index.js';
export class RequestorScoringAdapter {
    /**
     * Check if a user is eligible to make a request
     */
    async isUserEligibleForRequest(userId, serverId) {
        try {
            const metrics = await openNotesClient.getRequestorMetrics(userId);
            // Check daily request limit
            const maxRequests = appConfig.MAX_REQUESTS_PER_DAY;
            if (metrics.totalRequests >= maxRequests) {
                return {
                    eligible: false,
                    reason: `Daily request limit (${maxRequests}) reached`,
                    remainingRequests: 0,
                };
            }
            // Check trust level
            if (metrics.helpfulnessLevel === 'newcomer' && metrics.totalRequests > 3) {
                return {
                    eligible: false,
                    reason: 'New users limited to 3 requests until some are marked helpful',
                    remainingRequests: 0,
                };
            }
            return {
                eligible: true,
                remainingRequests: maxRequests - metrics.totalRequests,
            };
        }
        catch (error) {
            logger.error('Failed to check user eligibility', { userId, error });
            // Default to allowing request if service is unavailable
            return {
                eligible: true,
                reason: 'Service temporarily unavailable, allowing request',
                remainingRequests: appConfig.MAX_REQUESTS_PER_DAY,
            };
        }
    }
    /**
     * Track that an eligible request was made
     */
    async trackEligibleRequest(userId, messageId, reason, sources) {
        try {
            // Submit the request data to external service
            await openNotesClient.submitNote({
                noteId: `request-${messageId}-${userId}`,
                messageId,
                authorId: userId,
                content: reason || '',
                classification: 'request',
                submittedAt: new Date(),
            });
        }
        catch (error) {
            logger.error('Failed to track eligible request', {
                userId,
                messageId,
                error,
            });
        }
    }
    /**
     * Determine if requests should be shown for a message
     */
    async shouldShowRequests(messageId) {
        try {
            // For now, use simple threshold logic
            // In future, this could query the external service for more sophisticated logic
            const minRequests = appConfig.MIN_REQUESTS_FOR_VISIBILITY;
            return true; // Simplified for now - actual logic would check request count
        }
        catch (error) {
            logger.error('Failed to check if requests should be shown', {
                messageId,
                error,
            });
            return false;
        }
    }
    /**
     * Get requestor metrics
     */
    async getRequestorMetrics(userId) {
        return openNotesClient.getRequestorMetrics(userId);
    }
    /**
     * Calculate requestor helpfulness
     */
    async calculateRequestorHelpfulness(userId) {
        try {
            const metrics = await openNotesClient.getRequestorMetrics(userId);
            return {
                score: metrics.score,
                level: metrics.helpfulnessLevel,
                trustScore: metrics.trustScore,
                totalRequests: metrics.totalRequests,
                helpfulRequests: metrics.helpfulRequests,
                notHelpfulRequests: metrics.notHelpfulRequests,
            };
        }
        catch (error) {
            logger.error('Failed to calculate requestor helpfulness', {
                userId,
                error,
            });
            return null;
        }
    }
}
export class ScoringAdapter {
    /**
     * Calculate note scores using external service
     */
    async calculateNoteScore(noteId) {
        try {
            return await openNotesClient.getNoteScore(noteId);
        }
        catch (error) {
            logger.error('Failed to calculate note score', { noteId, error });
            throw error;
        }
    }
    /**
     * Calculate user scores using external service
     */
    async calculateUserScore(userId) {
        try {
            return await openNotesClient.getUserScore(userId);
        }
        catch (error) {
            logger.error('Failed to calculate user score', { userId, error });
            throw error;
        }
    }
    /**
     * Submit a rating
     */
    async submitRating(rating) {
        try {
            await openNotesClient.submitRating({
                ...rating,
                timestamp: new Date(),
            });
        }
        catch (error) {
            logger.error('Failed to submit rating', { rating, error });
            throw error;
        }
    }
    /**
     * Perform bulk scoring
     */
    async performBulkScoring(noteIds, userIds) {
        try {
            return await openNotesClient.bulkScore({
                noteIds,
                userIds,
                includeRatings: true,
            });
        }
        catch (error) {
            logger.error('Failed to perform bulk scoring', {
                noteCount: noteIds?.length,
                userCount: userIds?.length,
                error,
            });
            throw error;
        }
    }
    /**
     * Run scoring job
     */
    async runScoringJob() {
        try {
            const result = await openNotesClient.triggerScoringRun();
            logger.info('Scoring job completed', {
                noteCount: result.noteScores.length,
                userCount: result.userScores.length,
                processingTimeMs: result.processingTimeMs,
            });
            return result;
        }
        catch (error) {
            logger.error('Failed to run scoring job', { error });
            throw error;
        }
    }
}
// Export singleton instances
export const requestorScoringService = new RequestorScoringAdapter();
export const scoringService = new ScoringAdapter();
//# sourceMappingURL=scoringAdapter.js.map