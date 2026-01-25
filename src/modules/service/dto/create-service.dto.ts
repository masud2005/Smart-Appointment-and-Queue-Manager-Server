import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, Min, Max } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({
    example: 'Consultation',
    description: 'Service name',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 30,
    description: 'Duration in minutes',
  })
  @IsNotEmpty()
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes: number;

  @ApiProperty({
    example: 'Doctor',
    description: 'Required staff type',
  })
  @IsNotEmpty()
  @IsString()
  staffType: string;
}

export class UpdateServiceDto {
  @ApiProperty({
    example: 'Consultation',
    description: 'Service name',
    required: false,
  })
  @IsString()
  name?: string;

  @ApiProperty({
    example: 30,
    description: 'Duration in minutes',
    required: false,
  })
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes?: number;

  @ApiProperty({
    example: 'Doctor',
    description: 'Required staff type',
    required: false,
  })
  @IsString()
  staffType?: string;
}
