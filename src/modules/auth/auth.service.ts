import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  RegisterDto,
  LoginDto,
  SendOtpDto,
  VerifyOtpDto,
  ResendOtpDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { JwtPayload, AuthResponse } from '../../common/interfaces/auth.types';

interface OtpStore {
  otp: string;
  expiresAt: Date;
  attempts: number;
}

@Injectable()
export class AuthService {
  private otpStore = new Map<string, OtpStore>();
  private transporter: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, name } = registerDto;
    const existingUser = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.client.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name as string,
      },
      message: 'User registered successfully',
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    const user = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      user: {
        id: user.id,
        name: user.name as string,
        email: user.email,
      },
      message: 'Login successful',
    };
  }

  async sendOtp(sendOtpDto: SendOtpDto): Promise<{ message: string }> {
    const { email } = sendOtpDto;

    const test = await this.prisma.client.user.findUnique({
      where: { email },
    })

    const user = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    this.otpStore.set(email, { otp, expiresAt, attempts: 0 });

    await this.sendOtpEmail(email, otp);

    return { message: 'OTP sent successfully to your email' };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{ message: string }> {
    const { email, otp } = verifyOtpDto;

    const storedOtp = this.otpStore.get(email);

    if (!storedOtp) {
      throw new BadRequestException('No OTP found. Please request a new one');
    }

    if (new Date() > storedOtp.expiresAt) {
      this.otpStore.delete(email);
      throw new BadRequestException('OTP has expired. Please request a new one');
    }

    if (storedOtp.attempts >= 3) {
      this.otpStore.delete(email);
      throw new BadRequestException('Too many failed attempts. Please request a new OTP');
    }

    if (storedOtp.otp !== otp) {
      storedOtp.attempts++;
      throw new BadRequestException(
        `Invalid OTP. ${3 - storedOtp.attempts} attempts remaining`,
      );
    }

    this.otpStore.delete(email);

    return { message: 'OTP verified successfully' };
  }

  async resendOtp(resendOtpDto: ResendOtpDto): Promise<{ message: string }> {
    const { email } = resendOtpDto;

    const user = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    this.otpStore.set(email, { otp, expiresAt, attempts: 0 });

    await this.sendOtpEmail(email, otp);

    return { message: 'OTP resent successfully to your email' };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.client.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    this.otpStore.set(email, { otp, expiresAt, attempts: 0 });

    await this.sendOtpEmail(email, otp);

    return { message: 'Password reset OTP sent to your email' };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { email, otp, newPassword } = resetPasswordDto;

    const storedOtp = this.otpStore.get(email);

    if (!storedOtp) {
      throw new BadRequestException('No OTP found. Please request a new one');
    }

    if (new Date() > storedOtp.expiresAt) {
      this.otpStore.delete(email);
      throw new BadRequestException('OTP has expired. Please request a new one');
    }

    if (storedOtp.attempts >= 3) {
      this.otpStore.delete(email);
      throw new BadRequestException('Too many failed attempts. Please request a new OTP');
    }

    if (storedOtp.otp !== otp) {
      storedOtp.attempts++;
      throw new BadRequestException(
        `Invalid OTP. ${3 - storedOtp.attempts} attempts remaining`,
      );
    }

    this.otpStore.delete(email);

    const user = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.client.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    return { message: 'Password reset successfully' };
  }

  generateAccessToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendOtpEmail(email: string, otp: string): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM'),
      to: email,
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
}