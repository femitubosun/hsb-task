import { IsValidDate } from '@/common/validators/is-valid-date.validator';
import { IsDateString, IsString, IsUUID } from 'class-validator';

export class CreateBookingRequestDto {
  @IsString()
  serviceId: string;

  @IsDateString()
  @IsValidDate()
  startsAt: string;

  @IsUUID()
  idempotencyKey: string;
}
