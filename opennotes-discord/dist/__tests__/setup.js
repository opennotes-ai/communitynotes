/**
 * Jest setup file for configuring the test environment
 */
import { jest } from '@jest/globals';
// This is a setup file, it doesn't need tests
describe('Test setup', () => {
    it('should configure test environment', () => {
        expect(process.env.NODE_ENV).toBe('test');
    });
});
// Setup test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.DISCORD_TOKEN = 'test_token';
process.env.DISCORD_CLIENT_ID = 'test_client_id';
process.env.DISCORD_CLIENT_SECRET = 'test_client_secret';
process.env.JWT_SECRET = 'test_jwt_secret_that_is_at_least_32_characters_long';
process.env.NATS_URL = 'nats://localhost:4222';
process.env.ENCRYPTION_KEY = 'test_encryption_key_32_characters_long';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'test_password';
process.env.TWILIO_ACCOUNT_SID = 'test_twilio_sid';
process.env.TWILIO_AUTH_TOKEN = 'test_twilio_token';
process.env.TWILIO_PHONE_NUMBER = '+1234567890';
// Mock console methods in test environment to reduce noise
const originalConsole = { ...console };
beforeAll(() => {
    // Mock console methods but preserve them for debugging if needed
    global.console = {
        ...console,
        // Keep error and warn for test failures
        log: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        // Keep error and warn for important messages
        error: originalConsole.error,
        warn: originalConsole.warn,
    };
});
afterAll(() => {
    // Restore console
    global.console = originalConsole;
});
// Global test timeout
jest.setTimeout(10000);
// Mock timers setup
beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
});
afterEach(() => {
    // Clean up timers after each test
    jest.useRealTimers();
});
// Unhandled promise rejection handler for tests
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection in test:', error);
});
// Global error handler for tests
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception in test:', error);
});
// Add custom matchers
expect.extend({
    toBeWithinRange(received, floor, ceiling) {
        const pass = received >= floor && received <= ceiling;
        if (pass) {
            return {
                message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
                pass: false,
            };
        }
    },
    toBeValidDiscordId(received) {
        const pass = /^\d{17,19}$/.test(received);
        if (pass) {
            return {
                message: () => `expected ${received} not to be a valid Discord ID`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected ${received} to be a valid Discord ID`,
                pass: false,
            };
        }
    },
    toBeValidUUID(received) {
        const pass = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(received);
        if (pass) {
            return {
                message: () => `expected ${received} not to be a valid UUID`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected ${received} to be a valid UUID`,
                pass: false,
            };
        }
    },
});
//# sourceMappingURL=setup.js.map