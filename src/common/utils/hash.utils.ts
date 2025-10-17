import * as bcrypt from 'bcrypt';

export async function hashInput(input: string): Promise<string> {
  return bcrypt.hash(input, 10);
}

export async function verifyHash(
  input: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(input, hash);
}
