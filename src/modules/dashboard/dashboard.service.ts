import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponseUtil } from '../../utils';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';

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

	async getDashboardSummary(userId: string, date?: string) {
		const targetDate = date ? new Date(date) : new Date();
		const { start: dayStart, end: dayEnd } = this.getDayRange(targetDate);

		const [totalAppointments, completedAppointments, scheduledAppointments, waitingCount] = await Promise.all([
			this.prisma.client.appointment.count({
				where: {
					userId,
					dateTime: { gte: dayStart, lte: dayEnd },
				},
			}),
			this.prisma.client.appointment.count({
				where: {
					userId,
					status: AppointmentStatus.COMPLETED,
					dateTime: { gte: dayStart, lte: dayEnd },
				},
			}),
			this.prisma.client.appointment.count({
				where: {
					userId,
					status: AppointmentStatus.SCHEDULED,
					dateTime: { gte: dayStart, lte: dayEnd },
				},
			}),
			this.prisma.client.appointment.count({
				where: {
					userId,
					status: AppointmentStatus.WAITING,
				},
			}),
		]);

		const summary = {
			totalAppointmentsToday: totalAppointments,
			completedToday: completedAppointments,
			scheduledToday: scheduledAppointments,
			pendingToday: scheduledAppointments,
			waitingQueueCount: waitingCount,
		};

		return ResponseUtil.success(summary, 'Dashboard summary retrieved successfully');
	}

	async getStaffLoadSummary(userId: string, date?: string) {
		const targetDate = date ? new Date(date) : new Date();
		const { start: dayStart, end: dayEnd } = this.getDayRange(targetDate);

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
						dateTime: { gte: dayStart, lte: dayEnd },
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

		return ResponseUtil.success(staffLoad, 'Staff load summary retrieved successfully');
	}

	async getRecentActivityLogs(userId: string, limit: number = 10) {
		const logs = await this.prisma.client.activityLog.findMany({
			where: { userId },
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

		return ResponseUtil.success(formattedLogs, 'Activity logs retrieved successfully');
	}
}
