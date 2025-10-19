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
  CreateServiceRequestDto,
  UpdateServiceRequestDto,
} from '../../business/dtos/request';
import { ServicesService } from '../../business/services/services.service';

@AllowedRoles(['admin'])
@Controller('admin/businesses')
export class AdminServiceController {
  constructor(private readonly serviceService: ServicesService) {}

  @Post(':businessId/services')
  create(
    @Param('businessId') businessId: string,
    @Body() body: CreateServiceRequestDto,
  ) {
    return this.serviceService.create({
      ...body,
      businessId,
    });
  }

  @Get(':businessId/services')
  list(@Param('businessId') businessId: string) {
    return this.serviceService.list(businessId);
  }

  @Patch(':businessId/services/:serviceId')
  update(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
    @Body() body: UpdateServiceRequestDto,
  ) {
    return this.serviceService.update(businessId, serviceId, body);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':businessId/services/:serviceId')
  delete(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
  ) {
    return this.serviceService.delete(businessId, serviceId);
  }
}
