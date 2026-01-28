import * as nodemailer from 'nodemailer';
import { BadRequestException } from '@nestjs/common';
import { MailConfig } from '../config/mail.config';

export class MailUtil {
  private static transporter: nodemailer.Transporter;

  static initialize(config: MailConfig): void {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: config.requireTLS ?? true,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
        servername: 'smtp.gmail.com',
      },
      connectionTimeout: config.connectionTimeout || 30000,
      greetingTimeout: config.greetingTimeout || 30000,
      socketTimeout: config.socketTimeout || 30000,
    });
  }

  static async sendOtpEmail(
    to: string,
    otp: string,
    from: string,
  ): Promise<void> {
    const mailOptions = {
      from,
      to,
      subject: 'Your Verification Code - Smart Flow HQ',
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
                    <td style="background:#0d9488; padding:32px 24px; text-align:center; color:white;">
                      <h1 style="margin:0; font-size:24px; font-weight:600;">Verification Code</h1>
                      <p style="margin:8px 0 0; font-size:15px; opacity:0.9;">Smart Flow HQ</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px 32px; text-align:center;">
                      <p style="margin:0 0 24px; font-size:16px; line-height:1.5;">Hello,</p>
                      <p style="margin:0 0 32px; font-size:15px; color:#555;">Use the code below to verify your account:</p>
                      
                      <div style="font-size:36px; font-weight:bold; letter-spacing:8px; color:#0d9488; background:#f8f9fa; padding:20px; border-radius:8px; margin:0 auto 32px; max-width:240px;">
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
                      Smart Flow HQ Team<br>
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
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Email sending error:', error);
      throw new BadRequestException('Failed to send OTP email');
    }
  }

  static async sendWelcomeEmail(
    to: string,
    name: string,
    from: string,
  ): Promise<void> {
    const mailOptions = {
      from,
      to,
      subject: 'Welcome to Smart Flow HQ!',
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
                    <td style="background:#0d9488; padding:32px 24px; text-align:center; color:white;">
                      <h1 style="margin:0; font-size:26px; font-weight:600;">Welcome aboard!</h1>
                      <p style="margin:8px 0 0; font-size:15px; opacity:0.9;">Smart Flow HQ</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px 32px;">
                      <p style="margin:0 0 20px; font-size:18px; font-weight:600;">Hi ${name},</p>
                      <p style="margin:0 0 28px; font-size:15px; line-height:1.6; color:#555;">
                        Thank you for joining Smart Flow HQ.<br>
                        We're excited to have you with us!
                      </p>

                      <div style="background:#f8f9fa; padding:24px; border-radius:8px; margin:0 0 32px;">
                        <p style="margin:0 0 16px; font-weight:600; color:#444;">What you can do now:</p>
                        <ul style="margin:0; padding-left:20px; font-size:14px; line-height:1.8; color:#555;">
                          <li>Book appointments quickly</li>
                          <li>Join & manage queues</li>
                          <li>Get real-time updates</li>
                        </ul>
                      </div>

                      <div style="text-align:center; margin:0 0 32px;">
                        <a href="#" style="display:inline-block; background:#0d9488; color:white; text-decoration:none; padding:14px 36px; border-radius:6px; font-weight:600; font-size:15px;">
                          Get Started
                        </a>
                      </div>

                      <p style="margin:0; font-size:14px; color:#666; text-align:center;">
                        Need help? Contact support anytime.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f8f9fa; padding:24px; text-align:center; font-size:13px; color:#666; border-top:1px solid #e0e4e8;">
                      Smart Flow HQ Team<br>
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
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }

  static async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
    from: string,
  ): Promise<void> {
    const mailOptions = { from, to, subject, html };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch {
      throw new BadRequestException('Failed to send email');
    }
  }
}
