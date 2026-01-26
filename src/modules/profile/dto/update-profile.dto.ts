import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;
}
