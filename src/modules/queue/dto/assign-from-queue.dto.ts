import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignFromQueueDto {
  @ApiProperty({
    example: 'staff-uuid',
    description: 'Staff ID to assign the earliest eligible waiting appointment',
  })
  @IsUUID()
  staffId: string;
}
