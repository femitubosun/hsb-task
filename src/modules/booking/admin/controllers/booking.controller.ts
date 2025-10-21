import { AllowedRoles, AuthUser } from '@/common/decorators';
import type { SessionUser } from '@/common/types/auth-session.type';
import { DateBuilder } from '@/common/utils/date.utils';
import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { RescheduleBookingRequestDto } from '../../client/dtos/request';
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

  @Patch(':id/cancel')
  async cancel(@Param('id') id: string, @AuthUser() user: SessionUser) {
    return this.bookingService.cancel(id, user._id, undefined, true);
  }

  @Patch(':id/reschedule')
  async reschedule(
    @Param('id') id: string,
    @Body() body: RescheduleBookingRequestDto,
    @AuthUser() user: SessionUser,
  ) {
    const { dateTime, idempotencyKey } = body;

    return this.bookingService.reschedule(
      id,
      user._id,
      {
        startsAt: DateBuilder.fromHsbDateTime(dateTime).toDate(),
        idempotencyKey,
      },
      true,
    );
  }
}
