import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponseUtil } from '../../utils';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';

@Injectable()
export class QueueService {
  constructor(private prisma: PrismaService) {}

  private getDayRange(date: Date) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);
    return { start, end };
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60000);
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
  }

  private async findNextAvailableSlot(
    staffId: string,
    userId: string,
    startFrom: Date,
    durationMinutes: number,
    dailyCapacity: number,
  ) {
    const now = new Date();
    let candidateStart = startFrom > now ? startFrom : now;
    const { start: dayStart, end: dayEnd } = this.getDayRange(candidateStart);
    if (candidateStart < dayStart) {
      candidateStart = dayStart;
    }

    const existing = await this.prisma.client.appointment.findMany({
      where: {
        staffId,
        userId,
        status: AppointmentStatus.SCHEDULED,
        dateTime: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { dateTime: 'asc' },
      select: { dateTime: true, endTime: true },
    });

    if (existing.length >= dailyCapacity) {
      return null;
    }

    for (const slot of existing) {
      if (candidateStart >= slot.endTime) {
        continue;
      }
      const candidateEnd = this.addMinutes(candidateStart, durationMinutes);
      if (candidateEnd <= slot.dateTime) {
        return { start: candidateStart, end: candidateEnd };
      }
      candidateStart = slot.endTime;
    }

    const candidateEnd = this.addMinutes(candidateStart, durationMinutes);
    if (candidateEnd > dayEnd) {
      return null;
    }

    return { start: candidateStart, end: candidateEnd };
  }

  private async staffEligibility(
    staffId: string,
    userId: string,
    requiredStaffType: string,
    start: Date,
    end: Date,
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

    const dayStart = new Date(start);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(start);
    dayEnd.setUTCHours(23, 59, 59, 999);

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
      },
    });

    if (conflict) {
      return {
        ok: false,
        reason: 'This staff member already has an appointment at this time.',
      };
    }

    return { ok: true };
  }

  async getWaitingAppointments(userId: string) {
    const waiting = await this.prisma.client.appointment.findMany({
      where: { userId, status: AppointmentStatus.WAITING },
      orderBy: [{ queuePosition: 'asc' }, { dateTime: 'asc' }],
      select: {
        id: true,
        customerName: true,
        dateTime: true,
        endTime: true,
        queuePosition: true,
        serviceId: true,
        service: {
          select: {
            name: true,
            durationMinutes: true,
            staffType: true,
          },
        },
      },
    });

    return ResponseUtil.success(
      waiting,
      'Waiting queue retrieved successfully',
    );
  }

  async assignFromQueue(userId: string, staffId: string) {
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
      throw new NotFoundException('Staff not found');
    }

    if (staff.availabilityStatus !== 'AVAILABLE') {
      throw new ConflictException('Staff is not available');
    }

    const waiting = await this.prisma.client.appointment.findMany({
      where: { userId, status: AppointmentStatus.WAITING },
      orderBy: [{ queuePosition: 'asc' }, { dateTime: 'asc' }],
      select: {
        id: true,
        customerName: true,
        dateTime: true,
        queuePosition: true,
        serviceId: true,
      },
    });

    let assigned = null;
    let slot: { start: Date; end: Date } | null = null;

    for (const appt of waiting) {
      const service = await this.prisma.client.service.findFirst({
        where: { id: appt.serviceId, userId },
        select: { staffType: true, durationMinutes: true },
      });

      if (!service || service.staffType !== staff.serviceType) {
        continue;
      }

      const nextSlot = await this.findNextAvailableSlot(
        staff.id,
        userId,
        new Date(appt.dateTime),
        service.durationMinutes,
        staff.dailyCapacity,
      );

      if (!nextSlot) {
        continue;
      }

      assigned = appt;
      slot = nextSlot;
      break;
    }

    if (!assigned || !slot) {
      throw new ConflictException(
        'No eligible waiting appointment for this staff',
      );
    }

    const updated = await this.prisma.client.appointment.update({
      where: { id: assigned.id },
      data: {
        status: AppointmentStatus.SCHEDULED,
        staffId,
        queuePosition: null,
        dateTime: slot.start,
        endTime: slot.end,
      },
      select: {
        id: true,
        customerName: true,
        dateTime: true,
        endTime: true,
        status: true,
        staffId: true,
        serviceId: true,
      },
    });

    await this.reorderQueue(userId);

    await this.prisma.client.activityLog.create({
      data: {
        action: 'QUEUE_ASSIGNED',
        message: `Appointment for "${assigned.customerName}" auto-assigned to ${staff.name}.`,
        userId,
        appointmentId: assigned.id,
        staffId,
      },
    });

    return ResponseUtil.success(
      updated,
      'Assigned earliest eligible appointment',
    );
  }
}
