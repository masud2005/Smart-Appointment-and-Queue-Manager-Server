export class OtpUtil {
  private static readonly OTP_LENGTH = 6;
  private static readonly OTP_EXPIRY_MINUTES = 10;

  static generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static getOtpExpiryDate(): Date {
    return new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
  }

  static isOtpExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }
}
