import * as crypto from 'crypto';
import { Types } from 'mongoose';
import { TimeHelpers } from './time-helpers';

export class TestDataFactory {
  static createBusiness(overrides?: Partial<any>) {
    return {
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      name: 'Test Business',
      bannerUrl: 'https://example.com/banner.jpg',
      profileImgUrl: 'https://example.com/profile.jpg',
      ...overrides,
    };
  }

  static createService(
    businessId: string | Types.ObjectId,
    overrides?: Partial<any>,
  ) {
    return {
      _id: new Types.ObjectId(),
      businessId:
        typeof businessId === 'string'
          ? new Types.ObjectId(businessId)
          : businessId,
      name: 'Test Service',
      duration: 45,
      bufferBefore: 10,
      bufferAfter: 10,
      price: 5000,
      isActive: true,
      ...overrides,
    };
  }

  static createSchedule(
    businessId: string | Types.ObjectId,
    overrides?: Partial<any>,
  ) {
    return {
      _id: new Types.ObjectId(),
      businessId:
        typeof businessId === 'string'
          ? new Types.ObjectId(businessId)
          : businessId,
      daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      startTime: '09:00',
      endTime: '17:00',
      effectiveFrom: new Date('2025-01-01T00:00:00.000Z'),
      effectiveUntil: null,
      isActive: true,
      ...overrides,
    };
  }

  static createOverride(
    businessId: string | Types.ObjectId,
    overrides?: Partial<any>,
  ) {
    return {
      _id: new Types.ObjectId(),
      businessId:
        typeof businessId === 'string'
          ? new Types.ObjectId(businessId)
          : businessId,
      date: new Date('2025-12-25T00:00:00.000Z'),
      type: 'closed' as const,
      isActive: true,
      ...overrides,
    };
  }

  static createBooking(
    clientId: string | Types.ObjectId,
    serviceId: string | Types.ObjectId,
    overrides?: Partial<any>,
  ) {
    const startsAt = new Date('2025-10-21T10:00:00.000Z');
    const endsAt = TimeHelpers.addMinutes(startsAt, 45);

    return {
      _id: new Types.ObjectId(),
      clientId:
        typeof clientId === 'string' ? new Types.ObjectId(clientId) : clientId,
      businessId: new Types.ObjectId(),
      serviceId:
        typeof serviceId === 'string'
          ? new Types.ObjectId(serviceId)
          : serviceId,
      startsAt,
      endsAt,
      duration: 45,
      bufferBefore: 10,
      bufferAfter: 10,
      priceAtBooking: 5000,
      status: 'confirmed' as const,
      idempotencyKey: crypto.randomUUID(),
      cancellationFee: 0,
      refundAmount: 0,
      ...overrides,
    };
  }

  static createUser(overrides?: Partial<any>) {
    return {
      _id: new Types.ObjectId(),
      email: `test-${crypto.randomUUID()}@example.com`,
      password: 'hashedpassword123',
      ...overrides,
    };
  }
}
