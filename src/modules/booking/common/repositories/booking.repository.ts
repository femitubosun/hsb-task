import { BaseRepositoryAbstract } from '@/common/repository/base.abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking, BookingDocument } from '../entities/booking.entity';
import { IBookingRepository } from '../interfaces/booking-repository.interface';

@Injectable()
export class BookingRepository
  extends BaseRepositoryAbstract<BookingDocument>
  implements IBookingRepository
{
  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
  ) {
    super(bookingModel);
  }
}
