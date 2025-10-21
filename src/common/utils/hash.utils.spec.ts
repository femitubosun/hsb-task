import { hashInput, verifyHash } from './hash.utils';

describe('Hash Utils', () => {
  describe('hashInput', () => {
    it('should hash a string input', async () => {
      const input = 'myPassword123';
      const hash = await hashInput(input);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(input);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same input', async () => {
      const input = 'samePassword';
      const hash1 = await hashInput(input);
      const hash2 = await hashInput(input);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty strings', async () => {
      const hash = await hashInput('');

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle special characters', async () => {
      const input = 'p@ssw0rd!#$%^&*()';
      const hash = await hashInput(input);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('verifyHash', () => {
    it('should verify correct password against hash', async () => {
      const input = 'myPassword123';
      const hash = await hashInput(input);
      const isValid = await verifyHash(input, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password against hash', async () => {
      const input = 'myPassword123';
      const wrongInput = 'wrongPassword';
      const hash = await hashInput(input);
      const isValid = await verifyHash(wrongInput, hash);

      expect(isValid).toBe(false);
    });

    it('should be case sensitive', async () => {
      const input = 'Password';
      const hash = await hashInput(input);
      const isValid = await verifyHash('password', hash);

      expect(isValid).toBe(false);
    });

    it('should handle empty string verification', async () => {
      const hash = await hashInput('');
      const isValid = await verifyHash('', hash);

      expect(isValid).toBe(true);
    });

    it('should reject empty string against non-empty hash', async () => {
      const hash = await hashInput('password');
      const isValid = await verifyHash('', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('integration', () => {
    it('should handle complete hash and verify workflow', async () => {
      const password = 'securePassword123!';

      const hash = await hashInput(password);
      const validResult = await verifyHash(password, hash);
      const invalidResult = await verifyHash('wrongPassword', hash);

      expect(validResult).toBe(true);
      expect(invalidResult).toBe(false);
    });

    it('should handle multiple different passwords', async () => {
      const password1 = 'user1Password';
      const password2 = 'user2Password';

      const hash1 = await hashInput(password1);
      const hash2 = await hashInput(password2);

      expect(await verifyHash(password1, hash1)).toBe(true);
      expect(await verifyHash(password2, hash2)).toBe(true);
      expect(await verifyHash(password1, hash2)).toBe(false);
      expect(await verifyHash(password2, hash1)).toBe(false);
    });
  });
});
