import { Controller, Get, Query } from '@nestjs/common';
import { AvailabilitySearchRequestDto } from '../dtos/request';
import { AvailabilitySearchService } from '../services/availability-search.service';

@Controller('client/availability')
export class AvailabilityController {
  constructor(
    private readonly availabilitySearchService: AvailabilitySearchService,
  ) {}

  @Get('search')
  async search(@Query() query: AvailabilitySearchRequestDto) {
    return this.availabilitySearchService.search(query);
  }
}
