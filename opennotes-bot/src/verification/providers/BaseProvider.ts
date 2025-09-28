import { VerificationProvider, VerificationMethod } from '../../shared/types/verification.js';
import { logger } from '../../shared/utils/logger.js';

export abstract class BaseVerificationProvider implements VerificationProvider {
  abstract readonly name: string;
  abstract readonly method: VerificationMethod;

  abstract sendVerification(target: string, code: string, data?: any): Promise<boolean>;
  abstract validateTarget(target: string): boolean;

  generateCode(): string {
    const codeLength = 6; // Can be made configurable
    const characters = '0123456789';
    let result = '';
    for (let i = 0; i < codeLength; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  getCodeExpiry(): number {
    return 15; // 15 minutes default
  }

  protected logAttempt(target: string, success: boolean, error?: Error): void {
    logger.info('Verification attempt', {
      provider: this.name,
      method: this.method,
      target: this.maskTarget(target),
      success,
      error: error?.message,
    });
  }

  protected maskTarget(target: string): string {
    if (target.includes('@')) {
      // Email masking
      const [local, domain] = target.split('@');
      const maskedLocal = local.length > 2
        ? local.substring(0, 2) + '*'.repeat(local.length - 2)
        : local;
      return `${maskedLocal}@${domain}`;
    } else if (target.startsWith('+')) {
      // Phone number masking
      return target.substring(0, 4) + '*'.repeat(target.length - 6) + target.substring(target.length - 2);
    }
    return target.substring(0, 2) + '*'.repeat(Math.max(0, target.length - 4)) + target.substring(Math.max(2, target.length - 2));
  }
}