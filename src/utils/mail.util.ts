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
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
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
      subject: 'Your OTP Code - Smart Appointment Manager',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Smart Appointment Manager</h2>
          <p>Your OTP code is:</p>
          <h1 style="background-color: #f4f4f4; padding: 20px; text-align: center; letter-spacing: 5px;">
            ${otp}
          </h1>
          <p>This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
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
      subject: 'Welcome to Smart Appointment Manager',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome ${name}!</h2>
          <p>Thank you for registering with Smart Appointment Manager.</p>
          <p>We're excited to have you on board.</p>
          <p style="color: #666; font-size: 12px;">If you didn't create this account, please contact us immediately.</p>
        </div>
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
    const mailOptions = {
      from,
      to,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      throw new BadRequestException('Failed to send email');
    }
  }
}
