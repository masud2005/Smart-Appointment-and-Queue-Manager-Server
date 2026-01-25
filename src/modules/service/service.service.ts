import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponseUtil } from '../../utils';
import { CreateServiceDto, UpdateServiceDto } from './dto/create-service.dto';

@Injectable()
export class ServiceService {
  constructor(private prisma: PrismaService) {}

  async createService(userId: string, createServiceDto: CreateServiceDto) {
    const service = await this.prisma.client.service.create({
      data: {
        name: createServiceDto.name,
        durationMinutes: createServiceDto.durationMinutes,
        staffType: createServiceDto.staffType,
        userId,
      },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        staffType: true,
        createdAt: true,
      },
    });

    return ResponseUtil.created(service, 'Service created successfully');
  }

  async getAllServices(userId: string) {
    const services = await this.prisma.client.service.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        staffType: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return ResponseUtil.success(services, 'Services retrieved successfully');
  }

  async getServiceById(userId: string, serviceId: string) {
    const service = await this.prisma.client.service.findFirst({
      where: {
        id: serviceId,
        userId,
      },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        staffType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return ResponseUtil.success(service, 'Service retrieved successfully');
  }

  async updateService(
    userId: string,
    serviceId: string,
    updateServiceDto: UpdateServiceDto,
  ) {
    const service = await this.prisma.client.service.findFirst({
      where: {
        id: serviceId,
        userId,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const updatedService = await this.prisma.client.service.update({
      where: { id: serviceId },
      data: {
        ...(updateServiceDto.name && { name: updateServiceDto.name }),
        ...(updateServiceDto.durationMinutes && {
          durationMinutes: updateServiceDto.durationMinutes,
        }),
        ...(updateServiceDto.staffType && {
          staffType: updateServiceDto.staffType,
        }),
      },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        staffType: true,
        updatedAt: true,
      },
    });

    return ResponseUtil.success(updatedService, 'Service updated successfully');
  }

  async deleteService(userId: string, serviceId: string) {
    const service = await this.prisma.client.service.findFirst({
      where: {
        id: serviceId,
        userId,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    await this.prisma.client.service.delete({
      where: { id: serviceId },
    });

    return ResponseUtil.success(null, 'Service deleted successfully');
  }

  async getServiceBystaffType(userId: string, staffType: string) {
    const services = await this.prisma.client.service.findMany({
      where: {
        userId,
        staffType,
      },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
      },
    });

    return services;
  }
}
