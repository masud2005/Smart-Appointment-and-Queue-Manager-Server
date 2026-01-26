import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
	constructor(private readonly dashboardService: DashboardService) {}

	@Get('summary')
	@ApiOperation({ summary: 'Get today dashboard summary' })
	@ApiResponse({ status: 200, description: 'Dashboard summary retrieved' })
	getSummary(
		@GetUser('sub') userId: string,
		@Query('date') date?: string,
	) {
		return this.dashboardService.getDashboardSummary(userId, date);
	}

	@Get('staff-load')
	@ApiOperation({ summary: 'Get staff load summary' })
	@ApiResponse({ status: 200, description: 'Staff load retrieved' })
	getStaffLoad(
		@GetUser('sub') userId: string,
		@Query('date') date?: string,
	) {
		return this.dashboardService.getStaffLoadSummary(userId, date);
	}

	@Get('activity-logs')
	@ApiOperation({ summary: 'Get recent activity logs' })
	@ApiResponse({ status: 200, description: 'Activity logs retrieved' })
	getActivityLogs(
		@GetUser('sub') userId: string,
		@Query('limit') limit: string = '10',
	) {
		return this.dashboardService.getRecentActivityLogs(userId, parseInt(limit));
	}
}
