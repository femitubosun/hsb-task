export enum OutboxEventType {
  BOOKING_CREATED = 'booking.created',
  BOOKING_RESCHEDULED = 'booking.rescheduled',
  BOOKING_CANCELLED = 'booking.cancelled',
}

export enum OutboxEventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
}
