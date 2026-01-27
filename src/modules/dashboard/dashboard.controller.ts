import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DateRangeFilter } from '@/common/enums/date-range-filter.enum';
import { GetUser } from '@/common/decorators/get-user.decorator';
@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get dashboard summary' })
  @ApiQuery({
    name: 'range',
    enum: DateRangeFilter,
    required: false,
    description: 'Date range filter (default: ALL)',
  })
  @ApiResponse({ status: 200, description: 'Dashboard summary retrieved' })
  getSummary(
    @GetUser('sub') userId: string,
    @Query('range') range: DateRangeFilter = DateRangeFilter.ALL,
  ) {
    return this.dashboardService.getDashboardSummary(userId, range);
  }

  @Get('staff-load')
  @ApiOperation({ summary: 'Get staff load summary' })
  @ApiQuery({
    name: 'range',
    enum: DateRangeFilter,
    required: false,
    description: 'Date range filter (default: ALL)',
  })
  @ApiResponse({ status: 200, description: 'Staff load retrieved' })
  getStaffLoad(
    @GetUser('sub') userId: string,
    @Query('range') range: DateRangeFilter = DateRangeFilter.ALL,
  ) {
    return this.dashboardService.getStaffLoadSummary(userId, range);
  }

  @Get('activity-logs')
  @ApiOperation({ summary: 'Get recent activity logs' })
  @ApiQuery({
    name: 'range',
    enum: DateRangeFilter,
    required: false,
    description: 'Date range filter (default: ALL)',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Number of logs to return (default: 10)',
  })
  @ApiResponse({ status: 200, description: 'Activity logs retrieved' })
  getActivityLogs(
    @GetUser('sub') userId: string,
    @Query('range') range: DateRangeFilter = DateRangeFilter.ALL,
    @Query('limit') limit: string = '10',
  ) {
    return this.dashboardService.getRecentActivityLogs(
      userId,
      range,
      parseInt(limit),
    );
  }
}
