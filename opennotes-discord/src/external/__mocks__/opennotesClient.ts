/**
 * Mock implementation of OpenNotes Client for testing
 */

import type {
  NoteSubmission,
  RatingSubmission,
  NoteScoreResponse,
  UserScoreResponse,
  RequestorMetricsResponse,
  BulkScoringRequest,
  BulkScoringResponse,
  ServiceHealthResponse
} from '../opennotesClient.js';

export const mockNoteScores: Map<string, NoteScoreResponse> = new Map();
export const mockUserScores: Map<string, UserScoreResponse> = new Map();
export const mockRequestorMetrics: Map<string, RequestorMetricsResponse> = new Map();

// Default mock responses
export const defaultNoteScore: NoteScoreResponse = {
  noteId: 'test-note-1',
  score: 0.75,
  status: 'crh',
  confidence: 0.85,
  helpfulRatings: 15,
  notHelpfulRatings: 5,
  totalRatings: 20,
  helpfulnessRatio: 0.75,
};

export const defaultUserScore: UserScoreResponse = {
  userId: 'test-user-1',
  helpfulnessScore: 0.82,
  trustLevel: 'trusted',
  successfulRatings: 45,
  unsuccessfulRatings: 8,
  agreementRatio: 0.85,
  aboveHelpfulnessThreshold: true,
};

export const defaultRequestorMetrics: RequestorMetricsResponse = {
  userId: 'test-user-1',
  totalRequests: 2,
  helpfulRequests: 18,
  notHelpfulRequests: 5,
  pendingRequests: 2,
  helpfulnessLevel: 'reliable',
  score: 0.75,
  trustScore: 0.80,
  recentActivityScore: 0.65,
};

export const defaultHealthResponse: ServiceHealthResponse = {
  status: 'healthy',
  version: '1.0.0-mock',
  uptime: 86400000, // 24 hours in ms
  lastScoringRun: new Date(),
};

class MockOpenNotesClient {
  public submitNoteCalls: NoteSubmission[] = [];
  public submitRatingCalls: RatingSubmission[] = [];
  public bulkScoreCalls: BulkScoringRequest[] = [];
  public healthCheckCalls: number = 0;

  // Control mock behavior
  public shouldFailHealthCheck = false;
  public shouldFailRequests = false;
  public requestDelay = 0;

  constructor() {
    this.reset();
  }

  reset() {
    this.submitNoteCalls = [];
    this.submitRatingCalls = [];
    this.bulkScoreCalls = [];
    this.healthCheckCalls = 0;
    this.shouldFailHealthCheck = false;
    this.shouldFailRequests = false;
    this.requestDelay = 0;

    // Reset mock data
    mockNoteScores.clear();
    mockUserScores.clear();
    mockRequestorMetrics.clear();
  }

  private async delay() {
    if (this.requestDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay));
    }
  }

  private checkFailure() {
    if (this.shouldFailRequests) {
      throw new Error('Mock request failed');
    }
  }

  async submitNote(note: NoteSubmission): Promise<NoteScoreResponse> {
    await this.delay();
    this.checkFailure();

    this.submitNoteCalls.push(note);

    const existing = mockNoteScores.get(note.noteId);
    if (existing) {
      return existing;
    }

    return {
      ...defaultNoteScore,
      noteId: note.noteId,
    };
  }

  async submitRating(rating: RatingSubmission): Promise<void> {
    await this.delay();
    this.checkFailure();

    this.submitRatingCalls.push(rating);
  }

  async getNoteScore(noteId: string): Promise<NoteScoreResponse> {
    await this.delay();
    this.checkFailure();

    const existing = mockNoteScores.get(noteId);
    if (existing) {
      return existing;
    }

    return {
      ...defaultNoteScore,
      noteId,
    };
  }

  async getUserScore(userId: string): Promise<UserScoreResponse> {
    await this.delay();
    this.checkFailure();

    const existing = mockUserScores.get(userId);
    if (existing) {
      return existing;
    }

    return {
      ...defaultUserScore,
      userId,
    };
  }

  async getRequestorMetrics(userId: string): Promise<RequestorMetricsResponse> {
    await this.delay();
    this.checkFailure();

    const existing = mockRequestorMetrics.get(userId);
    if (existing) {
      return existing;
    }

    return {
      ...defaultRequestorMetrics,
      userId,
    };
  }

  async bulkScore(request: BulkScoringRequest): Promise<BulkScoringResponse> {
    await this.delay();
    this.checkFailure();

    this.bulkScoreCalls.push(request);

    const noteScores: NoteScoreResponse[] = [];
    const userScores: UserScoreResponse[] = [];

    if (request.noteIds) {
      for (const noteId of request.noteIds) {
        const score = mockNoteScores.get(noteId) || {
          ...defaultNoteScore,
          noteId,
        };
        noteScores.push(score);
      }
    }

    if (request.userIds) {
      for (const userId of request.userIds) {
        const score = mockUserScores.get(userId) || {
          ...defaultUserScore,
          userId,
        };
        userScores.push(score);
      }
    }

    return {
      noteScores,
      userScores,
      timestamp: new Date(),
      processingTimeMs: 100,
    };
  }

  async triggerScoringRun(): Promise<BulkScoringResponse> {
    await this.delay();
    this.checkFailure();

    return {
      noteScores: Array.from(mockNoteScores.values()),
      userScores: Array.from(mockUserScores.values()),
      timestamp: new Date(),
      processingTimeMs: 500,
    };
  }

  async healthCheck(): Promise<ServiceHealthResponse> {
    await this.delay();

    this.healthCheckCalls++;

    if (this.shouldFailHealthCheck) {
      return {
        status: 'unhealthy',
        version: 'unknown',
        uptime: 0,
      };
    }

    return defaultHealthResponse;
  }

  async isAvailable(): Promise<boolean> {
    const health = await this.healthCheck();
    return health.status !== 'unhealthy';
  }
}

// Export mock instance
export const openNotesClient = new MockOpenNotesClient();
export default openNotesClient;

// Helper functions for tests
export function setMockNoteScore(noteId: string, score: Partial<NoteScoreResponse>) {
  mockNoteScores.set(noteId, {
    ...defaultNoteScore,
    ...score,
    noteId,
  });
}

export function setMockUserScore(userId: string, score: Partial<UserScoreResponse>) {
  mockUserScores.set(userId, {
    ...defaultUserScore,
    ...score,
    userId,
  });
}

export function setMockRequestorMetrics(userId: string, metrics: Partial<RequestorMetricsResponse>) {
  mockRequestorMetrics.set(userId, {
    ...defaultRequestorMetrics,
    ...metrics,
    userId,
  });
}

export function resetMocks() {
  openNotesClient.reset();
}