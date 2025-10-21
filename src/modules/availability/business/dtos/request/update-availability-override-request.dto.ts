import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateAvailabilityOverrideRequestDto } from './create-availability-override-request.dto';

export class UpdateAvailabilityOverrideRequestDto extends PartialType(
  CreateAvailabilityOverrideRequestDto,
) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
