import { IsDateString, IsUUID } from 'class-validator';

export class RescheduleBookingRequestDto {
  @IsDateString()
  startsAt: string;

  @IsUUID()
  idempotencyKey: string;
}
