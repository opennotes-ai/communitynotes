/**
 * HTTP Client for External OpenNotes Service
 *
 * This client handles all communication with the external OpenNotes service
 * which is responsible for scoring calculations and data persistence.
 */
import { appConfig } from '../shared/config/index.js';
import { logger } from '../shared/utils/logger.js';
class OpenNotesClient {
    baseUrl;
    apiKey;
    timeout;
    retryAttempts;
    retryDelay;
    constructor() {
        this.baseUrl = appConfig.OPENNOTES_SERVICE_URL || 'http://localhost:4000';
        this.apiKey = appConfig.OPENNOTES_API_KEY;
        this.timeout = appConfig.OPENNOTES_TIMEOUT || 30000;
        this.retryAttempts = appConfig.OPENNOTES_RETRY_ATTEMPTS || 3;
        this.retryDelay = appConfig.OPENNOTES_RETRY_DELAY || 1000;
    }
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (this.apiKey) {
            headers['X-API-Key'] = this.apiKey;
        }
        let lastError = null;
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);
                const response = await fetch(url, {
                    ...options,
                    headers,
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`OpenNotes service error (${response.status}): ${errorText}`);
                }
                const data = await response.json();
                return data;
            }
            catch (error) {
                lastError = error;
                logger.error(`OpenNotes service request failed (attempt ${attempt}/${this.retryAttempts})`, {
                    endpoint,
                    error: lastError.message,
                });
                if (attempt < this.retryAttempts) {
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                }
            }
        }
        throw lastError || new Error('Failed to connect to OpenNotes service');
    }
    /**
     * Submit a new note for scoring
     */
    async submitNote(note) {
        logger.debug('Submitting note to OpenNotes service', { noteId: note.noteId });
        return this.makeRequest('/api/notes', {
            method: 'POST',
            body: JSON.stringify(note),
        });
    }
    /**
     * Submit a rating for a note
     */
    async submitRating(rating) {
        logger.debug('Submitting rating to OpenNotes service', {
            ratingId: rating.ratingId,
            noteId: rating.noteId,
        });
        await this.makeRequest('/api/ratings', {
            method: 'POST',
            body: JSON.stringify(rating),
        });
    }
    /**
     * Get score for a specific note
     */
    async getNoteScore(noteId) {
        logger.debug('Fetching note score from OpenNotes service', { noteId });
        return this.makeRequest(`/api/notes/${noteId}/score`);
    }
    /**
     * Get score for a specific user
     */
    async getUserScore(userId) {
        logger.debug('Fetching user score from OpenNotes service', { userId });
        return this.makeRequest(`/api/users/${userId}/score`);
    }
    /**
     * Get requestor metrics for a user
     */
    async getRequestorMetrics(userId) {
        logger.debug('Fetching requestor metrics from OpenNotes service', { userId });
        return this.makeRequest(`/api/users/${userId}/requestor-metrics`);
    }
    /**
     * Perform bulk scoring for multiple notes and/or users
     */
    async bulkScore(request) {
        logger.debug('Requesting bulk scoring from OpenNotes service', {
            noteCount: request.noteIds?.length || 0,
            userCount: request.userIds?.length || 0,
        });
        return this.makeRequest('/api/scoring/bulk', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }
    /**
     * Trigger a full scoring recalculation
     */
    async triggerScoringRun() {
        logger.info('Triggering scoring run on OpenNotes service');
        return this.makeRequest('/api/scoring/run', {
            method: 'POST',
        });
    }
    /**
     * Check health status of the external service
     */
    async healthCheck() {
        try {
            return await this.makeRequest('/health');
        }
        catch (error) {
            logger.error('OpenNotes service health check failed', { error });
            return {
                status: 'unhealthy',
                version: 'unknown',
                uptime: 0,
            };
        }
    }
    /**
     * Check if the service is available
     */
    async isAvailable() {
        const health = await this.healthCheck();
        return health.status !== 'unhealthy';
    }
}
// Export singleton instance
export const openNotesClient = new OpenNotesClient();
export default openNotesClient;
//# sourceMappingURL=opennotesClient.js.map