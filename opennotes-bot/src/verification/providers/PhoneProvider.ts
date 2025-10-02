import twilio from 'twilio';
import { BaseVerificationProvider } from './BaseProvider.js';
import { VerificationMethod } from '../../shared/types/verification.js';
import { appConfig } from '../../shared/config/index.js';
import { logger } from '../../shared/utils/logger.js';

export class PhoneVerificationProvider extends BaseVerificationProvider {
  readonly name = 'phone';
  readonly method: VerificationMethod = 'phone';
  private twilioClient: any | null = null;

  constructor() {
    super();
    this.initializeTwilio();
  }

  private initializeTwilio(): void {
    if (!appConfig.TWILIO_ACCOUNT_SID || !appConfig.TWILIO_AUTH_TOKEN) {
      logger.warn('Phone verification provider: Twilio credentials not configured');
      return;
    }

    try {
      this.twilioClient = twilio(
        appConfig.TWILIO_ACCOUNT_SID,
        appConfig.TWILIO_AUTH_TOKEN
      );
      logger.info('Phone verification provider initialized');
    } catch (error) {
      logger.error('Failed to initialize phone provider', { error });
    }
  }

  validateTarget(phoneNumber: string): boolean {
    // E.164 format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  async sendVerification(phoneNumber: string, code: string, data?: any): Promise<boolean> {
    if (!this.twilioClient) {
      logger.error('Twilio client not initialized');
      return false;
    }

    if (!this.validateTarget(phoneNumber)) {
      logger.error('Invalid phone number format', { phone: this.maskTarget(phoneNumber) });
      return false;
    }

    if (!appConfig.TWILIO_PHONE_NUMBER) {
      logger.error('Twilio phone number not configured');
      return false;
    }

    try {
      const message = this.getSMSTemplate(code, data);

      await this.twilioClient.messages.create({
        body: message,
        from: appConfig.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });

      this.logAttempt(phoneNumber, true);
      return true;
    } catch (error) {
      this.logAttempt(phoneNumber, false, error as Error);
      return false;
    }
  }

  private getSMSTemplate(code: string, data?: any): string {
    const template = data?.template || 'default';

    if (template === 'default') {
      return `Community Notes verification code: ${code}\n\nThis code expires in 15 minutes. If you didn't request this, ignore this message.`;
    }

    return template.replace('{{code}}', code);
  }

  getCodeExpiry(): number {
    return 15; // 15 minutes for SMS
  }
}