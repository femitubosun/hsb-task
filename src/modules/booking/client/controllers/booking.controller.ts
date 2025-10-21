import { AllowedRoles, AuthUser } from '@/common/decorators';
import type { SessionUser } from '@/common/types/auth-session.type';
import { DateBuilder } from '@/common/utils/date.utils';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BookingService } from '../../common/services/booking.service';
import {
  CreateBookingRequestDto,
  RescheduleBookingRequestDto,
} from '../dtos/request';

import { BookingResponseDto } from '../dtos/response';

@AllowedRoles(['client'])
@Controller('client/bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: CreateBookingRequestDto,
    @AuthUser() user: SessionUser,
  ): Promise<BookingResponseDto> {
    return this.bookingService.create({
      serviceId: body.serviceId,
      startsAt: DateBuilder.fromHsbDateTime(body.dateTime).toDate(),
      idempotencyKey: body.idempotencyKey,
      clientId: user._id,
    }) as unknown as Promise<BookingResponseDto>;
  }

  @Get()
  async list(@AuthUser() user: SessionUser) {
    return this.bookingService.findAll({ clientId: user._id });
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.bookingService.findById(id);
  }

  @Patch(':id/reschedule')
  async reschedule(
    @Param('id') id: string,
    @AuthUser() user: SessionUser,
    @Body() body: RescheduleBookingRequestDto,
  ) {
    return this.bookingService.reschedule(id, user._id, {
      startsAt: DateBuilder.fromHsbDateTime(body.dateTime).toDate(),
      idempotencyKey: body.idempotencyKey,
    });
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string, @AuthUser() user: SessionUser) {
    return this.bookingService.cancel(id, user._id);
  }
}
