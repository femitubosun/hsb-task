import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

enum DayOfWeek {
  SUNDAY = 'sunday',
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
}

export class CreateAvailabilityScheduleRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(DayOfWeek, { each: true })
  daysOfWeek: string[];

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'effectiveFrom must be in YYYY-MM-DD format',
  })
  effectiveFrom: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'effectiveUntil must be in YYYY-MM-DD format',
  })
  @IsOptional()
  effectiveUntil?: string;
}
