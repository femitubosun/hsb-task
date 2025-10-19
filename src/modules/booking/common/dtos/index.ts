export * from './create-booking.dto';
export * from './reschedule-booking.dto';
export * from './update-booking.dto';

export interface BookingRange {
  businessId: string;
  date: string;
  start: number;
  end: number;
  bookingId: string;
}

export interface SlotQueryParams {
  businessId: string;
  date: string;
  dayStart: number;
  dayEnd: number;
  serviceDuration: number;
  bufferBefore: number;
  bufferAfter: number;
}
