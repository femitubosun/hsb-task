import { AllowedRoles, AuthBusiness } from '@/common/decorators';
import { SessionUser } from '@/common/types/auth-session.type';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import {
  CreateAvailabilityScheduleRequestDto,
  UpdateAvailabilityScheduleRequestDto,
} from '../dtos/request';
import { AvailabilityScheduleService } from '../services/availability-schedule.service';

@AllowedRoles(['business'])
@Controller('availability/schedules')
export class AvailabilityScheduleController {
  constructor(
    private readonly availabilityScheduleService: AvailabilityScheduleService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: CreateAvailabilityScheduleRequestDto,
    @AuthBusiness() business: SessionUser['business'],
  ) {
    return this.availabilityScheduleService.create({
      ...body,
      businessId: business!._id,
    });
  }

  @Get()
  async list(@AuthBusiness() business: SessionUser['business']) {
    return this.availabilityScheduleService.list(business!._id);
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @AuthBusiness() business: SessionUser['business'],
  ) {
    return this.availabilityScheduleService.getById(business!._id, id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @AuthBusiness() business: SessionUser['business'],
    @Body() body: UpdateAvailabilityScheduleRequestDto,
  ) {
    return this.availabilityScheduleService.update(business!._id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @AuthBusiness() business: SessionUser['business'],
  ) {
    await this.availabilityScheduleService.delete(business!._id, id);
  }
}
