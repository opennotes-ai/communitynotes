import { z } from 'zod';
export declare const VerificationMethodSchema: z.ZodEnum<["email", "phone", "oauth"]>;
export type VerificationMethod = z.infer<typeof VerificationMethodSchema>;
export declare const VerificationStatusSchema: z.ZodEnum<["pending", "verified", "failed", "expired", "blocked"]>;
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;
export declare const UserVerificationSchema: z.ZodObject<{
    id: z.ZodString;
    discordUserId: z.ZodString;
    method: z.ZodEnum<["email", "phone", "oauth"]>;
    status: z.ZodEnum<["pending", "verified", "failed", "expired", "blocked"]>;
    verificationCode: z.ZodNullable<z.ZodString>;
    verificationTarget: z.ZodString;
    verificationData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    expiresAt: z.ZodDate;
    verifiedAt: z.ZodNullable<z.ZodDate>;
    attemptCount: z.ZodDefault<z.ZodNumber>;
    maxAttempts: z.ZodDefault<z.ZodNumber>;
    isBlocked: z.ZodDefault<z.ZodBoolean>;
    blockedUntil: z.ZodNullable<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "verified" | "failed" | "expired" | "blocked";
    id: string;
    verifiedAt: Date | null;
    createdAt: Date;
    method: "email" | "phone" | "oauth";
    discordUserId: string;
    verificationCode: string | null;
    verificationTarget: string;
    updatedAt: Date;
    expiresAt: Date;
    attemptCount: number;
    maxAttempts: number;
    isBlocked: boolean;
    blockedUntil: Date | null;
    verificationData?: Record<string, any> | undefined;
}, {
    status: "pending" | "verified" | "failed" | "expired" | "blocked";
    id: string;
    verifiedAt: Date | null;
    createdAt: Date;
    method: "email" | "phone" | "oauth";
    discordUserId: string;
    verificationCode: string | null;
    verificationTarget: string;
    updatedAt: Date;
    expiresAt: Date;
    blockedUntil: Date | null;
    verificationData?: Record<string, any> | undefined;
    attemptCount?: number | undefined;
    maxAttempts?: number | undefined;
    isBlocked?: boolean | undefined;
}>;
export type UserVerification = z.infer<typeof UserVerificationSchema>;
export declare const StartVerificationRequestSchema: z.ZodObject<{
    discordUserId: z.ZodString;
    method: z.ZodEnum<["email", "phone", "oauth"]>;
    target: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    target: string;
    method: "email" | "phone" | "oauth";
    discordUserId: string;
    metadata?: Record<string, any> | undefined;
}, {
    target: string;
    method: "email" | "phone" | "oauth";
    discordUserId: string;
    metadata?: Record<string, any> | undefined;
}>;
export type StartVerificationRequest = z.infer<typeof StartVerificationRequestSchema>;
export declare const CompleteVerificationRequestSchema: z.ZodObject<{
    discordUserId: z.ZodString;
    verificationId: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    discordUserId: string;
    verificationId: string;
}, {
    code: string;
    discordUserId: string;
    verificationId: string;
}>;
export type CompleteVerificationRequest = z.infer<typeof CompleteVerificationRequestSchema>;
export declare const VerificationResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    verificationId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["pending", "verified", "failed", "expired", "blocked"]>>;
    expiresAt: z.ZodOptional<z.ZodDate>;
    canRetry: z.ZodOptional<z.ZodBoolean>;
    retryAfter: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    message: string;
    success: boolean;
    status?: "pending" | "verified" | "failed" | "expired" | "blocked" | undefined;
    expiresAt?: Date | undefined;
    verificationId?: string | undefined;
    canRetry?: boolean | undefined;
    retryAfter?: Date | undefined;
}, {
    message: string;
    success: boolean;
    status?: "pending" | "verified" | "failed" | "expired" | "blocked" | undefined;
    expiresAt?: Date | undefined;
    verificationId?: string | undefined;
    canRetry?: boolean | undefined;
    retryAfter?: Date | undefined;
}>;
export type VerificationResponse = z.infer<typeof VerificationResponseSchema>;
export declare const RateLimitConfigSchema: z.ZodObject<{
    maxAttempts: z.ZodDefault<z.ZodNumber>;
    windowMinutes: z.ZodDefault<z.ZodNumber>;
    blockDurationMinutes: z.ZodDefault<z.ZodNumber>;
    maxVerificationsPerDay: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    maxAttempts: number;
    windowMinutes: number;
    blockDurationMinutes: number;
    maxVerificationsPerDay: number;
}, {
    maxAttempts?: number | undefined;
    windowMinutes?: number | undefined;
    blockDurationMinutes?: number | undefined;
    maxVerificationsPerDay?: number | undefined;
}>;
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
export declare const EmailVerificationDataSchema: z.ZodObject<{
    emailAddress: z.ZodString;
    subject: z.ZodDefault<z.ZodString>;
    template: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    emailAddress: string;
    subject: string;
    template: string;
}, {
    emailAddress: string;
    subject?: string | undefined;
    template?: string | undefined;
}>;
export type EmailVerificationData = z.infer<typeof EmailVerificationDataSchema>;
export declare const PhoneVerificationDataSchema: z.ZodObject<{
    phoneNumber: z.ZodString;
    carrier: z.ZodOptional<z.ZodString>;
    countryCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    phoneNumber: string;
    carrier?: string | undefined;
    countryCode?: string | undefined;
}, {
    phoneNumber: string;
    carrier?: string | undefined;
    countryCode?: string | undefined;
}>;
export type PhoneVerificationData = z.infer<typeof PhoneVerificationDataSchema>;
export declare const OAuthVerificationDataSchema: z.ZodObject<{
    provider: z.ZodEnum<["google", "github", "microsoft"]>;
    accessToken: z.ZodString;
    refreshToken: z.ZodOptional<z.ZodString>;
    profile: z.ZodRecord<z.ZodString, z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    provider: "google" | "github" | "microsoft";
    accessToken: string;
    profile: Record<string, any>;
    refreshToken?: string | undefined;
}, {
    provider: "google" | "github" | "microsoft";
    accessToken: string;
    profile: Record<string, any>;
    refreshToken?: string | undefined;
}>;
export type OAuthVerificationData = z.infer<typeof OAuthVerificationDataSchema>;
export declare const UserPermissionsSchema: z.ZodObject<{
    canRequestNotes: z.ZodDefault<z.ZodBoolean>;
    canCreateNotes: z.ZodDefault<z.ZodBoolean>;
    canRateNotes: z.ZodDefault<z.ZodBoolean>;
    isModerator: z.ZodDefault<z.ZodBoolean>;
    isVerified: z.ZodDefault<z.ZodBoolean>;
    verificationLevel: z.ZodDefault<z.ZodEnum<["none", "basic", "enhanced"]>>;
}, "strip", z.ZodTypeAny, {
    canRequestNotes: boolean;
    canCreateNotes: boolean;
    canRateNotes: boolean;
    isModerator: boolean;
    isVerified: boolean;
    verificationLevel: "none" | "basic" | "enhanced";
}, {
    canRequestNotes?: boolean | undefined;
    canCreateNotes?: boolean | undefined;
    canRateNotes?: boolean | undefined;
    isModerator?: boolean | undefined;
    isVerified?: boolean | undefined;
    verificationLevel?: "none" | "basic" | "enhanced" | undefined;
}>;
export type UserPermissions = z.infer<typeof UserPermissionsSchema>;
export declare const VerifiedUserSchema: z.ZodObject<{
    discordUserId: z.ZodString;
    isVerified: z.ZodBoolean;
    verificationMethod: z.ZodNullable<z.ZodEnum<["email", "phone", "oauth"]>>;
    verifiedAt: z.ZodNullable<z.ZodDate>;
    permissions: z.ZodObject<{
        canRequestNotes: z.ZodDefault<z.ZodBoolean>;
        canCreateNotes: z.ZodDefault<z.ZodBoolean>;
        canRateNotes: z.ZodDefault<z.ZodBoolean>;
        isModerator: z.ZodDefault<z.ZodBoolean>;
        isVerified: z.ZodDefault<z.ZodBoolean>;
        verificationLevel: z.ZodDefault<z.ZodEnum<["none", "basic", "enhanced"]>>;
    }, "strip", z.ZodTypeAny, {
        canRequestNotes: boolean;
        canCreateNotes: boolean;
        canRateNotes: boolean;
        isModerator: boolean;
        isVerified: boolean;
        verificationLevel: "none" | "basic" | "enhanced";
    }, {
        canRequestNotes?: boolean | undefined;
        canCreateNotes?: boolean | undefined;
        canRateNotes?: boolean | undefined;
        isModerator?: boolean | undefined;
        isVerified?: boolean | undefined;
        verificationLevel?: "none" | "basic" | "enhanced" | undefined;
    }>;
    verificationHistory: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        discordUserId: z.ZodString;
        method: z.ZodEnum<["email", "phone", "oauth"]>;
        status: z.ZodEnum<["pending", "verified", "failed", "expired", "blocked"]>;
        verificationCode: z.ZodNullable<z.ZodString>;
        verificationTarget: z.ZodString;
        verificationData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        expiresAt: z.ZodDate;
        verifiedAt: z.ZodNullable<z.ZodDate>;
        attemptCount: z.ZodDefault<z.ZodNumber>;
        maxAttempts: z.ZodDefault<z.ZodNumber>;
        isBlocked: z.ZodDefault<z.ZodBoolean>;
        blockedUntil: z.ZodNullable<z.ZodDate>;
    }, "strip", z.ZodTypeAny, {
        status: "pending" | "verified" | "failed" | "expired" | "blocked";
        id: string;
        verifiedAt: Date | null;
        createdAt: Date;
        method: "email" | "phone" | "oauth";
        discordUserId: string;
        verificationCode: string | null;
        verificationTarget: string;
        updatedAt: Date;
        expiresAt: Date;
        attemptCount: number;
        maxAttempts: number;
        isBlocked: boolean;
        blockedUntil: Date | null;
        verificationData?: Record<string, any> | undefined;
    }, {
        status: "pending" | "verified" | "failed" | "expired" | "blocked";
        id: string;
        verifiedAt: Date | null;
        createdAt: Date;
        method: "email" | "phone" | "oauth";
        discordUserId: string;
        verificationCode: string | null;
        verificationTarget: string;
        updatedAt: Date;
        expiresAt: Date;
        blockedUntil: Date | null;
        verificationData?: Record<string, any> | undefined;
        attemptCount?: number | undefined;
        maxAttempts?: number | undefined;
        isBlocked?: boolean | undefined;
    }>, "many">>;
    lastActivity: z.ZodNullable<z.ZodDate>;
    trustScore: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    verifiedAt: Date | null;
    discordUserId: string;
    isVerified: boolean;
    verificationMethod: "email" | "phone" | "oauth" | null;
    permissions: {
        canRequestNotes: boolean;
        canCreateNotes: boolean;
        canRateNotes: boolean;
        isModerator: boolean;
        isVerified: boolean;
        verificationLevel: "none" | "basic" | "enhanced";
    };
    verificationHistory: {
        status: "pending" | "verified" | "failed" | "expired" | "blocked";
        id: string;
        verifiedAt: Date | null;
        createdAt: Date;
        method: "email" | "phone" | "oauth";
        discordUserId: string;
        verificationCode: string | null;
        verificationTarget: string;
        updatedAt: Date;
        expiresAt: Date;
        attemptCount: number;
        maxAttempts: number;
        isBlocked: boolean;
        blockedUntil: Date | null;
        verificationData?: Record<string, any> | undefined;
    }[];
    lastActivity: Date | null;
    trustScore: number;
}, {
    verifiedAt: Date | null;
    discordUserId: string;
    isVerified: boolean;
    verificationMethod: "email" | "phone" | "oauth" | null;
    permissions: {
        canRequestNotes?: boolean | undefined;
        canCreateNotes?: boolean | undefined;
        canRateNotes?: boolean | undefined;
        isModerator?: boolean | undefined;
        isVerified?: boolean | undefined;
        verificationLevel?: "none" | "basic" | "enhanced" | undefined;
    };
    lastActivity: Date | null;
    verificationHistory?: {
        status: "pending" | "verified" | "failed" | "expired" | "blocked";
        id: string;
        verifiedAt: Date | null;
        createdAt: Date;
        method: "email" | "phone" | "oauth";
        discordUserId: string;
        verificationCode: string | null;
        verificationTarget: string;
        updatedAt: Date;
        expiresAt: Date;
        blockedUntil: Date | null;
        verificationData?: Record<string, any> | undefined;
        attemptCount?: number | undefined;
        maxAttempts?: number | undefined;
        isBlocked?: boolean | undefined;
    }[] | undefined;
    trustScore?: number | undefined;
}>;
export type VerifiedUser = z.infer<typeof VerifiedUserSchema>;
export declare const SecurityEventSchema: z.ZodObject<{
    id: z.ZodString;
    discordUserId: z.ZodString;
    eventType: z.ZodEnum<["verification_attempt", "rate_limit_hit", "suspicious_activity", "account_blocked"]>;
    details: z.ZodRecord<z.ZodString, z.ZodAny>;
    severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
    timestamp: z.ZodDate;
    ipAddress: z.ZodOptional<z.ZodString>;
    userAgent: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    timestamp: Date;
    id: string;
    details: Record<string, any>;
    discordUserId: string;
    eventType: "verification_attempt" | "rate_limit_hit" | "suspicious_activity" | "account_blocked";
    severity: "low" | "medium" | "high" | "critical";
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
}, {
    timestamp: Date;
    id: string;
    details: Record<string, any>;
    discordUserId: string;
    eventType: "verification_attempt" | "rate_limit_hit" | "suspicious_activity" | "account_blocked";
    severity: "low" | "medium" | "high" | "critical";
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
}>;
export type SecurityEvent = z.infer<typeof SecurityEventSchema>;
export interface VerificationProvider {
    readonly name: string;
    readonly method: VerificationMethod;
    sendVerification(target: string, code: string, data?: any): Promise<boolean>;
    validateTarget(target: string): boolean;
    generateCode(): string;
    getCodeExpiry(): number;
}
export declare const VerificationConfigSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    enabledMethods: z.ZodDefault<z.ZodArray<z.ZodEnum<["email", "phone", "oauth"]>, "many">>;
    codeLength: z.ZodDefault<z.ZodNumber>;
    codeExpiry: z.ZodDefault<z.ZodNumber>;
    maxAttemptsPerCode: z.ZodDefault<z.ZodNumber>;
    rateLimiting: z.ZodObject<{
        maxAttempts: z.ZodDefault<z.ZodNumber>;
        windowMinutes: z.ZodDefault<z.ZodNumber>;
        blockDurationMinutes: z.ZodDefault<z.ZodNumber>;
        maxVerificationsPerDay: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxAttempts: number;
        windowMinutes: number;
        blockDurationMinutes: number;
        maxVerificationsPerDay: number;
    }, {
        maxAttempts?: number | undefined;
        windowMinutes?: number | undefined;
        blockDurationMinutes?: number | undefined;
        maxVerificationsPerDay?: number | undefined;
    }>;
    requireVerificationForNotes: z.ZodDefault<z.ZodBoolean>;
    autoGrantPermissions: z.ZodDefault<z.ZodBoolean>;
    providers: z.ZodObject<{
        email: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            smtpHost: z.ZodOptional<z.ZodString>;
            smtpPort: z.ZodOptional<z.ZodNumber>;
            smtpUser: z.ZodOptional<z.ZodString>;
            smtpPass: z.ZodOptional<z.ZodString>;
            fromAddress: z.ZodOptional<z.ZodString>;
            fromName: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            smtpHost?: string | undefined;
            smtpPort?: number | undefined;
            smtpUser?: string | undefined;
            smtpPass?: string | undefined;
            fromAddress?: string | undefined;
            fromName?: string | undefined;
        }, {
            enabled?: boolean | undefined;
            smtpHost?: string | undefined;
            smtpPort?: number | undefined;
            smtpUser?: string | undefined;
            smtpPass?: string | undefined;
            fromAddress?: string | undefined;
            fromName?: string | undefined;
        }>>;
        phone: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            twilioAccountSid: z.ZodOptional<z.ZodString>;
            twilioAuthToken: z.ZodOptional<z.ZodString>;
            twilioPhoneNumber: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            twilioAccountSid?: string | undefined;
            twilioAuthToken?: string | undefined;
            twilioPhoneNumber?: string | undefined;
        }, {
            enabled?: boolean | undefined;
            twilioAccountSid?: string | undefined;
            twilioAuthToken?: string | undefined;
            twilioPhoneNumber?: string | undefined;
        }>>;
        oauth: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            providers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            providers: string[];
        }, {
            enabled?: boolean | undefined;
            providers?: string[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        email?: {
            enabled: boolean;
            smtpHost?: string | undefined;
            smtpPort?: number | undefined;
            smtpUser?: string | undefined;
            smtpPass?: string | undefined;
            fromAddress?: string | undefined;
            fromName?: string | undefined;
        } | undefined;
        phone?: {
            enabled: boolean;
            twilioAccountSid?: string | undefined;
            twilioAuthToken?: string | undefined;
            twilioPhoneNumber?: string | undefined;
        } | undefined;
        oauth?: {
            enabled: boolean;
            providers: string[];
        } | undefined;
    }, {
        email?: {
            enabled?: boolean | undefined;
            smtpHost?: string | undefined;
            smtpPort?: number | undefined;
            smtpUser?: string | undefined;
            smtpPass?: string | undefined;
            fromAddress?: string | undefined;
            fromName?: string | undefined;
        } | undefined;
        phone?: {
            enabled?: boolean | undefined;
            twilioAccountSid?: string | undefined;
            twilioAuthToken?: string | undefined;
            twilioPhoneNumber?: string | undefined;
        } | undefined;
        oauth?: {
            enabled?: boolean | undefined;
            providers?: string[] | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    rateLimiting: {
        maxAttempts: number;
        windowMinutes: number;
        blockDurationMinutes: number;
        maxVerificationsPerDay: number;
    };
    enabled: boolean;
    enabledMethods: ("email" | "phone" | "oauth")[];
    codeLength: number;
    codeExpiry: number;
    maxAttemptsPerCode: number;
    requireVerificationForNotes: boolean;
    autoGrantPermissions: boolean;
    providers: {
        email?: {
            enabled: boolean;
            smtpHost?: string | undefined;
            smtpPort?: number | undefined;
            smtpUser?: string | undefined;
            smtpPass?: string | undefined;
            fromAddress?: string | undefined;
            fromName?: string | undefined;
        } | undefined;
        phone?: {
            enabled: boolean;
            twilioAccountSid?: string | undefined;
            twilioAuthToken?: string | undefined;
            twilioPhoneNumber?: string | undefined;
        } | undefined;
        oauth?: {
            enabled: boolean;
            providers: string[];
        } | undefined;
    };
}, {
    rateLimiting: {
        maxAttempts?: number | undefined;
        windowMinutes?: number | undefined;
        blockDurationMinutes?: number | undefined;
        maxVerificationsPerDay?: number | undefined;
    };
    providers: {
        email?: {
            enabled?: boolean | undefined;
            smtpHost?: string | undefined;
            smtpPort?: number | undefined;
            smtpUser?: string | undefined;
            smtpPass?: string | undefined;
            fromAddress?: string | undefined;
            fromName?: string | undefined;
        } | undefined;
        phone?: {
            enabled?: boolean | undefined;
            twilioAccountSid?: string | undefined;
            twilioAuthToken?: string | undefined;
            twilioPhoneNumber?: string | undefined;
        } | undefined;
        oauth?: {
            enabled?: boolean | undefined;
            providers?: string[] | undefined;
        } | undefined;
    };
    enabled?: boolean | undefined;
    enabledMethods?: ("email" | "phone" | "oauth")[] | undefined;
    codeLength?: number | undefined;
    codeExpiry?: number | undefined;
    maxAttemptsPerCode?: number | undefined;
    requireVerificationForNotes?: boolean | undefined;
    autoGrantPermissions?: boolean | undefined;
}>;
export type VerificationConfig = z.infer<typeof VerificationConfigSchema>;
//# sourceMappingURL=verification.d.ts.map