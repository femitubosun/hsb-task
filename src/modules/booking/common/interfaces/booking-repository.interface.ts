import { BaseRepositoryInterface } from '@/common/repository/base.interface.repository';
import { BookingDocument } from '../entities/booking.entity';

export type IBookingRepository = BaseRepositoryInterface<BookingDocument>;
