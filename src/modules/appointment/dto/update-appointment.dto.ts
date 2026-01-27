import { ApiProperty } from '@nestjs/swagger';
import { AppointmentStatus } from '../../../common/enums/appointment-status.enum';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateAppointmentDto {
  @ApiProperty({ example: 'Jane Doe', required: false })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ example: '2026-01-26T12:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  dateTime?: string;

  @ApiProperty({ example: 'staff-uuid', required: false })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiProperty({ enum: AppointmentStatus, required: false })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}
