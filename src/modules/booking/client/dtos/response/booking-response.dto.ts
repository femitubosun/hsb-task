import { ApiProperty } from '@nestjs/swagger';

export class BookingResponseDto {
  @ApiProperty({
    description: 'Booking ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Client ID',
    example: '507f1f77bcf86cd799439012',
  })
  clientId: string;

  @ApiProperty({
    description: 'Business ID',
    example: '507f1f77bcf86cd799439013',
  })
  businessId: string;

  @ApiProperty({
    description: 'Service ID',
    example: '507f1f77bcf86cd799439014',
  })
  serviceId: string;

  @ApiProperty({
    description: 'Booking start time',
    example: '2025-01-20T10:00:00Z',
  })
  startsAt: Date;

  @ApiProperty({
    description: 'Booking end time',
    example: '2025-01-20T11:00:00Z',
  })
  endsAt: Date;

  @ApiProperty({
    description: 'Service duration in minutes',
    example: 60,
  })
  duration: number;

  @ApiProperty({
    description: 'Buffer before in minutes',
    example: 10,
  })
  bufferBefore: number;

  @ApiProperty({
    description: 'Buffer after in minutes',
    example: 5,
  })
  bufferAfter: number;

  @ApiProperty({
    description: 'Price at time of booking',
    example: 100.0,
  })
  priceAtBooking: number;

  @ApiProperty({
    description: 'Cancellation fee amount',
    example: 0,
  })
  cancellationFee: number;

  @ApiProperty({
    description: 'Refund amount',
    example: 0,
  })
  refundAmount: number;

  @ApiProperty({
    description: 'Booking status',
    example: 'confirmed',
    enum: ['confirmed', 'cancelled', 'completed', 'no_show'],
  })
  status: string;

  @ApiProperty({
    description: 'Cancellation timestamp',
    example: null,
    required: false,
  })
  cancelledAt?: Date;

  @ApiProperty({
    description: 'Cancellation reason',
    example: null,
    required: false,
  })
  cancellationReason?: string;

  @ApiProperty({
    description: 'Completion timestamp',
    example: null,
    required: false,
  })
  completedAt?: Date;

  @ApiProperty({
    description: 'Idempotency key',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  idempotencyKey: string;

  @ApiProperty({
    description: 'Booking created timestamp',
    example: '2025-01-15T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Booking updated timestamp',
    example: '2025-01-15T10:00:00Z',
  })
  updatedAt: Date;
}
