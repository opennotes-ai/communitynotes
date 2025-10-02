import { describe, it, expect, beforeEach } from '@jest/globals';
import { RateLimitService } from '../RateLimitService.js';

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeEach(() => {
    service = new RateLimitService();
  });

  describe('checkRateLimit', () => {
    it('should allow first request', async () => {
      const result = await service.checkRateLimit('user1', 'general');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should allow multiple requests within limit', async () => {
      await service.checkRateLimit('user2', 'general');
      await service.checkRateLimit('user2', 'general');
      const result = await service.checkRateLimit('user2', 'general');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should block after exceeding rate limit for general', async () => {
      for (let i = 0; i < 5; i++) {
        await service.checkRateLimit('user3', 'general');
      }
      const result = await service.checkRateLimit('user3', 'general');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
    });

    it('should maintain separate limits per user', async () => {
      for (let i = 0; i < 5; i++) {
        await service.checkRateLimit('userA', 'general');
      }
      const resultA = await service.checkRateLimit('userA', 'general');
      const resultB = await service.checkRateLimit('userB', 'general');

      expect(resultA.allowed).toBe(false);
      expect(resultB.allowed).toBe(true);
    });

    it('should maintain separate limits per action', async () => {
      for (let i = 0; i < 3; i++) {
        await service.checkRateLimit('user4', 'verification_start');
      }
      const resultStart = await service.checkRateLimit('user4', 'verification_start');
      const resultComplete = await service.checkRateLimit('user4', 'verification_complete');

      expect(resultStart.allowed).toBe(false);
      expect(resultComplete.allowed).toBe(true);
    });

    it('should enforce verification_start limit of 3 attempts', async () => {
      await service.checkRateLimit('user5', 'verification_start');
      await service.checkRateLimit('user5', 'verification_start');
      await service.checkRateLimit('user5', 'verification_start');
      const result = await service.checkRateLimit('user5', 'verification_start');
      expect(result.allowed).toBe(false);
    });

    it('should enforce verification_complete limit of 10 attempts', async () => {
      for (let i = 0; i < 10; i++) {
        await service.checkRateLimit('user6', 'verification_complete');
      }
      const result = await service.checkRateLimit('user6', 'verification_complete');
      expect(result.allowed).toBe(false);
    });

    it('should provide retry after timestamp when blocked', async () => {
      for (let i = 0; i < 5; i++) {
        await service.checkRateLimit('user7', 'general');
      }
      const result = await service.checkRateLimit('user7', 'general');
      expect(result.retryAfter).toBeInstanceOf(Date);
      expect(result.retryAfter!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should provide remaining count for allowed requests', async () => {
      await service.checkRateLimit('user8', 'general');
      const result = await service.checkRateLimit('user8', 'general');
      expect(result.remaining).toBe(3);
    });

    it('should decrement remaining count with each request', async () => {
      const result1 = await service.checkRateLimit('user9', 'general');
      const result2 = await service.checkRateLimit('user9', 'general');
      const result3 = await service.checkRateLimit('user9', 'general');

      expect(result1.remaining).toBe(4);
      expect(result2.remaining).toBe(3);
      expect(result3.remaining).toBe(2);
    });
  });

  describe('resetUserLimits', () => {
    it('should reset limit for specific action', async () => {
      for (let i = 0; i < 5; i++) {
        await service.checkRateLimit('user11', 'general');
      }
      await service.resetUserLimits('user11', 'general');
      const result = await service.checkRateLimit('user11', 'general');
      expect(result.allowed).toBe(true);
    });

    it('should not affect other actions when resetting specific action', async () => {
      for (let i = 0; i < 3; i++) {
        await service.checkRateLimit('user12', 'verification_start');
      }
      for (let i = 0; i < 10; i++) {
        await service.checkRateLimit('user12', 'verification_complete');
      }

      await service.resetUserLimits('user12', 'verification_start');

      const resultStart = await service.checkRateLimit('user12', 'verification_start');
      const resultComplete = await service.checkRateLimit('user12', 'verification_complete');

      expect(resultStart.allowed).toBe(true);
      expect(resultComplete.allowed).toBe(false);
    });

    it('should reset all limits when no action specified', async () => {
      for (let i = 0; i < 5; i++) {
        await service.checkRateLimit('user13', 'general');
      }
      for (let i = 0; i < 3; i++) {
        await service.checkRateLimit('user13', 'verification_start');
      }

      await service.resetUserLimits('user13');

      const resultGeneral = await service.checkRateLimit('user13', 'general');
      const resultVerification = await service.checkRateLimit('user13', 'verification_start');

      expect(resultGeneral.allowed).toBe(true);
      expect(resultVerification.allowed).toBe(true);
    });
  });

  describe('getRemainingAttempts', () => {
    it('should return max attempts for new user', async () => {
      const remaining = await service.getRemainingAttempts('newUser', 'general');
      expect(remaining).toBe(5);
    });

    it('should return correct remaining attempts', async () => {
      await service.checkRateLimit('user14', 'general');
      await service.checkRateLimit('user14', 'general');

      const remaining = await service.getRemainingAttempts('user14', 'general');
      expect(remaining).toBe(3);
    });

    it('should return 0 when limit exhausted', async () => {
      for (let i = 0; i < 5; i++) {
        await service.checkRateLimit('user15', 'general');
      }

      const remaining = await service.getRemainingAttempts('user15', 'general');
      expect(remaining).toBe(0);
    });

    it('should return different max attempts for different actions', async () => {
      const generalMax = await service.getRemainingAttempts('user16', 'general');
      const verificationMax = await service.getRemainingAttempts('user16', 'verification_start');
      const completeMax = await service.getRemainingAttempts('user16', 'verification_complete');

      expect(generalMax).toBe(5);
      expect(verificationMax).toBe(3);
      expect(completeMax).toBe(10);
    });
  });

  describe('getBlockStatus', () => {
    it('should return not blocked for new user', async () => {
      const status = await service.getBlockStatus('user17', 'general');
      expect(status.isBlocked).toBe(false);
      expect(status.blockedUntil).toBeUndefined();
    });

    it('should return blocked status when user exceeds limit', async () => {
      for (let i = 0; i < 5; i++) {
        await service.checkRateLimit('user18', 'general');
      }
      await service.checkRateLimit('user18', 'general');

      const status = await service.getBlockStatus('user18', 'general');
      expect(status.isBlocked).toBe(true);
      expect(status.blockedUntil).toBeInstanceOf(Date);
      expect(status.blockedUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return not blocked for different action', async () => {
      for (let i = 0; i < 5; i++) {
        await service.checkRateLimit('user19', 'general');
      }
      await service.checkRateLimit('user19', 'general');

      const statusGeneral = await service.getBlockStatus('user19', 'general');
      const statusVerification = await service.getBlockStatus('user19', 'verification_start');

      expect(statusGeneral.isBlocked).toBe(true);
      expect(statusVerification.isBlocked).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should not throw error when called', () => {
      expect(() => service.cleanup()).not.toThrow();
    });

    it('should be callable multiple times', () => {
      service.cleanup();
      service.cleanup();
      service.cleanup();
    });
  });
});
