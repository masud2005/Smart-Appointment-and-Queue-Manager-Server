import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { AssignFromQueueDto } from './dto';

@ApiTags('Queue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('waiting')
  @ApiOperation({ summary: 'List waiting appointments' })
  @ApiResponse({ status: 200, description: 'Waiting appointments retrieved' })
  listWaiting(@GetUser('sub') userId: string) {
    return this.queueService.getWaitingAppointments(userId);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign earliest eligible appointment to a staff' })
  @ApiResponse({ status: 200, description: 'Appointment assigned' })
  assign(@GetUser('sub') userId: string, @Body() dto: AssignFromQueueDto) {
    return this.queueService.assignFromQueue(userId, dto.staffId);
  }
}
