import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    });
  }

  async sendMagicLinkEmail(email: string, token: string): Promise<void> {
    const magicLink = `${env.FRONTEND_URL}/auth/verify?token=${token}`;

    const mailOptions = {
      from: env.EMAIL_FROM,
      to: email,
      subject: 'Your Login Link',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Login Link</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .logo { font-size: 24px; font-weight: bold; color: #111; margin-bottom: 30px; }
              h1 { font-size: 24px; margin-bottom: 20px; }
              .button { display: inline-block; background: #111; color: #fff !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
              .warning { background: #fef3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 6px; margin-top: 30px; font-size: 14px; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">Your App</div>
              <h1>Login to Your Account</h1>
              <p>Click the button below to securely log in to your account. This link will expire in ${env.MAGIC_LINK_EXPIRY_MINUTES} minutes.</p>
              <a href="${magicLink}" class="button">Login Now</a>
              <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666; font-size: 12px;">${magicLink}</p>
              <div class="warning">
                <strong>Security Notice:</strong> Never share this link with anyone. If you didn't request this login link, please ignore this email.
              </div>
              <div class="footer">
                <p>This email was sent by Your App. If you have questions, contact support.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
        Login to Your Account

        Click the link below to securely log in to your account.
        This link will expire in ${env.MAGIC_LINK_EXPIRY_MINUTES} minutes.

        ${magicLink}

        Security Notice: Never share this link with anyone.
        If you didn't request this login link, please ignore this email.
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Magic link email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send magic link email:', error);
      throw new Error('Failed to send email');
    }
  }

  // Check if email is properly configured (no network call)
  isEmailConfigured(): boolean {
    // Check if all required SMTP environment variables are set and not placeholder values
    const hasValidHost = Boolean(env.SMTP_HOST &&
      env.SMTP_HOST !== 'smtp.example.com' &&
      !env.SMTP_HOST.includes('example'));

    const hasValidUser = Boolean(env.SMTP_USER &&
      env.SMTP_USER !== 'noreply@example.com' &&
      !env.SMTP_USER.includes('example'));

    const hasValidPassword = Boolean(env.SMTP_PASSWORD &&
      env.SMTP_PASSWORD !== 'placeholder-smtp-password' &&
      env.SMTP_PASSWORD !== 'placeholder');

    return hasValidHost && hasValidUser && hasValidPassword;
  }

  // Get email status with appropriate message based on environment
  getEmailStatus(): {
    isConfigured: boolean;
    message?: string;
  } {
    const isConfigured = this.isEmailConfigured();

    if (isConfigured) {
      return { isConfigured: true };
    }

    // Return helpful message in development, generic in production
    if (env.NODE_ENV === 'development') {
      return {
        isConfigured: false,
        message: 'Email service is not configured. Update SMTP settings in your .env file to enable magic link authentication. See .env.example for configuration details.',
      };
    }

    return {
      isConfigured: false,
      message: 'Email service is temporarily unavailable. Please try again later or contact support.',
    };
  }

  // Verify email connection (useful for health checks)
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
