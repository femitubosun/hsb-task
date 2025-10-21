import { HsbDateTimeDto } from '@/common/dtos/common/hsb-date-time.dto';
import { Type } from 'class-transformer';
import { IsObject, IsUUID, ValidateNested } from 'class-validator';

export class RescheduleBookingRequestDto {
  @IsObject()
  @Type(() => HsbDateTimeDto)
  @ValidateNested()
  dateTime: HsbDateTimeDto;

  @IsUUID()
  idempotencyKey: string;
}
