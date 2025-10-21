import { AllowedRoles } from '@/common/decorators';
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
  UpdateAvailabilityOverrideRequestDto,
} from '../../business/dtos/request';
import { AvailabilityScheduleService } from '../../business/services';

@AllowedRoles(['admin'])
@Controller('admin/businesses')
@Controller()
export class AvailabilityScheduleController {
  constructor(
    private readonly availabilityScheduleService: AvailabilityScheduleService,
  ) {}

  @Post(':businessId/availability/schedules')
  create(
    @Param('businessId') businessId: string,
    @Body() body: CreateAvailabilityScheduleRequestDto,
  ) {
    return this.availabilityScheduleService.create({
      ...body,
      businessId,
    });
  }

  @Get(':businessId/availability/schedules')
  list(@Param('businessId') businessId: string) {
    return this.availabilityScheduleService.list(businessId);
  }

  @Patch(':businessId/availability/schedules/:overrideId')
  update(
    @Param('businessId') businessId: string,
    @Param('overrideId') overrideId: string,
    @Body() body: UpdateAvailabilityOverrideRequestDto,
  ) {
    return this.availabilityScheduleService.update(
      businessId,
      overrideId,
      body,
    );
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':businessId/availability/schedules/:overrideId')
  delete(
    @Param('businessId') businessId: string,
    @Param('overrideId') overrideId: string,
  ) {
    return this.availabilityScheduleService.delete(businessId, overrideId);
  }
}
