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
  CreateServiceRequestDto,
  UpdateServiceRequestDto,
} from '../dtos/request';
import { ServiceResponseDto } from '../dtos/response';
import { ServicesService } from '../services/services.service';

@AllowedRoles(['business'])
@Controller('services')
export class ServiceController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: CreateServiceRequestDto,
    @AuthBusiness() business: SessionUser['business'],
  ): Promise<ServiceResponseDto> {
    return this.servicesService.create({
      ...body,
      businessId: business!._id,
    }) as unknown as Promise<ServiceResponseDto>;
  }

  @Get()
  async list(@AuthBusiness() business: SessionUser['business']) {
    return this.servicesService.list(business!._id);
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @AuthBusiness() business: SessionUser['business'],
  ) {
    return this.servicesService.getServicebyId(business!._id, id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @AuthBusiness() business: SessionUser['business'],
    @Body() body: UpdateServiceRequestDto,
  ) {
    return this.servicesService.updateService(business!._id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @AuthBusiness() business: SessionUser['business'],
  ) {
    await this.servicesService.deleteService(business!._id, id);
  }
}
