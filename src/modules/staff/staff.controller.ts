import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto } from './dto/create-staff.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { GetUser } from '@/common/decorators/get-user.decorator';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('Staff Management')
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new staff member' })
  @ApiResponse({
    status: 201,
    description: 'Staff created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  createStaff(
    @GetUser('sub') userId: string,
    @Body() createStaffDto: CreateStaffDto,
  ) {
    return this.staffService.createStaff(userId, createStaffDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all staff members' })
  @ApiResponse({
    status: 200,
    description: 'Staff list retrieved successfully',
  })
  getAllStaff(@GetUser('sub') userId: string) {
    return this.staffService.getAllStaff(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff member by ID' })
  @ApiResponse({
    status: 200,
    description: 'Staff retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff not found',
  })
  getStaffById(@GetUser('sub') userId: string, @Param('id') staffId: string) {
    return this.staffService.getStaffById(userId, staffId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update staff member' })
  @ApiResponse({
    status: 200,
    description: 'Staff updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff not found',
  })
  updateStaff(
    @GetUser('sub') userId: string,
    @Param('id') staffId: string,
    @Body() updateStaffDto: UpdateStaffDto,
  ) {
    return this.staffService.updateStaff(userId, staffId, updateStaffDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete staff member' })
  @ApiResponse({
    status: 200,
    description: 'Staff deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff not found',
  })
  deleteStaff(@GetUser('sub') userId: string, @Param('id') staffId: string) {
    return this.staffService.deleteStaff(userId, staffId);
  }

  @Get('load/with-appointments')
  @ApiOperation({ summary: 'Get all staff with their daily load' })
  @ApiResponse({
    status: 200,
    description: 'Staff with daily load retrieved successfully',
  })
  getStaffWithLoad(
    @GetUser('sub') userId: string,
    @Query('date') date?: string,
  ) {
    return this.staffService.getStaffWithDailyLoad(userId, date);
  }
}
