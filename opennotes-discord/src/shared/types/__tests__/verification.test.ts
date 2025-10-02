import { describe, it, expect } from '@jest/globals';
import {
  VerificationMethodSchema,
  VerificationStatusSchema,
  UserVerificationSchema,
  StartVerificationRequestSchema,
  CompleteVerificationRequestSchema,
  VerificationResponseSchema,
  RateLimitConfigSchema,
  EmailVerificationDataSchema,
  PhoneVerificationDataSchema,
  OAuthVerificationDataSchema,
  UserPermissionsSchema,
  VerifiedUserSchema,
  SecurityEventSchema,
  VerificationConfigSchema,
} from '../verification.js';

describe('Verification Type Schemas', () => {
  describe('VerificationMethodSchema', () => {
    it('should accept valid verification methods', () => {
      expect(VerificationMethodSchema.parse('email')).toBe('email');
      expect(VerificationMethodSchema.parse('phone')).toBe('phone');
      expect(VerificationMethodSchema.parse('oauth')).toBe('oauth');
    });

    it('should reject invalid methods', () => {
      expect(() => VerificationMethodSchema.parse('invalid')).toThrow();
      expect(() => VerificationMethodSchema.parse('sms')).toThrow();
      expect(() => VerificationMethodSchema.parse('')).toThrow();
    });
  });

  describe('VerificationStatusSchema', () => {
    it('should accept valid statuses', () => {
      expect(VerificationStatusSchema.parse('pending')).toBe('pending');
      expect(VerificationStatusSchema.parse('verified')).toBe('verified');
      expect(VerificationStatusSchema.parse('failed')).toBe('failed');
      expect(VerificationStatusSchema.parse('expired')).toBe('expired');
      expect(VerificationStatusSchema.parse('blocked')).toBe('blocked');
    });

    it('should reject invalid statuses', () => {
      expect(() => VerificationStatusSchema.parse('invalid')).toThrow();
      expect(() => VerificationStatusSchema.parse('success')).toThrow();
    });
  });

  describe('StartVerificationRequestSchema', () => {
    it('should validate correct start verification request', () => {
      const validRequest = {
        discordUserId: '123456789',
        method: 'email',
        target: 'test@example.com',
      };
      expect(() => StartVerificationRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should require discordUserId', () => {
      const invalidRequest = {
        method: 'email',
        target: 'test@example.com',
      };
      expect(() => StartVerificationRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should require method', () => {
      const invalidRequest = {
        discordUserId: '123456789',
        target: 'test@example.com',
      };
      expect(() => StartVerificationRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should require target', () => {
      const invalidRequest = {
        discordUserId: '123456789',
        method: 'email',
      };
      expect(() => StartVerificationRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should accept optional metadata', () => {
      const validRequest = {
        discordUserId: '123456789',
        method: 'email',
        target: 'test@example.com',
        metadata: { custom: 'data' },
      };
      expect(() => StartVerificationRequestSchema.parse(validRequest)).not.toThrow();
    });
  });

  describe('CompleteVerificationRequestSchema', () => {
    it('should validate correct complete verification request', () => {
      const validRequest = {
        discordUserId: '123456789',
        verificationId: 'verify-123',
        code: '123456',
      };
      expect(() => CompleteVerificationRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should require all fields', () => {
      expect(() => CompleteVerificationRequestSchema.parse({})).toThrow();
    });

    it('should reject empty strings', () => {
      const invalidRequest = {
        discordUserId: '',
        verificationId: 'verify-123',
        code: '123456',
      };
      expect(() => CompleteVerificationRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('EmailVerificationDataSchema', () => {
    it('should validate correct email data', () => {
      const validData = {
        emailAddress: 'test@example.com',
      };
      expect(() => EmailVerificationDataSchema.parse(validData)).not.toThrow();
    });

    it('should apply default subject', () => {
      const data = EmailVerificationDataSchema.parse({
        emailAddress: 'test@example.com',
      });
      expect(data.subject).toBe('Verify your account');
    });

    it('should apply default template', () => {
      const data = EmailVerificationDataSchema.parse({
        emailAddress: 'test@example.com',
      });
      expect(data.template).toBe('default');
    });

    it('should reject invalid email', () => {
      const invalidData = {
        emailAddress: 'not-an-email',
      };
      expect(() => EmailVerificationDataSchema.parse(invalidData)).toThrow();
    });
  });

  describe('PhoneVerificationDataSchema', () => {
    it('should validate correct E.164 phone numbers', () => {
      const validData = {
        phoneNumber: '+1234567890',
      };
      expect(() => PhoneVerificationDataSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid phone formats', () => {
      const invalidData = {
        phoneNumber: '1234567890',
      };
      expect(() => PhoneVerificationDataSchema.parse(invalidData)).toThrow();
    });

    it('should accept optional carrier', () => {
      const validData = {
        phoneNumber: '+1234567890',
        carrier: 'Verizon',
      };
      expect(() => PhoneVerificationDataSchema.parse(validData)).not.toThrow();
    });

    it('should validate country code length', () => {
      const invalidData = {
        phoneNumber: '+1234567890',
        countryCode: 'USA',
      };
      expect(() => PhoneVerificationDataSchema.parse(invalidData)).toThrow();
    });

    it('should accept valid country code', () => {
      const validData = {
        phoneNumber: '+1234567890',
        countryCode: 'US',
      };
      expect(() => PhoneVerificationDataSchema.parse(validData)).not.toThrow();
    });
  });

  describe('OAuthVerificationDataSchema', () => {
    it('should validate OAuth data', () => {
      const validData = {
        provider: 'google',
        accessToken: 'token123',
        profile: { id: '123', name: 'John' },
      };
      expect(() => OAuthVerificationDataSchema.parse(validData)).not.toThrow();
    });

    it('should accept valid providers', () => {
      expect(() => OAuthVerificationDataSchema.parse({
        provider: 'google',
        accessToken: 'token',
        profile: {},
      })).not.toThrow();

      expect(() => OAuthVerificationDataSchema.parse({
        provider: 'github',
        accessToken: 'token',
        profile: {},
      })).not.toThrow();

      expect(() => OAuthVerificationDataSchema.parse({
        provider: 'microsoft',
        accessToken: 'token',
        profile: {},
      })).not.toThrow();
    });

    it('should reject invalid providers', () => {
      expect(() => OAuthVerificationDataSchema.parse({
        provider: 'facebook',
        accessToken: 'token',
        profile: {},
      })).toThrow();
    });

    it('should accept optional refresh token', () => {
      const validData = {
        provider: 'google',
        accessToken: 'access123',
        refreshToken: 'refresh456',
        profile: {},
      };
      expect(() => OAuthVerificationDataSchema.parse(validData)).not.toThrow();
    });
  });

  describe('UserPermissionsSchema', () => {
    it('should apply default values', () => {
      const permissions = UserPermissionsSchema.parse({});
      expect(permissions.canRequestNotes).toBe(false);
      expect(permissions.canCreateNotes).toBe(false);
      expect(permissions.canRateNotes).toBe(false);
      expect(permissions.isModerator).toBe(false);
      expect(permissions.isVerified).toBe(false);
      expect(permissions.verificationLevel).toBe('none');
    });

    it('should accept custom values', () => {
      const permissions = UserPermissionsSchema.parse({
        canRequestNotes: true,
        isVerified: true,
        verificationLevel: 'enhanced',
      });
      expect(permissions.canRequestNotes).toBe(true);
      expect(permissions.isVerified).toBe(true);
      expect(permissions.verificationLevel).toBe('enhanced');
    });

    it('should validate verification levels', () => {
      expect(() => UserPermissionsSchema.parse({
        verificationLevel: 'invalid',
      })).toThrow();
    });
  });

  describe('RateLimitConfigSchema', () => {
    it('should apply default values', () => {
      const config = RateLimitConfigSchema.parse({});
      expect(config.maxAttempts).toBe(3);
      expect(config.windowMinutes).toBe(60);
      expect(config.blockDurationMinutes).toBe(60);
      expect(config.maxVerificationsPerDay).toBe(5);
    });

    it('should accept custom values', () => {
      const config = RateLimitConfigSchema.parse({
        maxAttempts: 5,
        windowMinutes: 30,
      });
      expect(config.maxAttempts).toBe(5);
      expect(config.windowMinutes).toBe(30);
    });
  });

  describe('SecurityEventSchema', () => {
    it('should validate security event', () => {
      const validEvent = {
        id: 'event-123',
        discordUserId: '123456789',
        eventType: 'verification_attempt',
        details: { ip: '192.168.1.1' },
        severity: 'low',
        timestamp: new Date(),
      };
      expect(() => SecurityEventSchema.parse(validEvent)).not.toThrow();
    });

    it('should accept all event types', () => {
      const eventTypes = ['verification_attempt', 'rate_limit_hit', 'suspicious_activity', 'account_blocked'];

      eventTypes.forEach(eventType => {
        const event = {
          id: 'event-123',
          discordUserId: '123456789',
          eventType,
          details: {},
          severity: 'low',
          timestamp: new Date(),
        };
        expect(() => SecurityEventSchema.parse(event)).not.toThrow();
      });
    });

    it('should accept all severity levels', () => {
      const severities = ['low', 'medium', 'high', 'critical'];

      severities.forEach(severity => {
        const event = {
          id: 'event-123',
          discordUserId: '123456789',
          eventType: 'verification_attempt',
          details: {},
          severity,
          timestamp: new Date(),
        };
        expect(() => SecurityEventSchema.parse(event)).not.toThrow();
      });
    });

    it('should accept optional IP and user agent', () => {
      const event = {
        id: 'event-123',
        discordUserId: '123456789',
        eventType: 'verification_attempt',
        details: {},
        severity: 'low',
        timestamp: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };
      expect(() => SecurityEventSchema.parse(event)).not.toThrow();
    });
  });

  describe('VerificationResponseSchema', () => {
    it('should validate minimal response', () => {
      const response = {
        success: true,
        message: 'Verification sent',
      };
      expect(() => VerificationResponseSchema.parse(response)).not.toThrow();
    });

    it('should accept optional fields', () => {
      const response = {
        success: false,
        message: 'Rate limited',
        canRetry: true,
        retryAfter: new Date(),
      };
      expect(() => VerificationResponseSchema.parse(response)).not.toThrow();
    });
  });
});
