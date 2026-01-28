/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getMailConfig } from '../../config/mail.config';
import {
  CryptoUtil,
  JwtUtil,
  MailUtil,
  OtpUtil,
  ResponseUtil,
} from '../../utils';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendOtpDto,
  ResetPasswordDto,
  SendOtpDto,
  VerifyOtpDto,
} from './dto';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const mailConfig = getMailConfig();
    MailUtil.initialize(mailConfig);
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;
    const existingUser = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await CryptoUtil.hashPassword(password);

    const user = await this.prisma.client.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        isVerified: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isVerified: true,
      },
    });

    await this.prisma.client.userOtp.deleteMany({
      where: { userId: user.id },
    });

    const otp = OtpUtil.generateOtp();
    const expiresAt = OtpUtil.getOtpExpiryDate();

    await this.prisma.client.userOtp.create({
      data: {
        code: otp,
        type: 'VERIFICATION',
        userId: user.id,
        expiresAt,
      },
    });

    if (user?.isVerified === false) {
      const from = this.configService.get<string>('SMTP_FROM') || '';
      await MailUtil.sendOtpEmail(email, otp, from);
    }

    return ResponseUtil.created(
      user,
      user.isVerified ? 'Registration successful.' : 'Registration successful. Please verify your email using the OTP sent to your inbox.',
    );
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Please verify your email first. Check your inbox for the verification code.',
      );
    }

    const isPasswordValid = await CryptoUtil.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const responseData: any = user;

    if (this.configService.get<string>('NODE_ENV') === 'development') {
      responseData.token = JwtUtil.generateAccessToken(
        this.jwtService,
        user.id,
        user.email,
      );
    }

    return ResponseUtil.success(responseData, 'Login successful');
  }

  async sendOtp(sendOtpDto: SendOtpDto) {
    const { email } = sendOtpDto;

    const user = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.client.userOtp.deleteMany({
      where: { userId: user.id },
    });

    const otp = OtpUtil.generateOtp();
    const expiresAt = OtpUtil.getOtpExpiryDate();

    await this.prisma.client.userOtp.create({
      data: {
        code: otp,
        type: 'VERIFICATION',
        userId: user.id,
        expiresAt,
      },
    });

    const from = this.configService.get<string>('SMTP_FROM') || '';
    await MailUtil.sendOtpEmail(email, otp, from);

    return ResponseUtil.success(null, 'OTP sent successfully to your email');
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, otp } = verifyOtpDto;

    const user = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const storedOtp = await this.prisma.client.userOtp.findFirst({
      where: {
        userId: user.id,
        code: otp,
      },
    });

    if (!storedOtp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (OtpUtil.isOtpExpired(storedOtp.expiresAt)) {
      await this.prisma.client.userOtp.delete({ where: { id: storedOtp.id } });
      throw new BadRequestException(
        'OTP has expired. Please request a new one',
      );
    }

    if (storedOtp.type === 'VERIFICATION') {
      await this.prisma.client.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
    }

    await this.prisma.client.userOtp.delete({ where: { id: storedOtp.id } });

    const token = JwtUtil.generateAccessToken(
      this.jwtService,
      user.id,
      user.email,
    );

    const userResponse = { ...user, token };

    return ResponseUtil.success(userResponse, 'OTP verified successfully');
  }

  async resendOtp(resendOtpDto: ResendOtpDto) {
    const { email } = resendOtpDto;

    const user = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingOtp = await this.prisma.client.userOtp.findFirst({
      where: { userId: user.id },
    });

    const otpType = existingOtp?.type || 'VERIFICATION';

    await this.prisma.client.userOtp.deleteMany({
      where: { userId: user.id },
    });

    const otp = OtpUtil.generateOtp();
    const expiresAt = OtpUtil.getOtpExpiryDate();

    await this.prisma.client.userOtp.create({
      data: {
        code: otp,
        type: otpType,
        userId: user.id,
        expiresAt,
      },
    });

    const from = this.configService.get<string>('SMTP_FROM') || '';
    await MailUtil.sendOtpEmail(email, otp, from);

    return ResponseUtil.success(null, 'OTP resent successfully to your email');
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await CryptoUtil.comparePassword(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedNewPassword = await CryptoUtil.hashPassword(newPassword);

    await this.prisma.client.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return ResponseUtil.success(null, 'Password changed successfully');
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.client.userOtp.deleteMany({
      where: { userId: user.id },
    });

    const otp = OtpUtil.generateOtp();
    const expiresAt = OtpUtil.getOtpExpiryDate();

    await this.prisma.client.userOtp.create({
      data: {
        code: otp,
        type: 'RESET_PASSWORD',
        userId: user.id,
        expiresAt,
      },
    });

    const from = this.configService.get<string>('SMTP_FROM') || '';
    await MailUtil.sendOtpEmail(email, otp, from);

    return ResponseUtil.success(null, 'Password reset OTP sent to your email');
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, otp, newPassword } = resetPasswordDto;

    const user = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const storedOtp = await this.prisma.client.userOtp.findFirst({
      where: {
        userId: user.id,
        code: otp,
        type: 'RESET_PASSWORD',
      },
    });

    if (!storedOtp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (OtpUtil.isOtpExpired(storedOtp.expiresAt)) {
      await this.prisma.client.userOtp.delete({ where: { id: storedOtp.id } });
      throw new BadRequestException(
        'OTP has expired. Please request a new one',
      );
    }

    const hashedPassword = await CryptoUtil.hashPassword(newPassword);

    await this.prisma.client.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    await this.prisma.client.userOtp.delete({ where: { id: storedOtp.id } });

    return ResponseUtil.success(null, 'Password reset successfully');
  }
}
