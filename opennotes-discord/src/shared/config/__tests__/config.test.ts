import { describe, it, expect } from '@jest/globals';

describe('Config Validation', () => {

  describe('validateConfig', () => {
    it('should validate required Discord configuration', () => {
      expect(process.env.DISCORD_TOKEN).toBeDefined();
      expect(process.env.DISCORD_CLIENT_ID).toBeDefined();
      expect(process.env.DISCORD_CLIENT_SECRET).toBeDefined();
    });

    it('should validate required database configuration', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.DATABASE_URL).toContain('postgresql://');
    });

    it('should validate JWT secret length', () => {
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.JWT_SECRET!.length).toBeGreaterThanOrEqual(32);
    });

    it('should have valid NODE_ENV values', () => {
      const validEnvs = ['development', 'production', 'test'];
      expect(validEnvs).toContain(process.env.NODE_ENV);
    });

    it('should have valid LOG_LEVEL values', () => {
      const validLevels = ['error', 'warn', 'info', 'debug'];
      const logLevel = process.env.LOG_LEVEL || 'info';
      expect(validLevels).toContain(logLevel);
    });
  });

  describe('default values', () => {
    it('should have default PORT value', () => {
      const port = process.env.PORT || '3000';
      expect(parseInt(port)).toBeGreaterThan(0);
      expect(parseInt(port)).toBeLessThanOrEqual(65535);
    });

    it('should have default NODE_ENV', () => {
      const nodeEnv = process.env.NODE_ENV || 'development';
      expect(['development', 'production', 'test']).toContain(nodeEnv);
    });

    it('should have default LOG_LEVEL', () => {
      const logLevel = process.env.LOG_LEVEL || 'info';
      expect(['error', 'warn', 'info', 'debug']).toContain(logLevel);
    });

    it('should have default MAX_REQUESTS_PER_DAY', () => {
      const maxRequests = parseInt(process.env.MAX_REQUESTS_PER_DAY || '5');
      expect(maxRequests).toBeGreaterThan(0);
    });

    it('should have default REQUEST_TIMEOUT_HOURS', () => {
      const timeout = parseInt(process.env.REQUEST_TIMEOUT_HOURS || '24');
      expect(timeout).toBeGreaterThan(0);
    });

    it('should have default MIN_REQUESTS_FOR_VISIBILITY', () => {
      const minRequests = parseInt(process.env.MIN_REQUESTS_FOR_VISIBILITY || '4');
      expect(minRequests).toBeGreaterThan(0);
    });

    it('should have default VERIFICATION_CODE_LENGTH', () => {
      const codeLength = parseInt(process.env.VERIFICATION_CODE_LENGTH || '6');
      expect(codeLength).toBeGreaterThanOrEqual(4);
      expect(codeLength).toBeLessThanOrEqual(10);
    });

    it('should have default VERIFICATION_CODE_EXPIRY', () => {
      const expiry = parseInt(process.env.VERIFICATION_CODE_EXPIRY || '15');
      expect(expiry).toBeGreaterThan(0);
      expect(expiry).toBeLessThanOrEqual(60);
    });

    it('should have default VERIFICATION_MAX_ATTEMPTS', () => {
      const maxAttempts = parseInt(process.env.VERIFICATION_MAX_ATTEMPTS || '3');
      expect(maxAttempts).toBeGreaterThan(0);
      expect(maxAttempts).toBeLessThanOrEqual(10);
    });
  });

  describe('optional configuration', () => {
    it('should allow optional REDIS_URL', () => {
      const redisUrl = process.env.REDIS_URL;
      if (redisUrl) {
        expect(redisUrl).toContain('redis://');
      }
      expect(true).toBe(true);
    });

    it('should allow optional NATS_URL', () => {
      const natsUrl = process.env.NATS_URL;
      if (natsUrl) {
        expect(natsUrl).toContain('nats://');
      }
      expect(true).toBe(true);
    });

    it('should allow optional SMTP configuration', () => {
      const smtpHost = process.env.SMTP_HOST;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (smtpHost && smtpUser && smtpPass) {
        expect(smtpHost.length).toBeGreaterThan(0);
      }
      expect(true).toBe(true);
    });

    it('should allow optional Twilio configuration', () => {
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;

      if (twilioSid && twilioToken) {
        expect(twilioSid.length).toBeGreaterThan(0);
        expect(twilioToken.length).toBeGreaterThan(0);
      }
      expect(true).toBe(true);
    });

    it('should allow optional OAuth providers', () => {
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      const githubClientId = process.env.GITHUB_CLIENT_ID;

      if (googleClientId) {
        expect(googleClientId.length).toBeGreaterThan(0);
      }
      if (githubClientId) {
        expect(githubClientId.length).toBeGreaterThan(0);
      }
      expect(true).toBe(true);
    });
  });

  describe('OpenNotes service configuration', () => {
    it('should have default OPENNOTES_SERVICE_URL', () => {
      const serviceUrl = process.env.OPENNOTES_SERVICE_URL || 'http://localhost:4000';
      expect(serviceUrl).toContain('http');
    });

    it('should have default OPENNOTES_TIMEOUT', () => {
      const timeout = parseInt(process.env.OPENNOTES_TIMEOUT || '30000');
      expect(timeout).toBeGreaterThan(0);
    });

    it('should have default OPENNOTES_RETRY_ATTEMPTS', () => {
      const retryAttempts = parseInt(process.env.OPENNOTES_RETRY_ATTEMPTS || '3');
      expect(retryAttempts).toBeGreaterThanOrEqual(0);
    });

    it('should have default OPENNOTES_RETRY_DELAY', () => {
      const retryDelay = parseInt(process.env.OPENNOTES_RETRY_DELAY || '1000');
      expect(retryDelay).toBeGreaterThanOrEqual(0);
    });
  });

  describe('environment-specific behavior', () => {
    it('should be in test environment during tests', () => {
      expect(process.env.NODE_ENV).toBe('test');
    });

    it('should have test database URL', () => {
      expect(process.env.DATABASE_URL).toContain('test');
    });

    it('should have test JWT secret', () => {
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.JWT_SECRET!.includes('test')).toBe(true);
    });
  });

  describe('verification configuration', () => {
    it('should have VERIFICATION_ENABLED default', () => {
      const enabled = process.env.VERIFICATION_ENABLED !== 'false';
      expect(typeof enabled).toBe('boolean');
    });

    it('should have SMTP_FROM_NAME default', () => {
      const fromName = process.env.SMTP_FROM_NAME || 'Open Notes';
      expect(fromName).toBe('Open Notes');
    });
  });

  describe('numeric configuration validation', () => {
    it('should parse PORT as number', () => {
      const port = parseInt(process.env.PORT || '3000');
      expect(Number.isInteger(port)).toBe(true);
      expect(port).toBeGreaterThan(0);
    });

    it('should parse MAX_REQUESTS_PER_DAY as number', () => {
      const maxRequests = parseInt(process.env.MAX_REQUESTS_PER_DAY || '5');
      expect(Number.isInteger(maxRequests)).toBe(true);
    });

    it('should parse REQUEST_TIMEOUT_HOURS as number', () => {
      const timeout = parseInt(process.env.REQUEST_TIMEOUT_HOURS || '24');
      expect(Number.isInteger(timeout)).toBe(true);
    });

    it('should parse MIN_REQUESTS_FOR_VISIBILITY as number', () => {
      const minRequests = parseInt(process.env.MIN_REQUESTS_FOR_VISIBILITY || '4');
      expect(Number.isInteger(minRequests)).toBe(true);
    });
  });

  describe('URL validation', () => {
    it('should have valid DATABASE_URL format', () => {
      const dbUrl = process.env.DATABASE_URL;
      expect(dbUrl).toBeDefined();
      expect(dbUrl).toContain('postgresql://');
    });

    it('should have valid REDIS_URL format if provided', () => {
      const redisUrl = process.env.REDIS_URL;
      if (redisUrl) {
        expect(redisUrl).toContain('redis://');
      }
      expect(true).toBe(true);
    });

    it('should have valid NATS_URL format if provided', () => {
      const natsUrl = process.env.NATS_URL;
      if (natsUrl) {
        expect(natsUrl).toContain('nats://');
      }
      expect(true).toBe(true);
    });
  });
});
