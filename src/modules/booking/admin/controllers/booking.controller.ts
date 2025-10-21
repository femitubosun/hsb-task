import { AllowedRoles, AuthUser } from '@/common/decorators';
import type { SessionUser } from '@/common/types/auth-session.type';
import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import type { RescheduleBookingInput } from '../../common/dtos/reschedule-booking.dto';
import { BookingService } from '../../common/services/booking.service';

@AllowedRoles(['admin'])
@Controller('admin/bookings')
export class AdminBookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  async list(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('businessId') businessId?: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bookingService.listAdminBookings({
      page,
      limit,
      filters: { businessId, clientId, status, startDate, endDate },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.bookingService.findById(id);
  }

  @Put(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @AuthUser() user: SessionUser,
  ) {
    return this.bookingService.cancel(id, user._id, body.reason, true);
  }

  @Put(':id/reschedule')
  async reschedule(
    @Param('id') id: string,
    @Body() body: RescheduleBookingInput,
    @AuthUser() user: SessionUser,
  ) {
    return this.bookingService.reschedule(id, user._id, body, true);
  }
}
