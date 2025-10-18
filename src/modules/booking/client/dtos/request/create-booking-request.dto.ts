import { IsDateString, IsString, IsUUID } from 'class-validator';

export class CreateBookingRequestDto {
  // @IsString()
  // businessId: string;

  @IsString()
  serviceId: string;

  @IsDateString()
  startsAt: string;

  @IsUUID()
  idempotencyKey: string;
}
