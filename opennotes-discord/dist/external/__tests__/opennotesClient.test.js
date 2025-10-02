/**
 * Tests for OpenNotes Client
 */
import { jest } from '@jest/globals';
import { openNotesClient, setMockNoteScore, setMockUserScore, setMockRequestorMetrics, resetMocks, defaultNoteScore, defaultUserScore, } from '../__mocks__/opennotesClient.js';
// Tell Jest to use the mock
jest.mock('../opennotesClient.js');
describe('OpenNotesClient', () => {
    beforeEach(() => {
        resetMocks();
    });
    describe('submitNote', () => {
        it('should submit a note and return default score', async () => {
            const note = {
                noteId: 'test-note-1',
                messageId: 'msg-123',
                authorId: 'user-456',
                content: 'This is a test note',
                classification: 'helpful',
                submittedAt: new Date(),
            };
            const result = await openNotesClient.submitNote(note);
            expect(result).toMatchObject({
                noteId: 'test-note-1',
                score: defaultNoteScore.score,
                status: defaultNoteScore.status,
            });
            expect(openNotesClient.submitNoteCalls).toHaveLength(1);
            expect(openNotesClient.submitNoteCalls[0]).toEqual(note);
        });
        it('should return custom score when set', async () => {
            setMockNoteScore('custom-note', {
                score: 0.95,
                status: 'crh',
                confidence: 0.99,
            });
            const result = await openNotesClient.getNoteScore('custom-note');
            expect(result.noteId).toBe('custom-note');
            expect(result.score).toBe(0.95);
            expect(result.status).toBe('crh');
            expect(result.confidence).toBe(0.99);
        });
        it('should handle failures when configured', async () => {
            openNotesClient.shouldFailRequests = true;
            await expect(openNotesClient.submitNote({
                noteId: 'fail-note',
                messageId: 'msg-123',
                authorId: 'user-456',
                content: 'This should fail',
                classification: 'test',
                submittedAt: new Date(),
            })).rejects.toThrow('Mock request failed');
        });
    });
    describe('submitRating', () => {
        it('should submit a rating successfully', async () => {
            const rating = {
                ratingId: 'rating-1',
                noteId: 'note-1',
                raterId: 'user-1',
                helpful: true,
                reason: 'Accurate information',
                timestamp: new Date(),
            };
            await openNotesClient.submitRating(rating);
            expect(openNotesClient.submitRatingCalls).toHaveLength(1);
            expect(openNotesClient.submitRatingCalls[0]).toEqual(rating);
        });
    });
    describe('getUserScore', () => {
        it('should return default user score', async () => {
            const result = await openNotesClient.getUserScore('test-user');
            expect(result).toMatchObject({
                userId: 'test-user',
                helpfulnessScore: defaultUserScore.helpfulnessScore,
                trustLevel: defaultUserScore.trustLevel,
            });
        });
        it('should return custom user score when set', async () => {
            setMockUserScore('custom-user', {
                helpfulnessScore: 0.45,
                trustLevel: 'newcomer',
                successfulRatings: 2,
            });
            const result = await openNotesClient.getUserScore('custom-user');
            expect(result.userId).toBe('custom-user');
            expect(result.helpfulnessScore).toBe(0.45);
            expect(result.trustLevel).toBe('newcomer');
            expect(result.successfulRatings).toBe(2);
        });
    });
    describe('getRequestorMetrics', () => {
        it('should return requestor metrics', async () => {
            setMockRequestorMetrics('user-123', {
                totalRequests: 10,
                helpfulRequests: 7,
                helpfulnessLevel: 'reliable',
            });
            const result = await openNotesClient.getRequestorMetrics('user-123');
            expect(result.userId).toBe('user-123');
            expect(result.totalRequests).toBe(10);
            expect(result.helpfulRequests).toBe(7);
            expect(result.helpfulnessLevel).toBe('reliable');
        });
    });
    describe('bulkScore', () => {
        it('should process bulk scoring request', async () => {
            setMockNoteScore('note-1', { score: 0.8 });
            setMockNoteScore('note-2', { score: 0.6 });
            setMockUserScore('user-1', { helpfulnessScore: 0.9 });
            const result = await openNotesClient.bulkScore({
                noteIds: ['note-1', 'note-2'],
                userIds: ['user-1'],
                includeRatings: true,
            });
            expect(result.noteScores).toHaveLength(2);
            expect(result.userScores).toHaveLength(1);
            expect(result.noteScores[0].score).toBe(0.8);
            expect(result.noteScores[1].score).toBe(0.6);
            expect(result.userScores[0].helpfulnessScore).toBe(0.9);
            expect(openNotesClient.bulkScoreCalls).toHaveLength(1);
        });
    });
    describe('healthCheck', () => {
        it('should return healthy status', async () => {
            const result = await openNotesClient.healthCheck();
            expect(result.status).toBe('healthy');
            expect(result.version).toBe('1.0.0-mock');
            expect(openNotesClient.healthCheckCalls).toBe(1);
        });
        it('should return unhealthy status when configured', async () => {
            openNotesClient.shouldFailHealthCheck = true;
            const result = await openNotesClient.healthCheck();
            expect(result.status).toBe('unhealthy');
            expect(result.version).toBe('unknown');
        });
    });
    describe('isAvailable', () => {
        it('should return true when service is healthy', async () => {
            const result = await openNotesClient.isAvailable();
            expect(result).toBe(true);
        });
        it('should return false when service is unhealthy', async () => {
            openNotesClient.shouldFailHealthCheck = true;
            const result = await openNotesClient.isAvailable();
            expect(result).toBe(false);
        });
    });
    describe('request delay', () => {
        it('should simulate network delay', async () => {
            openNotesClient.requestDelay = 100;
            const startTime = Date.now();
            await openNotesClient.getNoteScore('test-note');
            const elapsed = Date.now() - startTime;
            expect(elapsed).toBeGreaterThanOrEqual(100);
        });
    });
});
//# sourceMappingURL=opennotesClient.test.js.map