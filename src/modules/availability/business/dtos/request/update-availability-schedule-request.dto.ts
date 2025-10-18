import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateAvailabilityScheduleRequestDto } from './create-availability-schedule-request.dto';

export class UpdateAvailabilityScheduleRequestDto extends PartialType(
  CreateAvailabilityScheduleRequestDto,
) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
