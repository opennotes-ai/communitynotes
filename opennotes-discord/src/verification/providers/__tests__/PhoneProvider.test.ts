import { describe, it, expect, beforeEach } from '@jest/globals';
import { PhoneVerificationProvider } from '../PhoneProvider.js';

describe('PhoneVerificationProvider', () => {
  let provider: PhoneVerificationProvider;

  beforeEach(() => {
    provider = new PhoneVerificationProvider();
  });

  describe('validateTarget', () => {
    it('should validate correct E.164 phone numbers', () => {
      expect(provider.validateTarget('+1234567890')).toBe(true);
      expect(provider.validateTarget('+447911123456')).toBe(true);
      expect(provider.validateTarget('+861234567890')).toBe(true);
      expect(provider.validateTarget('+33123456789')).toBe(true);
    });

    it('should validate various country codes', () => {
      expect(provider.validateTarget('+12025551234')).toBe(true);
      expect(provider.validateTarget('+442071234567')).toBe(true);
      expect(provider.validateTarget('+81901234567')).toBe(true);
      expect(provider.validateTarget('+61412345678')).toBe(true);
    });

    it('should reject numbers without plus sign', () => {
      expect(provider.validateTarget('1234567890')).toBe(false);
      expect(provider.validateTarget('447911123456')).toBe(false);
    });

    it('should reject numbers starting with +0', () => {
      expect(provider.validateTarget('+0123456789')).toBe(false);
      expect(provider.validateTarget('+01234567890')).toBe(false);
    });

    it('should reject numbers that are too short', () => {
      expect(provider.validateTarget('+1')).toBe(false);
      expect(provider.validateTarget('+12')).toBe(true);
      expect(provider.validateTarget('+123')).toBe(true);
    });

    it('should reject numbers that are too long', () => {
      expect(provider.validateTarget('+123456789012345678')).toBe(false);
      expect(provider.validateTarget('+12345678901234567')).toBe(false);
      expect(provider.validateTarget('+1234567890123456')).toBe(false);
      expect(provider.validateTarget('+123456789012345')).toBe(true);
    });

    it('should reject numbers with spaces', () => {
      expect(provider.validateTarget('+1 234 567 890')).toBe(false);
      expect(provider.validateTarget('+44 79 1112 3456')).toBe(false);
    });

    it('should reject numbers with dashes or parentheses', () => {
      expect(provider.validateTarget('+1-234-567-890')).toBe(false);
      expect(provider.validateTarget('+1(234)567890')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(provider.validateTarget('')).toBe(false);
      expect(provider.validateTarget('+')).toBe(false);
      expect(provider.validateTarget('+a123456789')).toBe(false);
    });

    it('should reject numbers with letters', () => {
      expect(provider.validateTarget('+1ABC2345678')).toBe(false);
      expect(provider.validateTarget('+44CALL1234')).toBe(false);
    });

    it('should validate minimum length E.164', () => {
      expect(provider.validateTarget('+12')).toBe(true);
      expect(provider.validateTarget('+1')).toBe(false);
    });

    it('should validate maximum length E.164', () => {
      expect(provider.validateTarget('+123456789012345')).toBe(true);
      expect(provider.validateTarget('+1234567890123456')).toBe(false);
    });
  });

  describe('provider properties', () => {
    it('should have correct name', () => {
      expect(provider.name).toBe('phone');
    });

    it('should have correct method', () => {
      expect(provider.method).toBe('phone');
    });

    it('should have getCodeExpiry method returning 15 minutes', () => {
      expect(provider.getCodeExpiry()).toBe(15);
    });

    it('should have generateCode method', () => {
      const code = provider.generateCode();
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });
  });

  describe('SMS templates', () => {
    it('should generate default SMS template with code', () => {
      const smsTemplate = (provider as any).getSMSTemplate('123456');
      expect(smsTemplate).toContain('123456');
      expect(smsTemplate).toContain('Open Notes');
      expect(smsTemplate).toContain('verification');
    });

    it('should include expiry information', () => {
      const smsTemplate = (provider as any).getSMSTemplate('654321');
      expect(smsTemplate).toContain('15 minutes');
    });

    it('should include security warning', () => {
      const smsTemplate = (provider as any).getSMSTemplate('111111');
      expect(smsTemplate.toLowerCase()).toContain('ignore');
    });

    it('should be concise for SMS limits', () => {
      const smsTemplate = (provider as any).getSMSTemplate('999999');
      expect(smsTemplate.length).toBeLessThan(200);
    });

    it('should accept custom template with code placeholder', () => {
      const customTemplate = 'Your code is {{code}}. Valid for 10 minutes.';
      const smsTemplate = (provider as any).getSMSTemplate('123456', { template: customTemplate });
      expect(smsTemplate).toBe('Your code is 123456. Valid for 10 minutes.');
    });

    it('should use default template when not specified', () => {
      const smsTemplate1 = (provider as any).getSMSTemplate('123456');
      const smsTemplate2 = (provider as any).getSMSTemplate('123456', { template: 'default' });
      expect(smsTemplate1).toBe(smsTemplate2);
    });

    it('should replace {{code}} placeholder in custom template', () => {
      const customTemplate = 'Code: {{code}}';
      const smsTemplate = (provider as any).getSMSTemplate('888888', { template: customTemplate });
      expect(smsTemplate).toBe('Code: 888888');
      expect(smsTemplate).not.toContain('{{code}}');
    });
  });

  describe('SMS template content', () => {
    it('should start with verification code info', () => {
      const smsTemplate = (provider as any).getSMSTemplate('555555');
      expect(smsTemplate).toContain('555555');
    });

    it('should not contain HTML or special formatting', () => {
      const smsTemplate = (provider as any).getSMSTemplate('777777');
      expect(smsTemplate).not.toContain('<');
      expect(smsTemplate).not.toContain('>');
      expect(smsTemplate).not.toContain('</');
    });

    it('should use plain text only', () => {
      const smsTemplate = (provider as any).getSMSTemplate('444444');
      expect(smsTemplate).not.toContain('<html>');
      expect(smsTemplate).not.toContain('<body>');
      expect(smsTemplate).not.toContain('<div>');
    });
  });

  describe('code expiry', () => {
    it('should return consistent expiry time', () => {
      const expiry1 = provider.getCodeExpiry();
      const expiry2 = provider.getCodeExpiry();
      expect(expiry1).toBe(expiry2);
      expect(expiry1).toBe(15);
    });

    it('should return positive number for expiry', () => {
      const expiry = provider.getCodeExpiry();
      expect(expiry).toBeGreaterThan(0);
    });
  });
});
