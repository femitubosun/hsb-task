import { join } from 'path';

const ROOT_DIR = join(__dirname, '..', '..');

export const APP_DIR = {
  ROOT_DIR,
  INFRA_DIR: join(ROOT_DIR, 'infra'),
  CORE_DIR: join(ROOT_DIR, 'core'),
  LIB_DIR: join(ROOT_DIR, 'lib'),
  MODULES_DIR: join(ROOT_DIR, 'modules'),
} as const;
