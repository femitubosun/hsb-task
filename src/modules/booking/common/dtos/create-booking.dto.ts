export type CreateBookingInput = {
  clientId: string;
  businessId: string;
  serviceId: string;
  startsAt: Date;
  idempotencyKey: string;
};
