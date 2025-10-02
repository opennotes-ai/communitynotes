import { describe, it, expect, beforeEach } from '@jest/globals';
import { EmailVerificationProvider } from '../EmailProvider.js';

describe('EmailVerificationProvider', () => {
  let provider: EmailVerificationProvider;

  beforeEach(() => {
    provider = new EmailVerificationProvider();
  });

  describe('validateTarget', () => {
    it('should validate correct email addresses', () => {
      expect(provider.validateTarget('test@example.com')).toBe(true);
      expect(provider.validateTarget('user.name@domain.com')).toBe(true);
      expect(provider.validateTarget('user+tag@example.org')).toBe(true);
      expect(provider.validateTarget('first.last@sub.domain.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(provider.validateTarget('invalid')).toBe(false);
      expect(provider.validateTarget('invalid@')).toBe(false);
      expect(provider.validateTarget('@example.com')).toBe(false);
      expect(provider.validateTarget('test@')).toBe(false);
      expect(provider.validateTarget('test@.com')).toBe(false);
    });

    it('should accept simple domain emails', () => {
      expect(provider.validateTarget('test@com')).toBe(false);
      expect(provider.validateTarget('test@localhost')).toBe(false);
      expect(provider.validateTarget('test@example.co')).toBe(true);
    });

    it('should reject emails with spaces', () => {
      expect(provider.validateTarget('test @example.com')).toBe(false);
      expect(provider.validateTarget('test@ example.com')).toBe(false);
      expect(provider.validateTarget('test@example .com')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(provider.validateTarget('')).toBe(false);
      expect(provider.validateTarget(' ')).toBe(false);
      expect(provider.validateTarget('a@b.c')).toBe(true);
    });

    it('should accept email with numbers', () => {
      expect(provider.validateTarget('user123@example456.com')).toBe(true);
      expect(provider.validateTarget('123@456.com')).toBe(true);
    });

    it('should accept email with hyphens and underscores', () => {
      expect(provider.validateTarget('user-name@example.com')).toBe(true);
      expect(provider.validateTarget('user_name@example.com')).toBe(true);
      expect(provider.validateTarget('user.name@ex-ample.com')).toBe(true);
    });
  });

  describe('provider properties', () => {
    it('should have correct name', () => {
      expect(provider.name).toBe('email');
    });

    it('should have correct method', () => {
      expect(provider.method).toBe('email');
    });

    it('should have getCodeExpiry method', () => {
      expect(provider.getCodeExpiry()).toBe(15);
    });

    it('should have generateCode method', () => {
      const code = provider.generateCode();
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });
  });

  describe('email templates', () => {
    it('should generate text template with code', () => {
      const textTemplate = (provider as any).getTextTemplate('123456');
      expect(textTemplate).toContain('123456');
      expect(textTemplate).toContain('Open Notes');
      expect(textTemplate).toContain('verification');
      expect(textTemplate).toContain('15 minutes');
    });

    it('should generate HTML template with code', () => {
      const htmlTemplate = (provider as any).getEmailTemplate('123456');
      expect(htmlTemplate).toContain('123456');
      expect(htmlTemplate).toContain('Open Notes');
      expect(htmlTemplate).toContain('Verification');
      expect(htmlTemplate).toContain('<!DOCTYPE html>');
    });

    it('should generate HTML with proper structure', () => {
      const htmlTemplate = (provider as any).getEmailTemplate('654321');
      expect(htmlTemplate).toContain('<html>');
      expect(htmlTemplate).toContain('<body>');
      expect(htmlTemplate).toContain('</body>');
      expect(htmlTemplate).toContain('</html>');
    });

    it('should include expiry information in templates', () => {
      const textTemplate = (provider as any).getTextTemplate('111111');
      const htmlTemplate = (provider as any).getEmailTemplate('111111');

      expect(textTemplate).toContain('15 minutes');
      expect(htmlTemplate).toContain('15 minutes');
    });

    it('should include security warning in templates', () => {
      const textTemplate = (provider as any).getTextTemplate('222222');
      const htmlTemplate = (provider as any).getEmailTemplate('222222');

      expect(textTemplate.toLowerCase()).toContain('ignore');
      expect(htmlTemplate.toLowerCase()).toContain('ignore');
    });

    it('should accept custom template', () => {
      const customTemplate = '<html><body>Custom {{code}}</body></html>';
      const htmlTemplate = (provider as any).getEmailTemplate('123456', { template: customTemplate });
      expect(htmlTemplate).toBe(customTemplate);
    });

    it('should use default template when not specified', () => {
      const htmlTemplate1 = (provider as any).getEmailTemplate('123456');
      const htmlTemplate2 = (provider as any).getEmailTemplate('123456', { template: 'default' });
      expect(htmlTemplate1).toBe(htmlTemplate2);
    });
  });

  describe('text template formatting', () => {
    it('should trim whitespace from text template', () => {
      const textTemplate = (provider as any).getTextTemplate('999999');
      expect(textTemplate[0]).not.toBe(' ');
      expect(textTemplate[0]).not.toBe('\n');
      expect(textTemplate[textTemplate.length - 1]).not.toBe(' ');
      expect(textTemplate[textTemplate.length - 1]).not.toBe('\n');
    });

    it('should contain verification code prominently', () => {
      const textTemplate = (provider as any).getTextTemplate('888888');
      expect(textTemplate).toContain('888888');
      const codeIndex = textTemplate.indexOf('888888');
      expect(codeIndex).toBeGreaterThan(-1);
    });

    it('should include Discord mention', () => {
      const textTemplate = (provider as any).getTextTemplate('777777');
      expect(textTemplate.toLowerCase()).toContain('discord');
    });
  });

  describe('HTML template structure', () => {
    it('should have proper meta charset', () => {
      const htmlTemplate = (provider as any).getEmailTemplate('123456');
      expect(htmlTemplate).toContain('<meta charset="utf-8">');
    });

    it('should include CSS styling', () => {
      const htmlTemplate = (provider as any).getEmailTemplate('123456');
      expect(htmlTemplate).toContain('<style>');
      expect(htmlTemplate).toContain('</style>');
    });

    it('should have header section', () => {
      const htmlTemplate = (provider as any).getEmailTemplate('123456');
      expect(htmlTemplate).toContain('class="header"');
    });

    it('should have content section', () => {
      const htmlTemplate = (provider as any).getEmailTemplate('123456');
      expect(htmlTemplate).toContain('class="content"');
    });

    it('should have footer section', () => {
      const htmlTemplate = (provider as any).getEmailTemplate('123456');
      expect(htmlTemplate).toContain('class="footer"');
    });

    it('should display code prominently', () => {
      const htmlTemplate = (provider as any).getEmailTemplate('123456');
      expect(htmlTemplate).toContain('class="code"');
      expect(htmlTemplate).toContain('>123456<');
    });
  });
});
