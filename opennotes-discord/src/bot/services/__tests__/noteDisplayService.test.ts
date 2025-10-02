import { describe, it, expect } from '@jest/globals';
import { NoteDisplayService } from '../noteDisplayService.js';
import { Colors } from 'discord.js';

describe('NoteDisplayService - Pure Utility Methods', () => {
  let service: NoteDisplayService;

  beforeEach(() => {
    service = new NoteDisplayService();
  });

  describe('calculateConfidenceScore', () => {
    it('should return zero confidence for no ratings', () => {
      const note = createMockNote({ totalRatings: 0, helpfulnessRatio: 0 });
      const result = (service as any).calculateConfidenceScore(note);
      expect(result.percentage).toBe(0);
      expect(result.label).toBe('No Data');
    });

    it('should calculate confidence with low ratings', () => {
      const note = createMockNote({ totalRatings: 2, helpfulnessRatio: 0.8 });
      const result = (service as any).calculateConfidenceScore(note);
      expect(result.percentage).toBeGreaterThan(0);
      expect(result.percentage).toBeLessThan(80);
    });

    it('should give higher confidence with more ratings', () => {
      const note1 = createMockNote({ totalRatings: 3, helpfulnessRatio: 0.8 });
      const note2 = createMockNote({ totalRatings: 10, helpfulnessRatio: 0.8 });

      const result1 = (service as any).calculateConfidenceScore(note1);
      const result2 = (service as any).calculateConfidenceScore(note2);

      expect(result2.percentage).toBeGreaterThanOrEqual(result1.percentage);
    });

    it('should label Very High confidence correctly', () => {
      const note = createMockNote({ totalRatings: 15, helpfulnessRatio: 1.0 });
      const result = (service as any).calculateConfidenceScore(note);
      expect(result.label).toBe('Very High');
      expect(result.percentage).toBeGreaterThanOrEqual(80);
    });

    it('should label High confidence correctly', () => {
      const note = createMockNote({ totalRatings: 10, helpfulnessRatio: 0.7 });
      const result = (service as any).calculateConfidenceScore(note);
      expect(result.percentage).toBeGreaterThanOrEqual(60);
      expect(result.percentage).toBeLessThan(80);
    });

    it('should label Low confidence correctly', () => {
      const note = createMockNote({ totalRatings: 2, helpfulnessRatio: 0.3 });
      const result = (service as any).calculateConfidenceScore(note);
      expect(result.percentage).toBeLessThan(40);
    });
  });

  describe('shouldAutoDisplayNote', () => {
    it('should return false if note is not visible', () => {
      const note = createMockNote({
        isVisible: false,
        status: 'crh',
        totalRatings: 5,
        helpfulnessRatio: 0.9
      });
      expect(service.shouldAutoDisplayNote(note)).toBe(false);
    });

    it('should return false if status is not crh', () => {
      const note = createMockNote({
        isVisible: true,
        status: 'pending',
        totalRatings: 5,
        helpfulnessRatio: 0.9
      });
      expect(service.shouldAutoDisplayNote(note)).toBe(false);
    });

    it('should return false if confidence is too low', () => {
      const note = createMockNote({
        isVisible: true,
        status: 'crh',
        totalRatings: 3,
        helpfulnessRatio: 0.5
      });
      expect(service.shouldAutoDisplayNote(note)).toBe(false);
    });

    it('should return false if not enough ratings', () => {
      const note = createMockNote({
        isVisible: true,
        status: 'crh',
        totalRatings: 2,
        helpfulnessRatio: 0.9
      });
      expect(service.shouldAutoDisplayNote(note)).toBe(false);
    });

    it('should return true for qualified note', () => {
      const note = createMockNote({
        isVisible: true,
        status: 'crh',
        totalRatings: 10,
        helpfulnessRatio: 0.9
      });
      expect(service.shouldAutoDisplayNote(note)).toBe(true);
    });
  });

  describe('createProgressBar', () => {
    it('should create empty progress bar for 0%', () => {
      const bar = (service as any).createProgressBar(0, 10);
      expect(bar).toBe('░░░░░░░░░░');
    });

    it('should create full progress bar for 100%', () => {
      const bar = (service as any).createProgressBar(100, 10);
      expect(bar).toBe('██████████');
    });

    it('should create half-filled progress bar for 50%', () => {
      const bar = (service as any).createProgressBar(50, 10);
      expect(bar).toBe('█████░░░░░');
    });

    it('should handle different lengths', () => {
      const bar5 = (service as any).createProgressBar(50, 5);
      expect(bar5).toBe('███░░');
      expect(bar5.length).toBe(5);
    });

    it('should round percentage correctly', () => {
      const bar = (service as any).createProgressBar(75, 10);
      expect(bar.match(/█/g)?.length).toBe(8);
    });
  });

  describe('formatClassification', () => {
    it('should format misleading classification', () => {
      const result = (service as any).formatClassification('misleading');
      expect(result).toBe('⚠️ Misleading Information');
    });

    it('should format lacking-context classification', () => {
      const result = (service as any).formatClassification('lacking-context');
      expect(result).toBe('📝 Lacks Important Context');
    });

    it('should format disputed classification', () => {
      const result = (service as any).formatClassification('disputed');
      expect(result).toBe('🔍 Disputed Claims');
    });

    it('should format unsubstantiated classification', () => {
      const result = (service as any).formatClassification('unsubstantiated');
      expect(result).toBe('❓ Unsubstantiated Claims');
    });

    it('should handle unknown classification', () => {
      const result = (service as any).formatClassification('unknown-type');
      expect(result).toBe('📋 unknown-type');
    });
  });

  describe('getStatusInfo', () => {
    it('should return info for pending status', () => {
      const info = (service as any).getStatusInfo('pending');
      expect(info.emoji).toBe('⏳');
      expect(info.label).toBe('Pending Review');
      expect(info.description).toContain('reviewed by the community');
    });

    it('should return info for crh status', () => {
      const info = (service as any).getStatusInfo('crh');
      expect(info.emoji).toBe('✅');
      expect(info.label).toBe('Currently Rated Helpful');
      expect(info.description).toContain('finds this note helpful');
    });

    it('should return info for nrh status', () => {
      const info = (service as any).getStatusInfo('nrh');
      expect(info.emoji).toBe('❌');
      expect(info.label).toBe('Not Rated Helpful');
      expect(info.description).toContain('does not find this note helpful');
    });

    it('should return info for needs-more-ratings status', () => {
      const info = (service as any).getStatusInfo('needs-more-ratings');
      expect(info.emoji).toBe('🤔');
      expect(info.label).toBe('Needs More Ratings');
      expect(info.description).toContain('needs more community input');
    });

    it('should return default info for unknown status', () => {
      const info = (service as any).getStatusInfo('unknown');
      expect(info.emoji).toBe('❓');
      expect(info.label).toBe('Unknown Status');
      expect(info.description).toContain('Status not recognized');
    });
  });

  describe('getNoteColor', () => {
    it('should return yellow for pending', () => {
      const color = (service as any).getNoteColor('pending');
      expect(color).toBe(Colors.Yellow);
    });

    it('should return green for crh', () => {
      const color = (service as any).getNoteColor('crh');
      expect(color).toBe(Colors.Green);
    });

    it('should return red for nrh', () => {
      const color = (service as any).getNoteColor('nrh');
      expect(color).toBe(Colors.Red);
    });

    it('should return orange for needs-more-ratings', () => {
      const color = (service as any).getNoteColor('needs-more-ratings');
      expect(color).toBe(Colors.Orange);
    });

    it('should return grey for unknown status', () => {
      const color = (service as any).getNoteColor('unknown-status');
      expect(color).toBe(Colors.Grey);
    });
  });
});

function createMockNote(overrides: any = {}) {
  return {
    id: 'note-1',
    messageId: 'msg-1',
    authorId: 'user-1',
    serverId: 'server-1',
    channelId: 'channel-1',
    content: 'Test note content',
    classification: 'misleading',
    status: 'pending',
    submittedAt: new Date(),
    isVisible: true,
    totalRatings: 0,
    helpfulCount: 0,
    notHelpfulCount: 0,
    helpfulnessRatio: 0,
    ratings: [],
    sources: [],
    ...overrides
  };
}
