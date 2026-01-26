import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Smart Appointment & Queue Manager API Server Running...';
  }
}
