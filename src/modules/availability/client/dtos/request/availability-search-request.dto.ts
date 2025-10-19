import { IsDateString, IsMongoId, IsNotEmpty } from 'class-validator';

export class AvailabilitySearchRequestDto {
  @IsMongoId()
  @IsNotEmpty()
  serviceId: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
