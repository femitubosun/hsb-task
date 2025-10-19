import { IsDateString, IsMongoId, IsNotEmpty } from 'class-validator';

export class AvailabilitySearchRequestDto {
  @IsMongoId()
  @IsNotEmpty()
  businessId: string;

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
