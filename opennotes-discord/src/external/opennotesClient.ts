/**
 * HTTP Client for External OpenNotes Service
 *
 * This client handles all communication with the external OpenNotes service
 * which is responsible for scoring calculations and data persistence.
 */

import { appConfig } from '../shared/config/index.js';
import { logger } from '../shared/utils/logger.js';

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

class OpenNotesClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  constructor() {
    this.baseUrl = appConfig.OPENNOTES_SERVICE_URL || 'http://localhost:4000';
    this.apiKey = appConfig.OPENNOTES_API_KEY;
    this.timeout = appConfig.OPENNOTES_TIMEOUT || 30000;
    this.retryAttempts = appConfig.OPENNOTES_RETRY_ATTEMPTS || 3;
    this.retryDelay = appConfig.OPENNOTES_RETRY_DELAY || 1000;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    let lastError: Error | null = null;

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
          throw new Error(
            `OpenNotes service error (${response.status}): ${errorText}`
          );
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error as Error;
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
  async submitNote(note: NoteSubmission): Promise<NoteScoreResponse> {
    logger.debug('Submitting note to OpenNotes service', { noteId: note.noteId });
    return this.makeRequest<NoteScoreResponse>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(note),
    });
  }

  /**
   * Submit a rating for a note
   */
  async submitRating(rating: RatingSubmission): Promise<void> {
    logger.debug('Submitting rating to OpenNotes service', {
      ratingId: rating.ratingId,
      noteId: rating.noteId,
    });
    await this.makeRequest<void>('/api/ratings', {
      method: 'POST',
      body: JSON.stringify(rating),
    });
  }

  /**
   * Get score for a specific note
   */
  async getNoteScore(noteId: string): Promise<NoteScoreResponse> {
    logger.debug('Fetching note score from OpenNotes service', { noteId });
    return this.makeRequest<NoteScoreResponse>(`/api/notes/${noteId}/score`);
  }

  /**
   * Get score for a specific user
   */
  async getUserScore(userId: string): Promise<UserScoreResponse> {
    logger.debug('Fetching user score from OpenNotes service', { userId });
    return this.makeRequest<UserScoreResponse>(`/api/users/${userId}/score`);
  }

  /**
   * Get requestor metrics for a user
   */
  async getRequestorMetrics(userId: string): Promise<RequestorMetricsResponse> {
    logger.debug('Fetching requestor metrics from OpenNotes service', { userId });
    return this.makeRequest<RequestorMetricsResponse>(
      `/api/users/${userId}/requestor-metrics`
    );
  }

  /**
   * Perform bulk scoring for multiple notes and/or users
   */
  async bulkScore(request: BulkScoringRequest): Promise<BulkScoringResponse> {
    logger.debug('Requesting bulk scoring from OpenNotes service', {
      noteCount: request.noteIds?.length || 0,
      userCount: request.userIds?.length || 0,
    });
    return this.makeRequest<BulkScoringResponse>('/api/scoring/bulk', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Trigger a full scoring recalculation
   */
  async triggerScoringRun(): Promise<BulkScoringResponse> {
    logger.info('Triggering scoring run on OpenNotes service');
    return this.makeRequest<BulkScoringResponse>('/api/scoring/run', {
      method: 'POST',
    });
  }

  /**
   * Check health status of the external service
   */
  async healthCheck(): Promise<ServiceHealthResponse> {
    try {
      return await this.makeRequest<ServiceHealthResponse>('/health');
    } catch (error) {
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
  async isAvailable(): Promise<boolean> {
    const health = await this.healthCheck();
    return health.status !== 'unhealthy';
  }
}

// Export singleton instance
export const openNotesClient = new OpenNotesClient();
export default openNotesClient;