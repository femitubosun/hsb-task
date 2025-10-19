import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './core/config/config.service';
import { AuthService } from './modules/identity/auth/services';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('Seed');

  const authService = app.get(AuthService);
  const config = app.get(ConfigService);

  const password = config.env('SEED_PASSWORD');

  logger.log('🌱 Starting database seed...');

  const result = await Promise.allSettled([
    authService.signupAdmin({
      name: 'Admin User',
      email: 'admin@example.com',
      password,
    }),
    authService.signupClient({
      name: 'Client User',
      email: 'client@example.com',
      password,
    }),
    authService.signupBusiness({
      name: 'Business User',
      email: 'business@example.com',
      password,
      business: {
        name: 'Sample business',
      },
    }),
  ]);

  const fufilled = result.filter((r) => r.status === 'fulfilled');

  logger.log(`${fufilled.length} New Users Seeded successfully`);

  await app.close();
}

bootstrap()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
