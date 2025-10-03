import { jest } from '@jest/globals';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env.test') });

const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'NATS_URL',
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_TEST_GUILD_ID',
  'DISCORD_TEST_USER_ID',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(
      `Missing required environment variable: ${varName}. ` +
      `Please create a .env.test file based on .env.test.example`
    );
  }
}

process.env.NODE_ENV = 'test';

jest.setTimeout(60000);

const originalConsole = { ...console };

beforeAll(() => {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    error: originalConsole.error,
    warn: originalConsole.warn,
  };
});

afterAll(() => {
  global.console = originalConsole;
});

beforeEach(() => {
  jest.clearAllMocks();
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection in integration test:', error);
  throw error;
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in integration test:', error);
  throw error;
});

export {};
