/**
 * Tests for Scoring Adapter
 */

import { jest } from '@jest/globals';
import { RequestorScoringAdapter, ScoringAdapter } from '../scoringAdapter.js';
import {
  openNotesClient,
  setMockRequestorMetrics,
  setMockNoteScore,
  setMockUserScore,
  resetMocks
} from '../__mocks__/opennotesClient.js';

jest.mock('../opennotesClient.js');

describe('RequestorScoringAdapter', () => {
  let adapter: RequestorScoringAdapter;

  beforeEach(() => {
    resetMocks();
    adapter = new RequestorScoringAdapter();
  });

  describe('isUserEligibleForRequest', () => {
    it('should allow eligible users to make requests', async () => {
      setMockRequestorMetrics('user-1', {
        totalRequests: 2,
        helpfulnessLevel: 'reliable',
      });

      const result = await adapter.isUserEligibleForRequest('user-1', 'server-1');

      expect(result.eligible).toBe(true);
      expect(result.remainingRequests).toBe(3); // Assuming MAX_REQUESTS_PER_DAY is 5
    });

    it('should deny users who reached daily limit', async () => {
      setMockRequestorMetrics('user-2', {
        totalRequests: 5,
        helpfulnessLevel: 'reliable',
      });

      const result = await adapter.isUserEligibleForRequest('user-2', 'server-1');

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Daily request limit');
    });

    it('should limit newcomers appropriately', async () => {
      setMockRequestorMetrics('user-3', {
        totalRequests: 4,
        helpfulnessLevel: 'newcomer',
      });

      const result = await adapter.isUserEligibleForRequest('user-3', 'server-1');

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('New users limited to 3 requests');
    });

    it('should allow requests when service is unavailable', async () => {
      openNotesClient.shouldFailRequests = true;

      const result = await adapter.isUserEligibleForRequest('user-4', 'server-1');

      expect(result.eligible).toBe(true);
      expect(result.reason).toContain('Service temporarily unavailable');
    });
  });

  describe('trackEligibleRequest', () => {
    it('should submit request to external service', async () => {
      await adapter.trackEligibleRequest(
        'user-1',
        'msg-123',
        'Misleading information',
        ['https://example.com']
      );

      expect(openNotesClient.submitNoteCalls).toHaveLength(1);
      expect(openNotesClient.submitNoteCalls[0]).toMatchObject({
        noteId: 'request-msg-123-user-1',
        messageId: 'msg-123',
        authorId: 'user-1',
        content: 'Misleading information',
        classification: 'request',
      });
    });

    it('should handle submission failures gracefully', async () => {
      openNotesClient.shouldFailRequests = true;

      // Should not throw
      await expect(
        adapter.trackEligibleRequest('user-1', 'msg-123')
      ).resolves.toBeUndefined();
    });
  });

  describe('getRequestorMetrics', () => {
    it('should fetch metrics from external service', async () => {
      setMockRequestorMetrics('user-1', {
        score: 0.75,
        helpfulnessLevel: 'reliable',
      });

      const result = await adapter.getRequestorMetrics('user-1');

      expect(result.userId).toBe('user-1');
      expect(result.score).toBe(0.75);
      expect(result.helpfulnessLevel).toBe('reliable');
    });
  });

  describe('calculateRequestorHelpfulness', () => {
    it('should return formatted helpfulness data', async () => {
      setMockRequestorMetrics('user-1', {
        score: 0.8,
        helpfulnessLevel: 'highly_reliable',
        trustScore: 0.9,
        totalRequests: 20,
        helpfulRequests: 16,
        notHelpfulRequests: 2,
      });

      const result = await adapter.calculateRequestorHelpfulness('user-1');

      expect(result).toEqual({
        score: 0.8,
        level: 'highly_reliable',
        trustScore: 0.9,
        totalRequests: 20,
        helpfulRequests: 16,
        notHelpfulRequests: 2,
      });
    });

    it('should return null on error', async () => {
      openNotesClient.shouldFailRequests = true;

      const result = await adapter.calculateRequestorHelpfulness('user-1');

      expect(result).toBeNull();
    });
  });
});

describe('ScoringAdapter', () => {
  let adapter: ScoringAdapter;

  beforeEach(() => {
    resetMocks();
    adapter = new ScoringAdapter();
  });

  describe('calculateNoteScore', () => {
    it('should fetch note score from external service', async () => {
      setMockNoteScore('note-1', {
        score: 0.85,
        status: 'crh',
      });

      const result = await adapter.calculateNoteScore('note-1');

      expect(result.noteId).toBe('note-1');
      expect(result.score).toBe(0.85);
      expect(result.status).toBe('crh');
    });
  });

  describe('calculateUserScore', () => {
    it('should fetch user score from external service', async () => {
      setMockUserScore('user-1', {
        helpfulnessScore: 0.77,
        trustLevel: 'trusted',
      });

      const result = await adapter.calculateUserScore('user-1');

      expect(result.userId).toBe('user-1');
      expect(result.helpfulnessScore).toBe(0.77);
      expect(result.trustLevel).toBe('trusted');
    });
  });

  describe('submitRating', () => {
    it('should submit rating to external service', async () => {
      await adapter.submitRating({
        ratingId: 'rating-1',
        noteId: 'note-1',
        raterId: 'user-1',
        helpful: true,
        reason: 'Well-sourced',
      });

      expect(openNotesClient.submitRatingCalls).toHaveLength(1);
      expect(openNotesClient.submitRatingCalls[0]).toMatchObject({
        ratingId: 'rating-1',
        noteId: 'note-1',
        raterId: 'user-1',
        helpful: true,
        reason: 'Well-sourced',
      });
    });
  });

  describe('performBulkScoring', () => {
    it('should request bulk scoring from external service', async () => {
      setMockNoteScore('note-1', { score: 0.7 });
      setMockNoteScore('note-2', { score: 0.8 });
      setMockUserScore('user-1', { helpfulnessScore: 0.85 });

      const result = await adapter.performBulkScoring(
        ['note-1', 'note-2'],
        ['user-1']
      );

      expect(result.noteScores).toHaveLength(2);
      expect(result.userScores).toHaveLength(1);
      expect(openNotesClient.bulkScoreCalls).toHaveLength(1);
    });
  });

  describe('runScoringJob', () => {
    it('should trigger scoring run on external service', async () => {
      setMockNoteScore('note-1', { score: 0.75 });
      setMockUserScore('user-1', { helpfulnessScore: 0.8 });

      const result = await adapter.runScoringJob();

      expect(result).toHaveProperty('noteScores');
      expect(result).toHaveProperty('userScores');
      expect(result).toHaveProperty('processingTimeMs');
    });
  });
});