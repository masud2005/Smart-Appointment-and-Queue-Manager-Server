import { ApiProperty } from '@nestjs/swagger';
import { AppointmentStatus } from '../../../common/enums/appointment-status.enum';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class FilterAppointmentsDto {
  @ApiProperty({
    example: '2026-01-26',
    required: false,
    description: 'Filter by date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ example: 'staff-uuid', required: false })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiProperty({ enum: AppointmentStatus, required: false })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}
