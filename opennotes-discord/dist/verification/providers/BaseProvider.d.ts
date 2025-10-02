import { VerificationProvider, VerificationMethod } from '../../shared/types/verification.js';
export declare abstract class BaseVerificationProvider implements VerificationProvider {
    abstract readonly name: string;
    abstract readonly method: VerificationMethod;
    abstract sendVerification(target: string, code: string, data?: any): Promise<boolean>;
    abstract validateTarget(target: string): boolean;
    generateCode(): string;
    getCodeExpiry(): number;
    protected logAttempt(target: string, success: boolean, error?: Error): void;
    protected maskTarget(target: string): string;
}
//# sourceMappingURL=BaseProvider.d.ts.map