import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../common/interfaces/auth.types';

export class JwtUtil {
  static generateAccessToken(
    jwtService: JwtService,
    userId: string,
    email: string,
  ): string {
    const payload: JwtPayload = { sub: userId, email };
    return jwtService.sign(payload);
  }
}
