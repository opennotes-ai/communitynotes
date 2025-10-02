import nodemailer from 'nodemailer';
import { BaseVerificationProvider } from './BaseProvider.js';
import { VerificationMethod } from '../../shared/types/verification.js';
import { appConfig } from '../../shared/config/index.js';
import { logger } from '../../shared/utils/logger.js';

export class EmailVerificationProvider extends BaseVerificationProvider {
  readonly name = 'email';
  readonly method: VerificationMethod = 'email';
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    super();
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    if (!appConfig.SMTP_HOST || !appConfig.SMTP_USER || !appConfig.SMTP_PASS) {
      logger.warn('Email verification provider: SMTP credentials not configured');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: appConfig.SMTP_HOST,
        port: appConfig.SMTP_PORT || 587,
        secure: (appConfig.SMTP_PORT || 587) === 465,
        auth: {
          user: appConfig.SMTP_USER,
          pass: appConfig.SMTP_PASS,
        },
      });

      logger.info('Email verification provider initialized');
    } catch (error) {
      logger.error('Failed to initialize email provider', { error });
    }
  }

  validateTarget(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async sendVerification(email: string, code: string, data?: any): Promise<boolean> {
    if (!this.transporter) {
      logger.error('Email transporter not initialized');
      return false;
    }

    if (!this.validateTarget(email)) {
      logger.error('Invalid email address', { email: this.maskTarget(email) });
      return false;
    }

    try {
      const subject = data?.subject || 'Verify your Open Notes account';
      const template = this.getEmailTemplate(code, data);

      const mailOptions = {
        from: {
          name: appConfig.SMTP_FROM_NAME || 'Open Notes',
          address: appConfig.SMTP_FROM_ADDRESS || appConfig.SMTP_USER!,
        },
        to: email,
        subject,
        html: template,
        text: this.getTextTemplate(code),
      };

      await this.transporter.sendMail(mailOptions);
      this.logAttempt(email, true);
      return true;
    } catch (error) {
      this.logAttempt(email, false, error as Error);
      return false;
    }
  }

  private getEmailTemplate(code: string, data?: any): string {
    const template = data?.template || 'default';

    if (template === 'default') {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Account</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #5865F2; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f8f9fa; }
            .code { font-size: 24px; font-weight: bold; color: #5865F2; text-align: center; padding: 20px; background-color: white; border-radius: 8px; margin: 20px 0; }
            .footer { color: #666; font-size: 12px; text-align: center; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Open Notes Verification</h1>
          </div>
          <div class="content">
            <h2>Verify Your Discord Account</h2>
            <p>Someone (hopefully you!) is trying to verify this email address for use with Open Notes on Discord.</p>
            <p>Your verification code is:</p>
            <div class="code">${code}</div>
            <p>This code will expire in 15 minutes. If you didn't request this verification, you can safely ignore this email.</p>
            <p><strong>Note:</strong> This verification links your email to your Discord account for Open Notes participation.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Open Notes. Please do not reply to this email.</p>
          </div>
        </body>
        </html>
      `;
    }

    return template;
  }

  private getTextTemplate(code: string): string {
    return `
Open Notes Verification

Someone is trying to verify this email address for use with Open Notes on Discord.

Your verification code is: ${code}

This code will expire in 15 minutes. If you didn't request this verification, you can safely ignore this email.

Note: This verification links your email to your Discord account for Open Notes participation.

This is an automated message from Open Notes. Please do not reply to this email.
    `.trim();
  }
}