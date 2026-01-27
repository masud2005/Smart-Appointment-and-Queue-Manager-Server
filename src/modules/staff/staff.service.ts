import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponseUtil } from '../../utils';
import { CreateStaffDto, UpdateStaffDto } from './dto/create-staff.dto';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  private getDayRange(date: Date) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);
    return { start, end };
  }

  async createStaff(userId: string, createStaffDto: CreateStaffDto) {
    const staff = await this.prisma.client.staff.create({
      data: {
        name: createStaffDto.name,
        serviceType: createStaffDto.serviceType,
        dailyCapacity: createStaffDto.dailyCapacity,
        userId,
      },
      select: {
        id: true,
        name: true,
        serviceType: true,
        dailyCapacity: true,
        availabilityStatus: true,
        createdAt: true,
      },
    });

    return ResponseUtil.created(staff, 'Staff created successfully');
  }

  async getAllStaff(userId: string) {
    const staffList = await this.prisma.client.staff.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        serviceType: true,
        dailyCapacity: true,
        availabilityStatus: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return ResponseUtil.success(staffList, 'Staff list retrieved successfully');
  }

  async getStaffById(userId: string, staffId: string) {
    const staff = await this.prisma.client.staff.findFirst({
      where: {
        id: staffId,
        userId,
      },
      select: {
        id: true,
        name: true,
        serviceType: true,
        dailyCapacity: true,
        availabilityStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    return ResponseUtil.success(staff, 'Staff retrieved successfully');
  }

  async updateStaff(
    userId: string,
    staffId: string,
    updateStaffDto: UpdateStaffDto,
  ) {
    const staff = await this.prisma.client.staff.findFirst({
      where: {
        id: staffId,
        userId,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    const dataToUpdate: any = {};
    if (updateStaffDto.name) dataToUpdate.name = updateStaffDto.name;
    if (updateStaffDto.serviceType)
      dataToUpdate.serviceType = updateStaffDto.serviceType;
    if (updateStaffDto.dailyCapacity)
      dataToUpdate.dailyCapacity = updateStaffDto.dailyCapacity;
    if (updateStaffDto.availabilityStatus)
      dataToUpdate.availabilityStatus = updateStaffDto.availabilityStatus;

    const updatedStaff = await this.prisma.client.staff.update({
      where: { id: staffId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        serviceType: true,
        dailyCapacity: true,
        availabilityStatus: true,
        updatedAt: true,
      },
    });

    return ResponseUtil.success(updatedStaff, 'Staff updated successfully');
  }

  async deleteStaff(userId: string, staffId: string) {
    const staff = await this.prisma.client.staff.findFirst({
      where: {
        id: staffId,
        userId,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    await this.prisma.client.staff.delete({
      where: { id: staffId },
    });

    return ResponseUtil.success(null, 'Staff deleted successfully');
  }

  async getAvailableStaff(userId: string, serviceType: string) {
    const availableStaff = await this.prisma.client.staff.findMany({
      where: {
        userId,
        serviceType,
        availabilityStatus: 'AVAILABLE',
      },
      select: {
        id: true,
        name: true,
        serviceType: true,
        dailyCapacity: true,
      },
    });

    return availableStaff;
  }

  async getStaffWithDailyLoad(userId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const { start: dayStart, end: dayEnd } = this.getDayRange(targetDate);

    const staff = await this.prisma.client.staff.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        serviceType: true,
        dailyCapacity: true,
        availabilityStatus: true,
      },
      orderBy: { name: 'asc' },
    });

    const staffWithLoad = await Promise.all(
      staff.map(async (s) => {
        const appointmentCount = await this.prisma.client.appointment.count({
          where: {
            staffId: s.id,
            status: AppointmentStatus.SCHEDULED,
            dateTime: { gte: dayStart, lte: dayEnd },
          },
        });

        const isAtCapacity = appointmentCount >= s.dailyCapacity;

        return {
          id: s.id,
          name: s.name,
          serviceType: s.serviceType,
          dailyCapacity: s.dailyCapacity,
          currentLoad: appointmentCount,
          availableSlots: s.dailyCapacity - appointmentCount,
          availabilityStatus: s.availabilityStatus,
          isAtCapacity,
        };
      }),
    );

    return ResponseUtil.success(
      staffWithLoad,
      'Staff with daily load retrieved successfully',
    );
  }
}
