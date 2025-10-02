import { StartVerificationRequest, CompleteVerificationRequest, VerificationResponse, VerifiedUser, UserPermissions } from '../shared/types/verification.js';
export declare class VerificationService {
    private providers;
    private rateLimitService;
    private verifications;
    private users;
    private securityEvents;
    constructor();
    private initializeProviders;
    startVerification(request: StartVerificationRequest): Promise<VerificationResponse>;
    completeVerification(request: CompleteVerificationRequest): Promise<VerificationResponse>;
    isUserVerified(discordUserId: string): Promise<boolean>;
    getUserPermissions(discordUserId: string): Promise<UserPermissions>;
    getVerificationStatus(discordUserId: string): Promise<VerifiedUser | null>;
    private markUserAsVerified;
    private findPendingVerification;
    private isExpired;
    private generateVerificationId;
    private hashCode;
    private logSecurityEvent;
    private getEventSeverity;
}
//# sourceMappingURL=VerificationService.d.ts.map