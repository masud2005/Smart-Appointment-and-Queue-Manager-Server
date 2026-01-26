import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from '@nestjs/swagger';
import { AppointmentService } from './appointment.service';
import {
	CreateAppointmentDto,
	FilterAppointmentsDto,
	UpdateAppointmentDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentController {
	constructor(private readonly appointmentService: AppointmentService) {}

	@Post()
	@ApiOperation({ summary: 'Create appointment' })
	@ApiResponse({ status: 201, description: 'Appointment created' })
	create(
		@GetUser('sub') userId: string,
		@Body() dto: CreateAppointmentDto,
	) {
		return this.appointmentService.createAppointment(userId, dto);
	}

	@Get()
	@ApiOperation({ summary: 'List appointments with filters' })
	@ApiResponse({ status: 200, description: 'Appointments retrieved' })
	findAll(
		@GetUser('sub') userId: string,
		@Query() filters: FilterAppointmentsDto,
	) {
		return this.appointmentService.getAppointments(userId, filters);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get appointment by id' })
	@ApiResponse({ status: 200, description: 'Appointment retrieved' })
	findOne(@GetUser('sub') userId: string, @Param('id') id: string) {
		return this.appointmentService.getAppointmentById(userId, id);
	}

	@Patch(':id')
	@ApiOperation({ summary: 'Update appointment' })
	@ApiResponse({ status: 200, description: 'Appointment updated' })
	update(
		@GetUser('sub') userId: string,
		@Param('id') id: string,
		@Body() dto: UpdateAppointmentDto,
	) {
		return this.appointmentService.updateAppointment(userId, id, dto);
	}

	@Patch(':id/cancel')
	@ApiOperation({ summary: 'Cancel appointment' })
	@ApiResponse({ status: 200, description: 'Appointment cancelled' })
	cancel(@GetUser('sub') userId: string, @Param('id') id: string) {
		return this.appointmentService.cancelAppointment(userId, id);
	}

	@Patch(':id/complete')
	@ApiOperation({ summary: 'Mark appointment as completed' })
	@ApiResponse({ status: 200, description: 'Appointment completed' })
	@ApiResponse({ status: 400, description: 'Only scheduled appointments can be completed' })
	complete(@GetUser('sub') userId: string, @Param('id') id: string) {
		return this.appointmentService.completeAppointment(userId, id);
	}
}
