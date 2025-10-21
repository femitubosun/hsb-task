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
  CreateAvailabilityOverrideRequestDto,
  UpdateAvailabilityOverrideRequestDto,
} from '../dtos/request';
import { AvailabilityOverrideService } from '../services/availability-override.service';

@AllowedRoles(['business'])
@Controller('availability/overrides')
export class AvailabilityOverrideController {
  constructor(
    private readonly availabilityOverrideService: AvailabilityOverrideService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: CreateAvailabilityOverrideRequestDto,
    @AuthBusiness() business: SessionUser['business'],
  ) {
    return this.availabilityOverrideService.create({
      ...body,
      businessId: business!._id,
    });
  }

  @Get()
  async list(@AuthBusiness() business: SessionUser['business']) {
    return this.availabilityOverrideService.list(business!._id);
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @AuthBusiness() business: SessionUser['business'],
  ) {
    return this.availabilityOverrideService.getById(business!._id, id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @AuthBusiness() business: SessionUser['business'],
    @Body() body: UpdateAvailabilityOverrideRequestDto,
  ) {
    return this.availabilityOverrideService.update(business!._id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @AuthBusiness() business: SessionUser['business'],
  ) {
    await this.availabilityOverrideService.delete(business!._id, id);
  }
}
