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
  CreateAvailabilityOverrideRequestDto,
  UpdateAvailabilityOverrideRequestDto,
} from '../../business/dtos/request';
import { AvailabilityOverrideService } from '../../business/services';

@AllowedRoles(['admin'])
@Controller('admin/businesses')
export class AvailabilityOverrideController {
  constructor(
    private readonly availabilityOverrideService: AvailabilityOverrideService,
  ) {}

  @Post(':businessId/availability/overrides')
  create(
    @Param('businessId') businessId: string,
    @Body() body: CreateAvailabilityOverrideRequestDto,
  ) {
    return this.availabilityOverrideService.create({
      ...body,
      businessId,
    });
  }

  @Get(':businessId/availability/overrides')
  list(@Param('businessId') businessId: string) {
    return this.availabilityOverrideService.list(businessId);
  }

  @Patch(':businessId/availability/overrides/:overrideId')
  update(
    @Param('businessId') businessId: string,
    @Param('overrideId') overrideId: string,
    @Body() body: UpdateAvailabilityOverrideRequestDto,
  ) {
    return this.availabilityOverrideService.update(
      businessId,
      overrideId,
      body,
    );
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':businessId/availability/overrides/:overrideId')
  delete(
    @Param('businessId') businessId: string,
    @Param('overrideId') overrideId: string,
  ) {
    return this.availabilityOverrideService.delete(businessId, overrideId);
  }
}
