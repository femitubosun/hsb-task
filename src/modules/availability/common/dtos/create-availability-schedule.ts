export type CreateAvailabilityScheduleInput = {
  businessId: string;
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveUntil?: string;
};
