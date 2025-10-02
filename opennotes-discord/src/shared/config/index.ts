import { z } from 'zod';
import { config } from 'dotenv';

config();

const configSchema = z.object({
  // Discord Configuration
  DISCORD_TOKEN: z.string().min(1, 'Discord token is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'Discord client ID is required'),
  DISCORD_CLIENT_SECRET: z.string().min(1, 'Discord client secret is required'),

  // Database Configuration
  DATABASE_URL: z.string().url('Valid database URL is required'),
  REDIS_URL: z.string().url('Valid Redis URL is required').optional(),
  NATS_URL: z.string().url('Valid NATS URL is required').optional(),

  // Server Configuration
  PORT: z.string().transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Security
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Open Notes
  MAX_REQUESTS_PER_DAY: z.string().transform(Number).default('5'),
  REQUEST_TIMEOUT_HOURS: z.string().transform(Number).default('24'),
  MIN_REQUESTS_FOR_VISIBILITY: z.string().transform(Number).default('4'),

  // Verification Configuration
  VERIFICATION_ENABLED: z.string().transform((val) => val === 'true').default('true'),
  VERIFICATION_CODE_LENGTH: z.string().transform(Number).default('6'),
  VERIFICATION_CODE_EXPIRY: z.string().transform(Number).default('15'),
  VERIFICATION_MAX_ATTEMPTS: z.string().transform(Number).default('3'),

  // Email Provider (SMTP)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_ADDRESS: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().default('Open Notes'),

  // Twilio (SMS Provider)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // External OpenNotes Service
  OPENNOTES_SERVICE_URL: z.string().url().default('http://localhost:4000'),
  OPENNOTES_API_KEY: z.string().optional(),
  OPENNOTES_TIMEOUT: z.string().transform(Number).default('30000'),
  OPENNOTES_RETRY_ATTEMPTS: z.string().transform(Number).default('3'),
  OPENNOTES_RETRY_DELAY: z.string().transform(Number).default('1000'),
});

type Config = z.infer<typeof configSchema>;

function validateConfig(): Config {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Configuration validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

export const appConfig = validateConfig();
export type { Config };