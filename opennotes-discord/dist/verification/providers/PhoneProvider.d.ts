import { BaseVerificationProvider } from './BaseProvider.js';
import { VerificationMethod } from '../../shared/types/verification.js';
export declare class PhoneVerificationProvider extends BaseVerificationProvider {
    readonly name = "phone";
    readonly method: VerificationMethod;
    private twilioClient;
    constructor();
    private initializeTwilio;
    validateTarget(phoneNumber: string): boolean;
    sendVerification(phoneNumber: string, code: string, data?: any): Promise<boolean>;
    private getSMSTemplate;
    getCodeExpiry(): number;
}
//# sourceMappingURL=PhoneProvider.d.ts.map