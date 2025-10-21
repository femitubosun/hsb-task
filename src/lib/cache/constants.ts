export const TTL = {
  one_second: 1,
  five_seconds: 5,
  ten_seconds: 10,
  thirty_seconds: 30,

  one_minute: 60,
  five_minutes: 5 * 60,
  ten_minutes: 10 * 60,
  fifteen_minutes: 15 * 60,
  thirty_minutes: 30 * 60,

  one_hour: 60 * 60,
  two_hours: 2 * 60 * 60,
  three_hours: 3 * 60 * 60,
  six_hours: 6 * 60 * 60,
  twelve_hours: 12 * 60 * 60,

  one_day: 24 * 60 * 60,
  two_days: 2 * 24 * 60 * 60,
  three_days: 3 * 24 * 60 * 60,
  seven_days: 7 * 24 * 60 * 60,

  one_week: 7 * 24 * 60 * 60,
  two_weeks: 14 * 24 * 60 * 60,
  four_weeks: 28 * 24 * 60 * 60,

  one_month: 30 * 24 * 60 * 60, // approximate
  three_months: 90 * 24 * 60 * 60,
  six_months: 180 * 24 * 60 * 60,
  one_year: 365 * 24 * 60 * 60,
} as const;
