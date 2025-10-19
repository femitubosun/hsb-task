import { APP_DIR } from '@/common/utils/dir.utils';
import { join } from 'node:path';

const BOOKING_SCRIPTS_DIR = [
  APP_DIR.MODULES_DIR,
  'booking',
  'common',
  'scripts',
];

export const ATOMIC_LOCK_SCRIPT = join(
  ...BOOKING_SCRIPTS_DIR,
  'atomic-booking-lock.lua',
);

export const GET_AVAILABLE_SLOTS_SCRIPT = join(
  ...BOOKING_SCRIPTS_DIR,
  'get-available-slots.lua',
);

export const GET_AVAILABLE_SLOTS_RESCHEDULE_SCRIPT = join(
  ...BOOKING_SCRIPTS_DIR,
  'get-available-slots-reschedule.lua',
);

export const ATOMIC_RESCHEDULE_SWAP_SCRIPT = join(
  ...BOOKING_SCRIPTS_DIR,
  'atomic-reschedule-swap.lua',
);
