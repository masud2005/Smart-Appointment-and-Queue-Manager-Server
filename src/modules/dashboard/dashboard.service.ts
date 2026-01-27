import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponseUtil } from '../../utils';
import { DateRangeFilter } from '@/common/enums/date-range-filter.enum';
import { AppointmentStatus } from '@/common/enums/appointment-status.enum';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private getDayRange(date: Date) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);
    return { start, end };
  }

  private getDateRangeFilter(
    range: DateRangeFilter,
  ): { start?: Date; end?: Date } | undefined {
    const now = new Date();

    switch (range) {
      case DateRangeFilter.TODAY: {
        const { start, end } = this.getDayRange(now);
        return { start, end };
      }

      case DateRangeFilter.THIS_WEEKEND: {
        const day = now.getUTCDay();
        const diffToFriday = day <= 5 ? 5 - day : 5 - day + 7;
        const friday = new Date(now);
        friday.setUTCDate(now.getUTCDate() + diffToFriday);
        const start = this.getDayRange(friday).start;

        const sunday = new Date(friday);
        sunday.setUTCDate(friday.getUTCDate() + 2);
        const end = this.getDayRange(sunday).end;

        return { start, end };
      }

      case DateRangeFilter.THIS_MONTH: {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setUTCHours(0, 0, 0, 0);

        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setUTCHours(23, 59, 59, 999);

        return { start, end };
      }

      case DateRangeFilter.THIS_YEAR: {
        const start = new Date(now.getFullYear(), 0, 1);
        start.setUTCHours(0, 0, 0, 0);

        const end = new Date(now.getFullYear(), 11, 31);
        end.setUTCHours(23, 59, 59, 999);

        return { start, end };
      }

      case DateRangeFilter.ALL:
      default:
        return undefined;
    }
  }

  async getDashboardSummary(
    userId: string,
    range: DateRangeFilter = DateRangeFilter.ALL,
  ) {
    const rangeFilter = this.getDateRangeFilter(range);

    const baseWhere = {
      userId,
      ...(rangeFilter
        ? { dateTime: { gte: rangeFilter.start, lte: rangeFilter.end } }
        : {}),
    };

    const [
      totalAppointments,
      completedAppointments,
      scheduledAppointments,
      waitingCount,
    ] = await Promise.all([
      this.prisma.client.appointment.count({ where: baseWhere }),
      this.prisma.client.appointment.count({
        where: { ...baseWhere, status: AppointmentStatus.COMPLETED },
      }),
      this.prisma.client.appointment.count({
        where: { ...baseWhere, status: AppointmentStatus.SCHEDULED },
      }),
      this.prisma.client.appointment.count({
        where: { userId, status: AppointmentStatus.WAITING },
      }),
    ]);

    const summary = {
      totalAppointments: totalAppointments,
      completed: completedAppointments,
      scheduled: scheduledAppointments,
      pending: scheduledAppointments,
      waitingQueueCount: waitingCount,
      appliedRange: range,
    };

    return ResponseUtil.success(summary, 'Dashboard summary retrieved');
  }

  async getStaffLoadSummary(
    userId: string,
    range: DateRangeFilter = DateRangeFilter.ALL,
  ) {
    const rangeFilter = this.getDateRangeFilter(range);

    const staff = await this.prisma.client.staff.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        dailyCapacity: true,
        availabilityStatus: true,
      },
      orderBy: { name: 'asc' },
    });

    const staffLoad = await Promise.all(
      staff.map(async (s) => {
        const appointmentCount = await this.prisma.client.appointment.count({
          where: {
            staffId: s.id,
            status: AppointmentStatus.SCHEDULED,
            ...(rangeFilter
              ? { dateTime: { gte: rangeFilter.start, lte: rangeFilter.end } }
              : {}),
          },
        });

        const status = appointmentCount >= s.dailyCapacity ? 'Booked' : 'OK';

        return {
          id: s.id,
          name: s.name,
          load: `${appointmentCount} / ${s.dailyCapacity}`,
          currentLoad: appointmentCount,
          capacity: s.dailyCapacity,
          status,
          availabilityStatus: s.availabilityStatus,
        };
      }),
    );

    return ResponseUtil.success(staffLoad, 'Staff load summary retrieved');
  }

  async getRecentActivityLogs(
    userId: string,
    range: DateRangeFilter = DateRangeFilter.ALL,
    limit: number = 10,
  ) {
    const rangeFilter = this.getDateRangeFilter(range);

    const logs = await this.prisma.client.activityLog.findMany({
      where: {
        userId,
        ...(rangeFilter
          ? { createdAt: { gte: rangeFilter.start, lte: rangeFilter.end } }
          : {}),
      },
      select: {
        id: true,
        action: true,
        message: true,
        createdAt: true,
        staffId: true,
        appointmentId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      time: log.createdAt.toLocaleTimeString(),
      action: log.action,
      message: log.message,
    }));

    return ResponseUtil.success(
      formattedLogs,
      'Activity logs retrieved successfully',
    );
  }
}
