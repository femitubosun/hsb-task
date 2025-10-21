import { IsEnum, IsNumber, IsString, Max, Min } from 'class-validator';

export enum NodeEnvironment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

export class EnvSchema {
  /*  ---------------- GENERAL DEFAULTS ------------------ */
  @IsEnum(NodeEnvironment)
  NODE_ENV: NodeEnvironment = NodeEnvironment.Development;

  @IsNumber()
  @Min(0)
  @Max(65535)
  PORT: number;

  @IsString()
  APP_NAME: string;

  @IsString()
  SEED_PASSWORD: string;

  /*  ---------------- AUTHENTICATION ---------------------- */
  @IsString()
  JWT_SECRET_KEY: string;

  @IsString()
  JWT_EXPIRES_IN: string;

  @IsNumber()
  AUTH_SESSION_TTL: number;

  /*  ---------------- INFRASTRUCTURE -------------------- */
  @IsString()
  REDIS_URL: string;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  BULL_MQ_REDIS_URL: string;

  /* ----------------- WEBHOOK -------------------------------- */
  @IsString()
  BOOKING_EVENTS_URL: string;

  /* --------------- RATE LIMITING -------------------- */
  @IsNumber()
  THROTTLE_TTL: number;

  @IsNumber()
  THROTTLE_LIMIT: number;
}
