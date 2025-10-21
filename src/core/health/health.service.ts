import { Injectable } from '@nestjs/common';
import {
  DiskHealthIndicator,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';

@Injectable()
export class HealthService {
  constructor(
    private readonly disk: DiskHealthIndicator,
    private readonly mongoose: MongooseHealthIndicator,
    private readonly health: HealthCheckService,
  ) {}

  async check() {
    return this.health.check([
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9,
        }),
      () => this.mongoose.pingCheck('mongodb'),
    ]);
  }
}
