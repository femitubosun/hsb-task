import { IsString, Matches } from 'class-validator';

export enum DaysOfWeek {
  Monday = 'monday',
  Tuesday = 'tuesday',
  Wednesday = 'wednesday',
  Thursday = 'thursday',
  Friday = 'friday',
  Saturday = 'saturday',
  Sunday = 'sunday',
}

export class TimeRangeDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'start must be in HH:mm format (e.g., 09:00)',
  })
  start: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'end must be in HH:mm format (e.g., 17:00)',
  })
  end: string;
}
