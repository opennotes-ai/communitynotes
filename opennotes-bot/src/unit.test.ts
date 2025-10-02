import { describe, it, expect } from '@jest/globals';

// Simple utility functions to test
export function calculateHelpfulnessRatio(helpful: number, notHelpful: number): number {
  const total = helpful + notHelpful;
  if (total === 0) return 0;
  return helpful / total;
}

export function determineContributorLevel(score: number): string {
  if (score >= 0.9) return 'expert';
  if (score >= 0.7) return 'trusted';
  if (score >= 0.5) return 'regular';
  return 'newcomer';
}

export function isRateLimited(requestCount: number, limit: number): boolean {
  return requestCount >= limit;
}

export function validateDiscordId(id: string): boolean {
  return /^\d{17,19}$/.test(id);
}

export function calculateNotePriority(
  helpfulCount: number,
  notHelpfulCount: number,
  timestamp: Date
): number {
  const ratio = calculateHelpfulnessRatio(helpfulCount, notHelpfulCount);
  const ageInHours = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
  const ageFactor = Math.max(0, 1 - ageInHours / 168); // Decay over a week
  return ratio * ageFactor;
}

export function formatUserTag(username: string, discriminator: string): string {
  return `${username}#${discriminator}`;
}

export function parseCommandArgs(content: string): { command: string; args: string[] } {
  const parts = content.trim().split(/\s+/);
  return {
    command: parts[0] || '',
    args: parts.slice(1),
  };
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/@everyone/g, '@‍everyone')
    .replace(/@here/g, '@‍here')
    .trim();
}

export function generateVerificationCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

describe('Utility Functions', () => {
  describe('calculateHelpfulnessRatio', () => {
    it('should calculate correct ratio', () => {
      expect(calculateHelpfulnessRatio(8, 2)).toBe(0.8);
      expect(calculateHelpfulnessRatio(5, 5)).toBe(0.5);
      expect(calculateHelpfulnessRatio(0, 10)).toBe(0);
    });

    it('should handle zero total', () => {
      expect(calculateHelpfulnessRatio(0, 0)).toBe(0);
    });
  });

  describe('determineContributorLevel', () => {
    it('should return correct levels', () => {
      expect(determineContributorLevel(0.95)).toBe('expert');
      expect(determineContributorLevel(0.75)).toBe('trusted');
      expect(determineContributorLevel(0.55)).toBe('regular');
      expect(determineContributorLevel(0.3)).toBe('newcomer');
    });

    it('should handle boundary values', () => {
      expect(determineContributorLevel(0.9)).toBe('expert');
      expect(determineContributorLevel(0.7)).toBe('trusted');
      expect(determineContributorLevel(0.5)).toBe('regular');
      expect(determineContributorLevel(0)).toBe('newcomer');
    });
  });

  describe('isRateLimited', () => {
    it('should check rate limits correctly', () => {
      expect(isRateLimited(5, 10)).toBe(false);
      expect(isRateLimited(10, 10)).toBe(true);
      expect(isRateLimited(15, 10)).toBe(true);
    });
  });

  describe('validateDiscordId', () => {
    it('should validate Discord IDs', () => {
      expect(validateDiscordId('123456789012345678')).toBe(true);
      expect(validateDiscordId('12345678901234567890')).toBe(false);
      expect(validateDiscordId('abc')).toBe(false);
      expect(validateDiscordId('')).toBe(false);
    });
  });

  describe('calculateNotePriority', () => {
    it('should calculate priority based on helpfulness and age', () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days old

      const newNotePriority = calculateNotePriority(8, 2, now);
      const oldNotePriority = calculateNotePriority(8, 2, oldDate);

      expect(newNotePriority).toBeGreaterThan(oldNotePriority);
      expect(newNotePriority).toBeCloseTo(0.8, 1);
    });

    it('should handle notes with no ratings', () => {
      const priority = calculateNotePriority(0, 0, new Date());
      expect(priority).toBe(0);
    });
  });

  describe('formatUserTag', () => {
    it('should format Discord user tags', () => {
      expect(formatUserTag('TestUser', '1234')).toBe('TestUser#1234');
      expect(formatUserTag('Another', '0001')).toBe('Another#0001');
    });
  });

  describe('parseCommandArgs', () => {
    it('should parse command and arguments', () => {
      const result1 = parseCommandArgs('!help');
      expect(result1.command).toBe('!help');
      expect(result1.args).toEqual([]);

      const result2 = parseCommandArgs('!note add This is a note');
      expect(result2.command).toBe('!note');
      expect(result2.args).toEqual(['add', 'This', 'is', 'a', 'note']);
    });

    it('should handle extra spaces', () => {
      const result = parseCommandArgs('  !command   arg1   arg2  ');
      expect(result.command).toBe('!command');
      expect(result.args).toEqual(['arg1', 'arg2']);
    });

    it('should handle empty input', () => {
      const result = parseCommandArgs('');
      expect(result.command).toBe('');
      expect(result.args).toEqual([]);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
      expect(sanitizeInput('Hello @everyone')).toBe('Hello @‍everyone');
      expect(sanitizeInput('Hey @here!')).toBe('Hey @‍here!');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
    });
  });

  describe('generateVerificationCode', () => {
    it('should generate 6-character codes', () => {
      const code = generateVerificationCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should generate different codes', () => {
      const codes = new Set();
      for (let i = 0; i < 10; i++) {
        codes.add(generateVerificationCode());
      }
      expect(codes.size).toBeGreaterThan(1);
    });
  });

  describe('isValidEmail', () => {
    it('should validate email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test @example.com')).toBe(false);
    });
  });
});

// Additional test for async functions
export async function fetchWithTimeout(
  promise: Promise<any>,
  timeout: number
): Promise<any> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Timeout')), timeout);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return result;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    throw error;
  }
}

describe('Async Functions', () => {
  describe('fetchWithTimeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('should resolve when promise completes before timeout', async () => {
      jest.useRealTimers(); // Use real timers for this test
      const promise = Promise.resolve('success');
      const result = await fetchWithTimeout(promise, 1000);
      expect(result).toBe('success');
    });

    it('should reject on timeout', async () => {
      // Create a promise that won't resolve within timeout
      let promiseResolve: any;
      const slowPromise = new Promise((resolve) => {
        promiseResolve = resolve;
        // Don't set a timer here, just keep the reference
      });

      const fetchPromise = fetchWithTimeout(slowPromise, 100);

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(100);

      await expect(fetchPromise).rejects.toThrow('Timeout');

      // Clean up by resolving the promise
      if (promiseResolve) {
        promiseResolve('cleanup');
      }
    });
  });
});