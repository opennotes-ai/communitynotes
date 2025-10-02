import { randomBytes, createHash } from 'crypto';
import { logger } from '../shared/utils/logger.js';
import { EmailVerificationProvider } from './providers/EmailProvider.js';
import { PhoneVerificationProvider } from './providers/PhoneProvider.js';
import { RateLimitService } from './RateLimitService.js';
export class VerificationService {
    providers = new Map();
    rateLimitService;
    // These would normally be database operations
    // For now using in-memory storage as placeholder
    verifications = new Map();
    users = new Map();
    securityEvents = [];
    constructor() {
        this.rateLimitService = new RateLimitService();
        this.initializeProviders();
    }
    initializeProviders() {
        this.providers.set('email', new EmailVerificationProvider());
        this.providers.set('phone', new PhoneVerificationProvider());
        logger.info('Verification service initialized', {
            providers: Array.from(this.providers.keys()),
        });
    }
    async startVerification(request) {
        const { discordUserId, method, target, metadata } = request;
        try {
            // Check if user is already verified
            const existingUser = this.users.get(discordUserId);
            if (existingUser?.isVerified) {
                return {
                    success: false,
                    message: 'User is already verified',
                    status: 'verified',
                };
            }
            // Check rate limits
            const rateLimitCheck = await this.rateLimitService.checkRateLimit(discordUserId, 'verification_start');
            if (!rateLimitCheck.allowed) {
                await this.logSecurityEvent(discordUserId, 'rate_limit_hit', {
                    action: 'verification_start',
                    retryAfter: rateLimitCheck.retryAfter,
                });
                return {
                    success: false,
                    message: 'Rate limit exceeded. Please try again later.',
                    canRetry: true,
                    retryAfter: rateLimitCheck.retryAfter,
                };
            }
            // Get provider
            const provider = this.providers.get(method);
            if (!provider) {
                return {
                    success: false,
                    message: `Verification method '${method}' is not supported`,
                };
            }
            // Validate target
            if (!provider.validateTarget(target)) {
                return {
                    success: false,
                    message: `Invalid ${method} format`,
                };
            }
            // Check for existing pending verification
            const existingVerification = this.findPendingVerification(discordUserId, method);
            if (existingVerification && !this.isExpired(existingVerification)) {
                return {
                    success: false,
                    message: 'A verification is already in progress. Please complete it or wait for it to expire.',
                    status: 'pending',
                    expiresAt: existingVerification.expiresAt,
                };
            }
            // Generate verification code and ID
            const verificationCode = provider.generateCode();
            const verificationId = this.generateVerificationId();
            const expiresAt = new Date(Date.now() + provider.getCodeExpiry() * 60 * 1000);
            // Create verification record
            const verification = {
                id: verificationId,
                discordUserId,
                method,
                status: 'pending',
                verificationCode: await this.hashCode(verificationCode),
                verificationTarget: target,
                verificationData: metadata,
                createdAt: new Date(),
                updatedAt: new Date(),
                expiresAt,
                verifiedAt: null,
                attemptCount: 0,
                maxAttempts: 3,
                isBlocked: false,
                blockedUntil: null,
            };
            // Send verification
            const sent = await provider.sendVerification(target, verificationCode, metadata);
            if (!sent) {
                return {
                    success: false,
                    message: `Failed to send verification ${method}. Please try again.`,
                };
            }
            // Store verification
            this.verifications.set(verificationId, verification);
            // Log successful start
            await this.logSecurityEvent(discordUserId, 'verification_attempt', {
                method,
                target: provider.maskTarget ? provider.maskTarget(target) : target.substring(0, 3) + '***',
                verificationId,
            });
            return {
                success: true,
                message: `Verification ${method} sent. Please check your ${method} and enter the code.`,
                verificationId,
                status: 'pending',
                expiresAt,
            };
        }
        catch (error) {
            logger.error('Error starting verification', {
                discordUserId,
                method,
                error: error.message,
            });
            return {
                success: false,
                message: 'An error occurred while starting verification. Please try again.',
            };
        }
    }
    async completeVerification(request) {
        const { discordUserId, verificationId, code } = request;
        try {
            // Get verification record
            const verification = this.verifications.get(verificationId);
            if (!verification) {
                return {
                    success: false,
                    message: 'Invalid verification ID',
                };
            }
            // Check ownership
            if (verification.discordUserId !== discordUserId) {
                await this.logSecurityEvent(discordUserId, 'suspicious_activity', {
                    action: 'verification_ownership_mismatch',
                    verificationId,
                });
                return {
                    success: false,
                    message: 'Invalid verification',
                };
            }
            // Check if expired
            if (this.isExpired(verification)) {
                verification.status = 'expired';
                this.verifications.set(verificationId, verification);
                return {
                    success: false,
                    message: 'Verification code has expired. Please request a new one.',
                    status: 'expired',
                };
            }
            // Check if blocked
            if (verification.isBlocked) {
                return {
                    success: false,
                    message: 'This verification has been blocked due to too many failed attempts.',
                    status: 'blocked',
                    retryAfter: verification.blockedUntil || undefined,
                };
            }
            // Check attempt limit
            if (verification.attemptCount >= verification.maxAttempts) {
                verification.isBlocked = true;
                verification.blockedUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour block
                verification.status = 'blocked';
                this.verifications.set(verificationId, verification);
                await this.logSecurityEvent(discordUserId, 'account_blocked', {
                    reason: 'max_verification_attempts',
                    verificationId,
                });
                return {
                    success: false,
                    message: 'Too many failed attempts. Verification blocked for 1 hour.',
                    status: 'blocked',
                    retryAfter: verification.blockedUntil,
                };
            }
            // Verify code
            const hashedCode = await this.hashCode(code);
            const isValidCode = verification.verificationCode === hashedCode;
            // Increment attempt count
            verification.attemptCount += 1;
            verification.updatedAt = new Date();
            if (!isValidCode) {
                verification.status = verification.attemptCount >= verification.maxAttempts ? 'failed' : 'pending';
                this.verifications.set(verificationId, verification);
                const remainingAttempts = verification.maxAttempts - verification.attemptCount;
                const message = remainingAttempts > 0
                    ? `Invalid verification code. ${remainingAttempts} attempts remaining.`
                    : 'Invalid verification code. Maximum attempts exceeded.';
                return {
                    success: false,
                    message,
                    status: verification.status,
                };
            }
            // Success - mark as verified
            verification.status = 'verified';
            verification.verifiedAt = new Date();
            this.verifications.set(verificationId, verification);
            // Create or update user record
            await this.markUserAsVerified(discordUserId, verification);
            await this.logSecurityEvent(discordUserId, 'verification_attempt', {
                action: 'completed',
                method: verification.method,
                verificationId,
                success: true,
            });
            return {
                success: true,
                message: 'Verification completed successfully! You can now participate in Open Notes.',
                status: 'verified',
            };
        }
        catch (error) {
            logger.error('Error completing verification', {
                discordUserId,
                verificationId,
                error: error.message,
            });
            return {
                success: false,
                message: 'An error occurred while completing verification. Please try again.',
            };
        }
    }
    async isUserVerified(discordUserId) {
        const user = this.users.get(discordUserId);
        return user?.isVerified || false;
    }
    async getUserPermissions(discordUserId) {
        const user = this.users.get(discordUserId);
        return user?.permissions || {
            canRequestNotes: false,
            canCreateNotes: false,
            canRateNotes: false,
            isModerator: false,
            isVerified: false,
            verificationLevel: 'none',
        };
    }
    async getVerificationStatus(discordUserId) {
        return this.users.get(discordUserId) || null;
    }
    async markUserAsVerified(discordUserId, verification) {
        const existingUser = this.users.get(discordUserId);
        const permissions = {
            canRequestNotes: true,
            canCreateNotes: true,
            canRateNotes: true,
            isModerator: false,
            isVerified: true,
            verificationLevel: 'basic',
        };
        const verifiedUser = {
            discordUserId,
            isVerified: true,
            verificationMethod: verification.method,
            verifiedAt: verification.verifiedAt,
            permissions,
            verificationHistory: existingUser?.verificationHistory || [],
            lastActivity: new Date(),
            trustScore: 25, // Base trust score for new verified users
        };
        // Add this verification to history
        verifiedUser.verificationHistory.push(verification);
        this.users.set(discordUserId, verifiedUser);
        logger.info('User marked as verified', { discordUserId, method: verification.method });
    }
    findPendingVerification(discordUserId, method) {
        for (const verification of this.verifications.values()) {
            if (verification.discordUserId === discordUserId &&
                verification.method === method &&
                verification.status === 'pending') {
                return verification;
            }
        }
        return null;
    }
    isExpired(verification) {
        return new Date() > verification.expiresAt;
    }
    generateVerificationId() {
        return randomBytes(16).toString('hex');
    }
    async hashCode(code) {
        return createHash('sha256').update(code).digest('hex');
    }
    async logSecurityEvent(discordUserId, eventType, details) {
        const event = {
            id: randomBytes(8).toString('hex'),
            discordUserId,
            eventType,
            details,
            severity: this.getEventSeverity(eventType),
            timestamp: new Date(),
        };
        this.securityEvents.push(event);
        logger.info('Security event logged', {
            eventType,
            discordUserId,
            severity: event.severity,
            details,
        });
    }
    getEventSeverity(eventType) {
        switch (eventType) {
            case 'verification_attempt':
                return 'low';
            case 'rate_limit_hit':
                return 'medium';
            case 'suspicious_activity':
                return 'high';
            case 'account_blocked':
                return 'critical';
            default:
                return 'low';
        }
    }
}
//# sourceMappingURL=VerificationService.js.map