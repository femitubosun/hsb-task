import { AllowedRoles } from '@/common/decorators';
import { BusinessService } from '@/modules/profile/business/services/business.service';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@AllowedRoles(['client'])
@Controller('discovery/businesses')
@ApiTags('Discovery', 'Business Discovery')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  async list() {
    return this.businessService.list();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.businessService.getById(id);
  }
}
