import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, IsEnum, Min, Max } from 'class-validator';

enum StaffTypeEnum {
  DOCTOR = 'Doctor',
  CONSULTANT = 'Consultant',
  SUPPORT_AGENT = 'Support Agent',
}

enum AvailabilityStatusEnum {
  AVAILABLE = 'AVAILABLE',
  ON_LEAVE = 'ON_LEAVE',
}

export class CreateStaffDto {
  @ApiProperty({
    example: 'Farhan',
    description: 'Staff name',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Doctor',
    description: 'Staff service type',
    enum: StaffTypeEnum,
  })
  @IsNotEmpty()
  @IsString()
  serviceType: string;

  @ApiProperty({
    example: 5,
    description: 'Maximum appointments per day',
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(100)
  dailyCapacity: number;
}

export class UpdateStaffDto {
  @ApiProperty({
    example: 'Farhan',
    description: 'Staff name',
    required: false,
  })
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'Doctor',
    description: 'Staff service type',
    required: false,
  })
  @IsString()
  serviceType?: string;

  @ApiProperty({
    example: 5,
    description: 'Maximum appointments per day',
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  dailyCapacity?: number;

  @ApiProperty({
    example: 'AVAILABLE',
    description: 'Availability status',
    required: false,
    enum: AvailabilityStatusEnum,
  })
  @IsEnum(AvailabilityStatusEnum)
  availabilityStatus?: string;
}
