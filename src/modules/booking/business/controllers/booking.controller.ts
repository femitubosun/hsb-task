import { AllowedRoles, AuthBusiness } from '@/common/decorators';
import { SessionUser } from '@/common/types/auth-session.type';
import { Controller, Get, Param } from '@nestjs/common';
import { BookingService } from '../../common/services/booking.service';

@AllowedRoles(['business'])
@Controller('business/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  async list(@AuthBusiness() business: SessionUser['business']) {
    return this.bookingService.findAll({ businessId: business!._id });
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.bookingService.findById(id);
  }
}
