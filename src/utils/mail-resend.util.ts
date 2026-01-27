import { Resend } from 'resend';
import { BadRequestException } from '@nestjs/common';

export class MailResendUtil {
  private static resend: Resend;

  static initialize(apiKey: string): void {
    this.resend = new Resend(apiKey);
  }

  static async sendOtpEmail(to: string, otp: string, from: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from,
        to,
        subject: 'Your Verification Code - Smart Appointment & Queue Manager',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verification Code</title>
          </head>
          <body style="margin:0; padding:0; background:#f6f9fc; font-family:Arial,Helvetica,sans-serif; color:#333;">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="padding:40px 20px;">
                  <table role="presentation" width="100%" style="max-width:520px; background:#ffffff; border-radius:8px; overflow:hidden; border:1px solid #e0e4e8;">
                    <tr>
                      <td style="background:#4f46e5; padding:32px 24px; text-align:center; color:white;">
                        <h1 style="margin:0; font-size:24px; font-weight:600;">Verification Code</h1>
                        <p style="margin:8px 0 0; font-size:15px; opacity:0.9;">Smart Appointment & Queue Manager</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:40px 32px; text-align:center;">
                        <p style="margin:0 0 24px; font-size:16px; line-height:1.5;">Hello,</p>
                        <p style="margin:0 0 32px; font-size:15px; color:#555;">Use the code below to verify your account:</p>
                        
                        <div style="font-size:36px; font-weight:bold; letter-spacing:8px; color:#4f46e5; background:#f8f9fa; padding:20px; border-radius:8px; margin:0 auto 32px; max-width:240px;">
                          ${otp}
                        </div>
                        
                        <p style="margin:0 0 24px; font-size:14px; color:#666;">
                          This code will expire in <strong>10 minutes</strong>.
                        </p>
                        
                        <p style="margin:0; font-size:13px; color:#777;">
                          If you didn't request this code, please ignore this email.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#f8f9fa; padding:24px; text-align:center; font-size:13px; color:#666; border-top:1px solid #e0e4e8;">
                        Smart Appointment & Queue Manager Team<br>
                        © ${new Date().getFullYear()} All rights reserved.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });
    } catch (error) {
      console.error('Resend email error:', error);
      throw new BadRequestException('Failed to send OTP email');
    }
  }

  static async sendWelcomeEmail(to: string, name: string, from: string): Promise<void> {
    try {
      await this.resend.emails.send({
        from,
        to,
        subject: 'Welcome to Smart Appointment & Queue Manager!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome</title>
          </head>
          <body style="margin:0; padding:0; background:#f6f9fc; font-family:Arial,Helvetica,sans-serif; color:#333;">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="padding:40px 20px;">
                  <table role="presentation" width="100%" style="max-width:520px; background:#ffffff; border-radius:8px; overflow:hidden; border:1px solid #e0e4e8;">
                    <tr>
                      <td style="background:#4f46e5; padding:32px 24px; text-align:center; color:white;">
                        <h1 style="margin:0; font-size:24px; font-weight:600;">Welcome!</h1>
                        <p style="margin:8px 0 0; font-size:15px; opacity:0.9;">Smart Appointment & Queue Manager</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:40px 32px;">
                        <p style="margin:0 0 16px; font-size:16px;">Hello ${name},</p>
                        <p style="margin:0 0 24px; font-size:15px; color:#555; line-height:1.6;">Welcome to Smart Appointment & Queue Manager! Your account has been successfully created and verified.</p>
                        <p style="margin:0 0 24px; font-size:15px; color:#555; line-height:1.6;">You can now login and start managing your appointments and queues efficiently.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#f8f9fa; padding:24px; text-align:center; font-size:13px; color:#666; border-top:1px solid #e0e4e8;">
                        Smart Appointment & Queue Manager Team<br>
                        © ${new Date().getFullYear()} All rights reserved.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });
    } catch (error) {
      console.error('Resend email error:', error);
      throw new BadRequestException('Failed to send welcome email');
    }
  }
}
