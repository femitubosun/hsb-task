import { ApiProperty } from '@nestjs/swagger';

export class ServiceResponseDto {
  @ApiProperty({
    description: 'Service ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Provider ID',
    example: '507f1f77bcf86cd799439012',
  })
  providerId: string;

  @ApiProperty({
    description: 'Name of the service',
    example: 'Deep Tissue Massage',
  })
  name: string;

  @ApiProperty({
    description: 'Actual treatment time in minutes',
    example: 60,
  })
  duration: number;

  @ApiProperty({
    description: 'Prep/setup time before the service in minutes',
    example: 15,
  })
  bufferBefore: number;

  @ApiProperty({
    description: 'Cleanup/turnaround time after the service in minutes',
    example: 10,
  })
  bufferAfter: number;

  @ApiProperty({
    description: 'Price of the service',
    example: 120,
  })
  price: number;

  @ApiProperty({
    description: 'Whether the service is active',
    example: true,
  })
  isActive: boolean;
}
