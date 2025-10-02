/**
 * Mock implementation of OpenNotes Client for testing
 */
export const mockNoteScores = new Map();
export const mockUserScores = new Map();
export const mockRequestorMetrics = new Map();
// Default mock responses
export const defaultNoteScore = {
    noteId: 'test-note-1',
    score: 0.75,
    status: 'crh',
    confidence: 0.85,
    helpfulRatings: 15,
    notHelpfulRatings: 5,
    totalRatings: 20,
    helpfulnessRatio: 0.75,
};
export const defaultUserScore = {
    userId: 'test-user-1',
    helpfulnessScore: 0.82,
    trustLevel: 'trusted',
    successfulRatings: 45,
    unsuccessfulRatings: 8,
    agreementRatio: 0.85,
    aboveHelpfulnessThreshold: true,
};
export const defaultRequestorMetrics = {
    userId: 'test-user-1',
    totalRequests: 25,
    helpfulRequests: 18,
    notHelpfulRequests: 5,
    pendingRequests: 2,
    helpfulnessLevel: 'reliable',
    score: 0.72,
    trustScore: 0.80,
    recentActivityScore: 0.65,
};
export const defaultHealthResponse = {
    status: 'healthy',
    version: '1.0.0-mock',
    uptime: 86400000, // 24 hours in ms
    lastScoringRun: new Date(),
};
class MockOpenNotesClient {
    submitNoteCalls = [];
    submitRatingCalls = [];
    bulkScoreCalls = [];
    healthCheckCalls = 0;
    // Control mock behavior
    shouldFailHealthCheck = false;
    shouldFailRequests = false;
    requestDelay = 0;
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
    async delay() {
        if (this.requestDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.requestDelay));
        }
    }
    checkFailure() {
        if (this.shouldFailRequests) {
            throw new Error('Mock request failed');
        }
    }
    async submitNote(note) {
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
    async submitRating(rating) {
        await this.delay();
        this.checkFailure();
        this.submitRatingCalls.push(rating);
    }
    async getNoteScore(noteId) {
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
    async getUserScore(userId) {
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
    async getRequestorMetrics(userId) {
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
    async bulkScore(request) {
        await this.delay();
        this.checkFailure();
        this.bulkScoreCalls.push(request);
        const noteScores = [];
        const userScores = [];
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
    async triggerScoringRun() {
        await this.delay();
        this.checkFailure();
        return {
            noteScores: Array.from(mockNoteScores.values()),
            userScores: Array.from(mockUserScores.values()),
            timestamp: new Date(),
            processingTimeMs: 500,
        };
    }
    async healthCheck() {
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
    async isAvailable() {
        const health = await this.healthCheck();
        return health.status !== 'unhealthy';
    }
}
// Export mock instance
export const openNotesClient = new MockOpenNotesClient();
export default openNotesClient;
// Helper functions for tests
export function setMockNoteScore(noteId, score) {
    mockNoteScores.set(noteId, {
        ...defaultNoteScore,
        ...score,
        noteId,
    });
}
export function setMockUserScore(userId, score) {
    mockUserScores.set(userId, {
        ...defaultUserScore,
        ...score,
        userId,
    });
}
export function setMockRequestorMetrics(userId, metrics) {
    mockRequestorMetrics.set(userId, {
        ...defaultRequestorMetrics,
        ...metrics,
        userId,
    });
}
export function resetMocks() {
    openNotesClient.reset();
}
//# sourceMappingURL=opennotesClient.js.map