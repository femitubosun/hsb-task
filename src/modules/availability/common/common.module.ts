import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AvailabilityOverride,
  AvailabilityOverrideSchema,
  AvailabilitySchedule,
  AvailabilityScheduleSchema,
} from './entities';
import {
  AvailabilityOverrideRepository,
  AvailabilityScheduleRepository,
} from './repositories';
import { AvailabilityValidationService } from './services/availability-validation.service';

const ENTITIES = [
  {
    name: AvailabilityOverride.name,
    schema: AvailabilityOverrideSchema,
  },
  {
    name: AvailabilitySchedule.name,
    schema: AvailabilityScheduleSchema,
  },
];

@Module({
  imports: [MongooseModule.forFeature(ENTITIES)],
  providers: [
    {
      provide: 'IAvailabilityOverrideRepository',
      useClass: AvailabilityOverrideRepository,
    },
    {
      provide: 'IAvailabilityScheduleRepository',
      useClass: AvailabilityScheduleRepository,
    },
    AvailabilityValidationService,
  ],
  exports: [
    'IAvailabilityOverrideRepository',
    'IAvailabilityScheduleRepository',
    AvailabilityValidationService,
  ],
})
export class CommonModule {}
