import { logger } from '../../shared/utils/logger.js';
export class BaseVerificationProvider {
    generateCode() {
        const codeLength = 6; // Can be made configurable
        const characters = '0123456789';
        let result = '';
        for (let i = 0; i < codeLength; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }
    getCodeExpiry() {
        return 15; // 15 minutes default
    }
    logAttempt(target, success, error) {
        logger.info('Verification attempt', {
            provider: this.name,
            method: this.method,
            target: this.maskTarget(target),
            success,
            error: error?.message,
        });
    }
    maskTarget(target) {
        if (target.includes('@')) {
            // Email masking
            const [local, domain] = target.split('@');
            const maskedLocal = local.length > 2
                ? local.substring(0, 2) + '*'.repeat(local.length - 2)
                : local;
            return `${maskedLocal}@${domain}`;
        }
        else if (target.startsWith('+')) {
            // Phone number masking
            return target.substring(0, 4) + '*'.repeat(target.length - 6) + target.substring(target.length - 2);
        }
        return target.substring(0, 2) + '*'.repeat(Math.max(0, target.length - 4)) + target.substring(Math.max(2, target.length - 2));
    }
}
//# sourceMappingURL=BaseProvider.js.map