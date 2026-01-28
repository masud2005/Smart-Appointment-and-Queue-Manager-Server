import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Smart Flow HQ API Server Running...';
  }
}
