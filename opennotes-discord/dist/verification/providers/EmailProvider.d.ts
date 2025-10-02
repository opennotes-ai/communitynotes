import { BaseVerificationProvider } from './BaseProvider.js';
import { VerificationMethod } from '../../shared/types/verification.js';
export declare class EmailVerificationProvider extends BaseVerificationProvider {
    readonly name = "email";
    readonly method: VerificationMethod;
    private transporter;
    constructor();
    private initializeTransporter;
    validateTarget(email: string): boolean;
    sendVerification(email: string, code: string, data?: any): Promise<boolean>;
    private getEmailTemplate;
    private getTextTemplate;
}
//# sourceMappingURL=EmailProvider.d.ts.map