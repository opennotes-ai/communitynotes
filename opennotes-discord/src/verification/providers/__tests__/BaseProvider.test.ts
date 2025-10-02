import { describe, it, expect, beforeEach } from '@jest/globals';
import { BaseVerificationProvider } from '../BaseProvider.js';
import { VerificationMethod } from '../../../shared/types/verification.js';

class TestProvider extends BaseVerificationProvider {
  readonly name = 'test-provider';
  readonly method: VerificationMethod = 'email';

  async sendVerification(target: string, code: string, data?: any): Promise<boolean> {
    return true;
  }

  validateTarget(target: string): boolean {
    return target.length > 0;
  }
}

describe('BaseVerificationProvider', () => {
  let provider: TestProvider;

  beforeEach(() => {
    provider = new TestProvider();
  });

  describe('generateCode', () => {
    it('should generate a 6-digit numeric code', () => {
      const code = provider.generateCode();
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it('should generate different codes on consecutive calls', () => {
      const code1 = provider.generateCode();
      const code2 = provider.generateCode();
      const code3 = provider.generateCode();

      const codes = new Set([code1, code2, code3]);
      expect(codes.size).toBeGreaterThan(1);
    });

    it('should only contain numeric characters', () => {
      for (let i = 0; i < 10; i++) {
        const code = provider.generateCode();
        expect(code).toMatch(/^[0-9]+$/);
      }
    });

    it('should not generate codes starting with 0', () => {
      const codes: string[] = [];
      for (let i = 0; i < 20; i++) {
        codes.push(provider.generateCode());
      }
      const startsWithZero = codes.some(code => code.startsWith('0'));
      expect(startsWithZero).toBe(true);
    });
  });

  describe('getCodeExpiry', () => {
    it('should return 15 minutes as default expiry', () => {
      const expiry = provider.getCodeExpiry();
      expect(expiry).toBe(15);
    });

    it('should return a positive number', () => {
      const expiry = provider.getCodeExpiry();
      expect(expiry).toBeGreaterThan(0);
    });
  });

  describe('maskTarget', () => {
    describe('email masking', () => {
      it('should mask short email addresses', () => {
        const masked = provider['maskTarget']('ab@example.com');
        expect(masked).toBe('ab@example.com');
      });

      it('should mask medium-length email addresses', () => {
        const masked = provider['maskTarget']('test@example.com');
        expect(masked).toBe('te**@example.com');
      });

      it('should mask long email addresses', () => {
        const masked = provider['maskTarget']('verylongemail@example.com');
        expect(masked).toBe('ve***********@example.com');
      });

      it('should preserve domain in masked emails', () => {
        const masked = provider['maskTarget']('john.doe@company.org');
        expect(masked).toContain('@company.org');
      });

      it('should handle email with multiple dots', () => {
        const masked = provider['maskTarget']('first.last@sub.example.com');
        expect(masked).toContain('@sub.example.com');
      });
    });

    describe('phone number masking', () => {
      it('should mask phone numbers in E.164 format', () => {
        const masked = provider['maskTarget']('+1234567890');
        expect(masked).toBe('+123*****90');
      });

      it('should mask longer international phone numbers', () => {
        const masked = provider['maskTarget']('+447911123456');
        expect(masked).toBe('+447*******56');
      });

      it('should preserve country code prefix', () => {
        const masked = provider['maskTarget']('+15551234567');
        expect(masked.startsWith('+155')).toBe(true);
      });

      it('should preserve last 2 digits', () => {
        const masked = provider['maskTarget']('+12345678901');
        expect(masked.endsWith('01')).toBe(true);
      });
    });

    describe('generic string masking', () => {
      it('should mask generic strings', () => {
        const masked = provider['maskTarget']('username123');
        expect(masked).toBe('us*******23');
      });

      it('should handle very short strings', () => {
        const masked = provider['maskTarget']('ab');
        expect(masked).toBe('ab');
      });

      it('should handle empty string', () => {
        const masked = provider['maskTarget']('');
        expect(masked).toBe('');
      });

      it('should mask OAuth provider IDs', () => {
        const masked = provider['maskTarget']('oauth_12345');
        expect(masked).toBe('oa*******45');
      });
    });

    describe('edge cases', () => {
      it('should handle single character', () => {
        const masked = provider['maskTarget']('a');
        expect(masked).toBe('a');
      });

      it('should handle strings with special characters', () => {
        const masked = provider['maskTarget']('user-name_123');
        expect(masked).toBe('us*********23');
      });

      it('should handle unicode characters', () => {
        const masked = provider['maskTarget']('用户名123');
        expect(masked).toBe('用户**23');
      });
    });
  });

  describe('provider properties', () => {
    it('should have a name property', () => {
      expect(provider.name).toBe('test-provider');
    });

    it('should have a method property', () => {
      expect(provider.method).toBe('email');
    });

    it('should implement validateTarget', () => {
      expect(provider.validateTarget('test')).toBe(true);
      expect(provider.validateTarget('')).toBe(false);
    });

    it('should implement sendVerification', async () => {
      const result = await provider.sendVerification('test@example.com', '123456');
      expect(result).toBe(true);
    });
  });
});
