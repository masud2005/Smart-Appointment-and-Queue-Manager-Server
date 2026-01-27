import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  customerName: string;

  @ApiProperty({
    example: '2026-01-26T10:00:00.000Z',
    description: 'Appointment start time in ISO format',
  })
  @IsNotEmpty()
  @IsDateString()
  dateTime: string;

  @ApiProperty({ example: 'service-uuid', description: 'Service ID to book' })
  @IsNotEmpty()
  @IsUUID()
  serviceId: string;

  @ApiProperty({
    example: 'staff-uuid',
    description: 'Preferred staff ID if any',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  staffId?: string;
}
