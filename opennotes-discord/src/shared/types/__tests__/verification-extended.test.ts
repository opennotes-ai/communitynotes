import { describe, it, expect } from '@jest/globals';
import {
  UserVerificationSchema,
  VerifiedUserSchema,
  VerificationConfigSchema,
} from '../verification.js';

describe('Extended Verification Schemas', () => {
  describe('UserVerificationSchema', () => {
    it('should validate complete user verification object', () => {
      const verification = {
        id: 'verify-123',
        discordUserId: '123456789',
        method: 'email',
        status: 'pending',
        verificationCode: '123456',
        verificationTarget: 'test@example.com',
        verificationData: { custom: 'data' },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 900000),
        verifiedAt: null,
        attemptCount: 0,
        maxAttempts: 3,
        isBlocked: false,
        blockedUntil: null,
      };
      expect(() => UserVerificationSchema.parse(verification)).not.toThrow();
    });

    it('should apply default attemptCount', () => {
      const verification = UserVerificationSchema.parse({
        id: 'verify-123',
        discordUserId: '123456789',
        method: 'email',
        status: 'pending',
        verificationCode: '123456',
        verificationTarget: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
        verifiedAt: null,
        blockedUntil: null,
      });
      expect(verification.attemptCount).toBe(0);
      expect(verification.maxAttempts).toBe(3);
      expect(verification.isBlocked).toBe(false);
    });

    it('should accept null verificationCode', () => {
      const verification = {
        id: 'verify-123',
        discordUserId: '123456789',
        method: 'oauth',
        status: 'verified',
        verificationCode: null,
        verificationTarget: 'oauth-id-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
        verifiedAt: new Date(),
        blockedUntil: null,
      };
      expect(() => UserVerificationSchema.parse(verification)).not.toThrow();
    });

    it('should accept verification data', () => {
      const verification = {
        id: 'verify-123',
        discordUserId: '123456789',
        method: 'email',
        status: 'pending',
        verificationCode: '123456',
        verificationTarget: 'test@example.com',
        verificationData: {
          emailAddress: 'test@example.com',
          subject: 'Verify',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
        verifiedAt: null,
        blockedUntil: null,
      };
      expect(() => UserVerificationSchema.parse(verification)).not.toThrow();
    });

    it('should track attempt count', () => {
      const verification = {
        id: 'verify-123',
        discordUserId: '123456789',
        method: 'email',
        status: 'failed',
        verificationCode: '123456',
        verificationTarget: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
        verifiedAt: null,
        attemptCount: 2,
        blockedUntil: null,
      };
      const result = UserVerificationSchema.parse(verification);
      expect(result.attemptCount).toBe(2);
    });

    it('should handle blocked state', () => {
      const verification = {
        id: 'verify-123',
        discordUserId: '123456789',
        method: 'email',
        status: 'blocked',
        verificationCode: '123456',
        verificationTarget: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
        verifiedAt: null,
        isBlocked: true,
        blockedUntil: new Date(Date.now() + 3600000),
      };
      const result = UserVerificationSchema.parse(verification);
      expect(result.isBlocked).toBe(true);
      expect(result.blockedUntil).toBeInstanceOf(Date);
    });
  });

  describe('VerifiedUserSchema', () => {
    it('should validate verified user with defaults', () => {
      const user = {
        discordUserId: '123456789',
        isVerified: false,
        verificationMethod: null,
        verifiedAt: null,
        permissions: {},
        lastActivity: null,
      };
      const result = VerifiedUserSchema.parse(user);
      expect(result.trustScore).toBe(0);
      expect(result.verificationHistory).toEqual([]);
    });

    it('should validate verified user', () => {
      const user = {
        discordUserId: '123456789',
        isVerified: true,
        verificationMethod: 'email',
        verifiedAt: new Date(),
        permissions: {
          canRequestNotes: true,
          canCreateNotes: true,
          canRateNotes: true,
          isModerator: false,
          isVerified: true,
          verificationLevel: 'basic',
        },
        verificationHistory: [],
        lastActivity: new Date(),
        trustScore: 75,
      };
      expect(() => VerifiedUserSchema.parse(user)).not.toThrow();
    });

    it('should enforce trust score range', () => {
      const user = {
        discordUserId: '123456789',
        isVerified: true,
        verificationMethod: 'email',
        verifiedAt: new Date(),
        permissions: {},
        lastActivity: new Date(),
        trustScore: 101,
      };
      expect(() => VerifiedUserSchema.parse(user)).toThrow();
    });

    it('should accept trust score 0-100', () => {
      const user = {
        discordUserId: '123456789',
        isVerified: true,
        verificationMethod: 'email',
        verifiedAt: new Date(),
        permissions: {},
        lastActivity: new Date(),
        trustScore: 50,
      };
      const result = VerifiedUserSchema.parse(user);
      expect(result.trustScore).toBe(50);
    });

    it('should accept verification history', () => {
      const verification = {
        id: 'verify-123',
        discordUserId: '123456789',
        method: 'email' as const,
        status: 'verified' as const,
        verificationCode: null,
        verificationTarget: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
        verifiedAt: new Date(),
        blockedUntil: null,
      };

      const user = {
        discordUserId: '123456789',
        isVerified: true,
        verificationMethod: 'email' as const,
        verifiedAt: new Date(),
        permissions: {},
        verificationHistory: [verification],
        lastActivity: new Date(),
        trustScore: 80,
      };
      const result = VerifiedUserSchema.parse(user);
      expect(result.verificationHistory).toHaveLength(1);
    });
  });

  describe('VerificationConfigSchema', () => {
    it('should apply comprehensive defaults', () => {
      const config = VerificationConfigSchema.parse({
        rateLimiting: {},
        providers: {},
      });
      expect(config.enabled).toBe(true);
      expect(config.enabledMethods).toEqual(['email']);
      expect(config.codeLength).toBe(6);
      expect(config.codeExpiry).toBe(15);
      expect(config.maxAttemptsPerCode).toBe(3);
      expect(config.requireVerificationForNotes).toBe(true);
      expect(config.autoGrantPermissions).toBe(true);
    });

    it('should validate code length range', () => {
      expect(() => VerificationConfigSchema.parse({
        codeLength: 3,
      })).toThrow();

      expect(() => VerificationConfigSchema.parse({
        codeLength: 11,
      })).toThrow();
    });

    it('should accept valid code lengths', () => {
      const config = VerificationConfigSchema.parse({
        codeLength: 8,
        rateLimiting: {},
        providers: {},
      });
      expect(config.codeLength).toBe(8);
    });

    it('should validate code expiry range', () => {
      expect(() => VerificationConfigSchema.parse({
        codeExpiry: 3,
      })).toThrow();

      expect(() => VerificationConfigSchema.parse({
        codeExpiry: 65,
      })).toThrow();
    });

    it('should accept valid code expiry', () => {
      const config = VerificationConfigSchema.parse({
        codeExpiry: 30,
        rateLimiting: {},
        providers: {},
      });
      expect(config.codeExpiry).toBe(30);
    });

    it('should validate max attempts range', () => {
      expect(() => VerificationConfigSchema.parse({
        maxAttemptsPerCode: 0,
      })).toThrow();

      expect(() => VerificationConfigSchema.parse({
        maxAttemptsPerCode: 11,
      })).toThrow();
    });

    it('should configure enabled methods', () => {
      const config = VerificationConfigSchema.parse({
        enabledMethods: ['email', 'phone', 'oauth'],
        rateLimiting: {},
        providers: {},
      });
      expect(config.enabledMethods).toHaveLength(3);
      expect(config.enabledMethods).toContain('email');
      expect(config.enabledMethods).toContain('phone');
      expect(config.enabledMethods).toContain('oauth');
    });

    it('should configure email provider', () => {
      const config = VerificationConfigSchema.parse({
        rateLimiting: {},
        providers: {
          email: {
            enabled: true,
            smtpHost: 'smtp.example.com',
            smtpPort: 587,
            smtpUser: 'user@example.com',
            smtpPass: 'password',
            fromAddress: 'noreply@example.com',
            fromName: 'Test Service',
          },
        },
      });
      expect(config.providers.email?.enabled).toBe(true);
      expect(config.providers.email?.smtpHost).toBe('smtp.example.com');
    });

    it('should configure phone provider', () => {
      const config = VerificationConfigSchema.parse({
        rateLimiting: {},
        providers: {
          phone: {
            enabled: true,
            twilioAccountSid: 'AC123',
            twilioAuthToken: 'token123',
            twilioPhoneNumber: '+1234567890',
          },
        },
      });
      expect(config.providers.phone?.enabled).toBe(true);
      expect(config.providers.phone?.twilioAccountSid).toBe('AC123');
    });

    it('should configure oauth provider', () => {
      const config = VerificationConfigSchema.parse({
        rateLimiting: {},
        providers: {
          oauth: {
            enabled: true,
            providers: ['google', 'github'],
          },
        },
      });
      expect(config.providers.oauth?.enabled).toBe(true);
      expect(config.providers.oauth?.providers).toHaveLength(2);
    });

    it('should include rate limiting config', () => {
      const config = VerificationConfigSchema.parse({
        providers: {},
        rateLimiting: {
          maxAttempts: 5,
          windowMinutes: 30,
          blockDurationMinutes: 120,
          maxVerificationsPerDay: 10,
        },
      });
      expect(config.rateLimiting.maxAttempts).toBe(5);
      expect(config.rateLimiting.windowMinutes).toBe(30);
      expect(config.rateLimiting.blockDurationMinutes).toBe(120);
      expect(config.rateLimiting.maxVerificationsPerDay).toBe(10);
    });

    it('should toggle verification requirement', () => {
      const config1 = VerificationConfigSchema.parse({
        requireVerificationForNotes: true,
        rateLimiting: {},
        providers: {},
      });
      expect(config1.requireVerificationForNotes).toBe(true);

      const config2 = VerificationConfigSchema.parse({
        requireVerificationForNotes: false,
        rateLimiting: {},
        providers: {},
      });
      expect(config2.requireVerificationForNotes).toBe(false);
    });

    it('should toggle auto-grant permissions', () => {
      const config1 = VerificationConfigSchema.parse({
        autoGrantPermissions: true,
        rateLimiting: {},
        providers: {},
      });
      expect(config1.autoGrantPermissions).toBe(true);

      const config2 = VerificationConfigSchema.parse({
        autoGrantPermissions: false,
        rateLimiting: {},
        providers: {},
      });
      expect(config2.autoGrantPermissions).toBe(false);
    });
  });
});
