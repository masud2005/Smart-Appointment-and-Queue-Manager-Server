import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ServiceService } from './service.service';

import { CreateServiceDto, UpdateServiceDto } from './dto/create-service.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { GetUser } from '@/common/decorators/get-user.decorator';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('Service Management')
@Controller('services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new service' })
  @ApiResponse({
    status: 201,
    description: 'Service created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  createService(
    @GetUser('sub') userId: string,
    @Body() createServiceDto: CreateServiceDto,
  ) {
    return this.serviceService.createService(userId, createServiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all services' })
  @ApiResponse({
    status: 200,
    description: 'Services retrieved successfully',
  })
  getAllServices(@GetUser('sub') userId: string) {
    return this.serviceService.getAllServices(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID' })
  @ApiResponse({
    status: 200,
    description: 'Service retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  getServiceById(
    @GetUser('sub') userId: string,
    @Param('id') serviceId: string,
  ) {
    return this.serviceService.getServiceById(userId, serviceId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update service' })
  @ApiResponse({
    status: 200,
    description: 'Service updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  updateService(
    @GetUser('sub') userId: string,
    @Param('id') serviceId: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.serviceService.updateService(
      userId,
      serviceId,
      updateServiceDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete service' })
  @ApiResponse({
    status: 200,
    description: 'Service deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  deleteService(
    @GetUser('sub') userId: string,
    @Param('id') serviceId: string,
  ) {
    return this.serviceService.deleteService(userId, serviceId);
  }
}
