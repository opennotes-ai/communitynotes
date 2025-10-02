import { z } from 'zod';

// Verification method types
export const VerificationMethodSchema = z.enum(['email', 'phone', 'oauth']);
export type VerificationMethod = z.infer<typeof VerificationMethodSchema>;

// Verification status types
export const VerificationStatusSchema = z.enum([
  'pending',
  'verified',
  'failed',
  'expired',
  'blocked'
]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

// User verification record
export const UserVerificationSchema = z.object({
  id: z.string(),
  discordUserId: z.string(),
  method: VerificationMethodSchema,
  status: VerificationStatusSchema,
  verificationCode: z.string().nullable(),
  verificationTarget: z.string(), // email address, phone number, etc.
  verificationData: z.record(z.any()).optional(), // additional method-specific data
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date(),
  verifiedAt: z.date().nullable(),
  attemptCount: z.number().default(0),
  maxAttempts: z.number().default(3),
  isBlocked: z.boolean().default(false),
  blockedUntil: z.date().nullable(),
});

export type UserVerification = z.infer<typeof UserVerificationSchema>;

// Verification request schemas
export const StartVerificationRequestSchema = z.object({
  discordUserId: z.string().min(1),
  method: VerificationMethodSchema,
  target: z.string().min(1), // email or phone number
  metadata: z.record(z.any()).optional(),
});

export type StartVerificationRequest = z.infer<typeof StartVerificationRequestSchema>;

export const CompleteVerificationRequestSchema = z.object({
  discordUserId: z.string().min(1),
  verificationId: z.string().min(1),
  code: z.string().min(1),
});

export type CompleteVerificationRequest = z.infer<typeof CompleteVerificationRequestSchema>;

// Verification response schemas
export const VerificationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  verificationId: z.string().optional(),
  status: VerificationStatusSchema.optional(),
  expiresAt: z.date().optional(),
  canRetry: z.boolean().optional(),
  retryAfter: z.date().optional(),
});

export type VerificationResponse = z.infer<typeof VerificationResponseSchema>;

// Rate limiting schemas
export const RateLimitConfigSchema = z.object({
  maxAttempts: z.number().default(3),
  windowMinutes: z.number().default(60),
  blockDurationMinutes: z.number().default(60),
  maxVerificationsPerDay: z.number().default(5),
});

export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;

// Email verification specific
export const EmailVerificationDataSchema = z.object({
  emailAddress: z.string().email(),
  subject: z.string().default('Verify your account'),
  template: z.string().default('default'),
});

export type EmailVerificationData = z.infer<typeof EmailVerificationDataSchema>;

// Phone verification specific
export const PhoneVerificationDataSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/), // E.164 format
  carrier: z.string().optional(),
  countryCode: z.string().length(2).optional(),
});

export type PhoneVerificationData = z.infer<typeof PhoneVerificationDataSchema>;

// OAuth verification specific
export const OAuthVerificationDataSchema = z.object({
  provider: z.enum(['google', 'github', 'microsoft']),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  profile: z.record(z.any()),
});

export type OAuthVerificationData = z.infer<typeof OAuthVerificationDataSchema>;

// User status and permissions
export const UserPermissionsSchema = z.object({
  canRequestNotes: z.boolean().default(false),
  canCreateNotes: z.boolean().default(false),
  canRateNotes: z.boolean().default(false),
  isModerator: z.boolean().default(false),
  isVerified: z.boolean().default(false),
  verificationLevel: z.enum(['none', 'basic', 'enhanced']).default('none'),
});

export type UserPermissions = z.infer<typeof UserPermissionsSchema>;

// Extended user record with verification info
export const VerifiedUserSchema = z.object({
  discordUserId: z.string(),
  isVerified: z.boolean(),
  verificationMethod: VerificationMethodSchema.nullable(),
  verifiedAt: z.date().nullable(),
  permissions: UserPermissionsSchema,
  verificationHistory: z.array(UserVerificationSchema).default([]),
  lastActivity: z.date().nullable(),
  trustScore: z.number().min(0).max(100).default(0),
});

export type VerifiedUser = z.infer<typeof VerifiedUserSchema>;

// Anti-spam and security schemas
export const SecurityEventSchema = z.object({
  id: z.string(),
  discordUserId: z.string(),
  eventType: z.enum(['verification_attempt', 'rate_limit_hit', 'suspicious_activity', 'account_blocked']),
  details: z.record(z.any()),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  timestamp: z.date(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export type SecurityEvent = z.infer<typeof SecurityEventSchema>;

// Verification provider interface
export interface VerificationProvider {
  readonly name: string;
  readonly method: VerificationMethod;

  sendVerification(target: string, code: string, data?: any): Promise<boolean>;
  validateTarget(target: string): boolean;
  generateCode(): string;
  getCodeExpiry(): number; // minutes
}

// Verification service configuration
export const VerificationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  enabledMethods: z.array(VerificationMethodSchema).default(['email']),
  codeLength: z.number().min(4).max(10).default(6),
  codeExpiry: z.number().min(5).max(60).default(15), // minutes
  maxAttemptsPerCode: z.number().min(1).max(10).default(3),
  rateLimiting: RateLimitConfigSchema,
  requireVerificationForNotes: z.boolean().default(true),
  autoGrantPermissions: z.boolean().default(true),
  providers: z.object({
    email: z.object({
      enabled: z.boolean().default(true),
      smtpHost: z.string().optional(),
      smtpPort: z.number().optional(),
      smtpUser: z.string().optional(),
      smtpPass: z.string().optional(),
      fromAddress: z.string().email().optional(),
      fromName: z.string().optional(),
    }).optional(),
    phone: z.object({
      enabled: z.boolean().default(false),
      twilioAccountSid: z.string().optional(),
      twilioAuthToken: z.string().optional(),
      twilioPhoneNumber: z.string().optional(),
    }).optional(),
    oauth: z.object({
      enabled: z.boolean().default(false),
      providers: z.array(z.string()).default([]),
    }).optional(),
  }),
});

export type VerificationConfig = z.infer<typeof VerificationConfigSchema>;