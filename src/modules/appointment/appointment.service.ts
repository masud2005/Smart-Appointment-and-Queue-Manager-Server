import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponseUtil } from '../../utils';
import {
  CreateAppointmentDto,
  FilterAppointmentsDto,
  UpdateAppointmentDto,
} from './dto';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';

type AppointmentStatusType =
  (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

@Injectable()
export class AppointmentService {
  constructor(private prisma: PrismaService) {}

  private getDayRange(date: Date) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);
    return { start, end };
  }

  private async getService(userId: string, serviceId: string) {
    const service = await this.prisma.client.service.findFirst({
      where: { id: serviceId, userId },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        staffType: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60000);
  }

  private async staffEligibility(
    staffId: string,
    userId: string,
    requiredStaffType: string,
    start: Date,
    end: Date,
    excludeAppointmentId?: string,
  ) {
    const staff = await this.prisma.client.staff.findFirst({
      where: { id: staffId, userId },
      select: {
        id: true,
        name: true,
        serviceType: true,
        dailyCapacity: true,
        availabilityStatus: true,
      },
    });

    if (!staff) {
      return { ok: false, reason: 'Staff not found' };
    }

    if (staff.availabilityStatus !== 'AVAILABLE') {
      return { ok: false, reason: 'Staff is on leave' };
    }

    if (staff.serviceType !== requiredStaffType) {
      return { ok: false, reason: 'Staff service type mismatch' };
    }

    const { start: dayStart, end: dayEnd } = this.getDayRange(start);

    const todaysCount = await this.prisma.client.appointment.count({
      where: {
        staffId: staff.id,
        status: AppointmentStatus.SCHEDULED,
        dateTime: { gte: dayStart, lte: dayEnd },
      },
    });

    if (todaysCount >= staff.dailyCapacity) {
      return {
        ok: false,
        reason: `${staff.name} already has ${todaysCount} appointments today.`,
      };
    }

    const conflict = await this.prisma.client.appointment.findFirst({
      where: {
        staffId: staff.id,
        status: AppointmentStatus.SCHEDULED,
        dateTime: { lt: end },
        endTime: { gt: start },
        ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
      },
    });

    if (conflict) {
      return {
        ok: false,
        reason: 'This staff member already has an appointment at this time.',
      };
    }

    return { ok: true, staff, todaysCount };
  }

  private async findAutoStaff(
    userId: string,
    requiredStaffType: string,
    start: Date,
    end: Date,
  ) {
    const staffList = await this.prisma.client.staff.findMany({
      where: {
        userId,
        serviceType: requiredStaffType,
        availabilityStatus: 'AVAILABLE',
      },
      select: {
        id: true,
        name: true,
        dailyCapacity: true,
      },
    });

    let selected: { id: string; name: string; count: number } | null = null;

    for (const staff of staffList) {
      const eligibility = await this.staffEligibility(
        staff.id,
        userId,
        requiredStaffType,
        start,
        end,
      );

      if (eligibility.ok) {
        const count = eligibility.todaysCount ?? 0;
        if (!selected || count < selected.count) {
          selected = { id: staff.id, name: staff.name, count };
        }
      }
    }

    return selected;
  }

  private async reorderQueue(userId: string) {
    const waiting = await this.prisma.client.appointment.findMany({
      where: { userId, status: AppointmentStatus.WAITING },
      orderBy: [{ dateTime: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });

    for (let i = 0; i < waiting.length; i++) {
      await this.prisma.client.appointment.update({
        where: { id: waiting[i].id },
        data: { queuePosition: i + 1 },
      });
    }

    return waiting.length + 1;
  }

  async createAppointment(userId: string, dto: CreateAppointmentDto) {
    const service = await this.getService(userId, dto.serviceId);
    const start = new Date(dto.dateTime);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    const end = this.addMinutes(start, service.durationMinutes);

    let staffId: string | null = null;
    let status: AppointmentStatusType = AppointmentStatus.SCHEDULED;
    let message = 'Appointment scheduled successfully';

    if (dto.staffId) {
      const eligibility = await this.staffEligibility(
        dto.staffId,
        userId,
        service.staffType,
        start,
        end,
      );

      if (eligibility.ok) {
        staffId = dto.staffId;
      } else {
        status = AppointmentStatus.WAITING;
        message =
          eligibility.reason || 'Staff unavailable, added to waiting queue';
      }
    } else {
      const auto = await this.findAutoStaff(
        userId,
        service.staffType,
        start,
        end,
      );

      if (auto) {
        staffId = auto.id;
      } else {
        status = AppointmentStatus.WAITING;
        message = 'No staff available, added to waiting queue';
      }
    }

    let queuePosition: number | null = null;
    if (status === AppointmentStatus.WAITING) {
      queuePosition = await this.reorderQueue(userId);
    }

    const appointment = await this.prisma.client.appointment.create({
      data: {
        customerName: dto.customerName,
        dateTime: start,
        endTime: end,
        status,
        queuePosition,
        userId,
        serviceId: service.id,
        staffId,
      },
      select: {
        id: true,
        customerName: true,
        dateTime: true,
        endTime: true,
        status: true,
        queuePosition: true,
        staffId: true,
        serviceId: true,
      },
    });

    return ResponseUtil.created(appointment, message);
  }

  async getAppointments(userId: string, filters: FilterAppointmentsDto) {
    let dateFilter;
    if (filters.date) {
      const date = new Date(filters.date);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('Invalid date');
      }
      const { start, end } = this.getDayRange(date);
      dateFilter = { gte: start, lte: end };
    }

    const appointments = await this.prisma.client.appointment.findMany({
      where: {
        userId,
        ...(filters.staffId && { staffId: filters.staffId }),
        ...(filters.status && { status: filters.status }),
        ...(dateFilter && { dateTime: dateFilter }),
      },
      orderBy: [{ dateTime: 'asc' }],
      select: {
        id: true,
        customerName: true,
        dateTime: true,
        endTime: true,
        status: true,
        queuePosition: true,
        staffId: true,
        serviceId: true,
      },
    });

    return ResponseUtil.success(
      appointments,
      'Appointments retrieved successfully',
    );
  }

  async getAppointmentsWithDetails(
    userId: string,
    filters: FilterAppointmentsDto,
  ) {
    let dateFilter;
    if (filters.date) {
      const date = new Date(filters.date);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('Invalid date');
      }
      const { start, end } = this.getDayRange(date);
      dateFilter = { gte: start, lte: end };
    }

    const appointments = await this.prisma.client.appointment.findMany({
      where: {
        userId,
        ...(filters.staffId && { staffId: filters.staffId }),
        ...(filters.status && { status: filters.status }),
        ...(dateFilter && { dateTime: dateFilter }),
      },
      orderBy: [{ dateTime: 'asc' }],
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            serviceType: true,
            dailyCapacity: true,
            availabilityStatus: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            staffType: true,
          },
        },
      },
    });

    return ResponseUtil.success(
      appointments,
      'Appointments with details retrieved successfully',
    );
  }

  async getAppointmentById(userId: string, id: string) {
    const appointment = await this.prisma.client.appointment.findFirst({
      where: { id, userId },
      select: {
        id: true,
        customerName: true,
        dateTime: true,
        endTime: true,
        status: true,
        queuePosition: true,
        staffId: true,
        serviceId: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return ResponseUtil.success(
      appointment,
      'Appointment retrieved successfully',
    );
  }

  async getAppointmentByIdWithDetails(userId: string, id: string) {
    const appointment = await this.prisma.client.appointment.findFirst({
      where: { id, userId },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            serviceType: true,
            dailyCapacity: true,
            availabilityStatus: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            staffType: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return ResponseUtil.success(
      appointment,
      'Appointment with details retrieved successfully',
    );
  }

  async updateAppointment(
    userId: string,
    id: string,
    dto: UpdateAppointmentDto,
  ) {
    const appointment = await this.prisma.client.appointment.findFirst({
      where: { id, userId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const service = await this.getService(userId, appointment.serviceId);

    let dateTime = appointment.dateTime;
    if (dto.dateTime) {
      const newDate = new Date(dto.dateTime);
      if (Number.isNaN(newDate.getTime())) {
        throw new BadRequestException('Invalid date');
      }
      dateTime = newDate;
    }

    const endTime = this.addMinutes(dateTime, service.durationMinutes);

    let staffId = appointment.staffId;
    if (dto.staffId !== undefined) {
      staffId = dto.staffId;
    }

    let status: AppointmentStatusType =
      (dto.status as AppointmentStatusType | undefined) ??
      (appointment.status as AppointmentStatusType);

    if (status === AppointmentStatus.CANCELLED) {
      const updated = await this.prisma.client.appointment.update({
        where: { id },
        data: {
          customerName: dto.customerName ?? appointment.customerName,
          dateTime,
          endTime,
          status: AppointmentStatus.CANCELLED,
          queuePosition: null,
          staffId,
        },
        select: {
          id: true,
          customerName: true,
          dateTime: true,
          endTime: true,
          status: true,
          queuePosition: true,
          staffId: true,
          serviceId: true,
        },
      });

      if (appointment.queuePosition) {
        await this.reorderQueue(userId);
      }

      return ResponseUtil.success(
        updated,
        'Appointment cancelled successfully',
      );
    }

    if (!staffId) {
      status = AppointmentStatus.WAITING;
    }

    if (staffId) {
      const eligibility = await this.staffEligibility(
        staffId,
        userId,
        service.staffType,
        dateTime,
        endTime,
        id,
      );

      if (!eligibility.ok) {
        throw new ConflictException(eligibility.reason);
      }

      status = AppointmentStatus.SCHEDULED;
    }

    let queuePosition: number | null = null;
    if (status === AppointmentStatus.WAITING) {
      queuePosition = await this.reorderQueue(userId);
      staffId = null;
    }

    if (appointment.queuePosition && status !== AppointmentStatus.WAITING) {
      await this.prisma.client.appointment.update({
        where: { id: appointment.id },
        data: { queuePosition: null },
      });
      await this.reorderQueue(userId);
    }

    const updated = await this.prisma.client.appointment.update({
      where: { id },
      data: {
        customerName: dto.customerName ?? appointment.customerName,
        dateTime,
        endTime,
        status,
        queuePosition,
        staffId,
      },
      select: {
        id: true,
        customerName: true,
        dateTime: true,
        endTime: true,
        status: true,
        queuePosition: true,
        staffId: true,
        serviceId: true,
      },
    });

    return ResponseUtil.success(updated, 'Appointment updated successfully');
  }

  async cancelAppointment(userId: string, id: string) {
    const appointment = await this.prisma.client.appointment.findFirst({
      where: { id, userId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const cancelled = await this.prisma.client.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        queuePosition: null,
      },
      select: {
        id: true,
        customerName: true,
        dateTime: true,
        endTime: true,
        status: true,
        queuePosition: true,
        staffId: true,
        serviceId: true,
      },
    });

    if (appointment.queuePosition) {
      await this.reorderQueue(userId);
    }

    return ResponseUtil.success(
      cancelled,
      'Appointment cancelled successfully',
    );
  }

  async completeAppointment(userId: string, id: string) {
    const appointment = await this.prisma.client.appointment.findFirst({
      where: { id, userId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException(
        'Only scheduled appointments can be marked as completed',
      );
    }

    const completed = await this.prisma.client.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.COMPLETED,
      },
      select: {
        id: true,
        customerName: true,
        dateTime: true,
        endTime: true,
        status: true,
        queuePosition: true,
        staffId: true,
        serviceId: true,
      },
    });

    return ResponseUtil.success(
      completed,
      'Appointment completed successfully',
    );
  }

  async markNoShow(userId: string, id: string) {
    const appointment = await this.prisma.client.appointment.findFirst({
      where: { id, userId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException(
        'Only scheduled appointments can be marked as no-show',
      );
    }

    const noShow = await this.prisma.client.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.NO_SHOW,
      },
      select: {
        id: true,
        customerName: true,
        dateTime: true,
        endTime: true,
        status: true,
        queuePosition: true,
        staffId: true,
        serviceId: true,
      },
    });

    return ResponseUtil.success(
      noShow,
      'Appointment marked as no-show successfully',
    );
  }

  async getAvailableStaffWithLoad(
    userId: string,
    serviceId: string,
    date?: string,
  ) {
    const service = await this.getService(userId, serviceId);
    const targetDate = date ? new Date(date) : new Date();
    const { start: dayStart, end: dayEnd } = this.getDayRange(targetDate);

    const staffList = await this.prisma.client.staff.findMany({
      where: {
        userId,
        serviceType: service.staffType,
        availabilityStatus: 'AVAILABLE',
      },
      select: {
        id: true,
        name: true,
        dailyCapacity: true,
      },
      orderBy: { name: 'asc' },
    });

    const staffWithLoad = await Promise.all(
      staffList.map(async (staff) => {
        const appointmentCount = await this.prisma.client.appointment.count({
          where: {
            staffId: staff.id,
            status: AppointmentStatus.SCHEDULED,
            dateTime: { gte: dayStart, lte: dayEnd },
          },
        });

        return {
          id: staff.id,
          name: staff.name,
          currentLoad: appointmentCount,
          dailyCapacity: staff.dailyCapacity,
          availableSlots: staff.dailyCapacity - appointmentCount,
          isAtCapacity: appointmentCount >= staff.dailyCapacity,
        };
      }),
    );

    return ResponseUtil.success(
      staffWithLoad,
      'Staff with load retrieved successfully',
    );
  }
}
