import { IsValidDate } from '@/common/validators/is-valid-date.validator';
import { IsDateString, IsUUID } from 'class-validator';

export class RescheduleBookingRequestDto {
  @IsDateString()
  @IsValidDate()
  startsAt: string;

  @IsUUID()
  idempotencyKey: string;
}
