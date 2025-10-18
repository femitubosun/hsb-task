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
  ],
  exports: [
    'IAvailabilityOverrideRepository',
    'IAvailabilityScheduleRepository',
  ],
})
export class CommonModule {}
