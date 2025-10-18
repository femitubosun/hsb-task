import { DateBuilder } from './date.utils';

describe('DateBuilder', () => {
  describe('today', () => {
    it('should create a DateBuilder with current date', () => {
      const builder = DateBuilder.today();
      const now = new Date();

      expect(builder).toBeInstanceOf(DateBuilder);
      expect(builder.toDate().toDateString()).toBe(now.toDateString());
    });
  });

  describe('date', () => {
    it('should create a DateBuilder with specific date', () => {
      const builder = DateBuilder.date(2025, 10, 18);
      const result = builder.toDate();

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(9);
      expect(result.getDate()).toBe(18);
    });

    it('should handle different months correctly', () => {
      const builder = DateBuilder.date(2025, 1, 15);
      const result = builder.toDate();

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });
  });

  describe('addDays', () => {
    it('should add days to the date', () => {
      const builder = DateBuilder.date(2025, 10, 18);
      const result = builder.addDays(5).toDate();

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(9);
      expect(result.getDate()).toBe(23);
    });

    it('should handle adding days across months', () => {
      const builder = DateBuilder.date(2025, 10, 30);
      const result = builder.addDays(5).toDate();

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(10);
      expect(result.getDate()).toBe(4);
    });

    it('should handle adding days across years', () => {
      const builder = DateBuilder.date(2025, 12, 30);
      const result = builder.addDays(5).toDate();

      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(4);
    });

    it('should be chainable', () => {
      const builder = DateBuilder.date(2025, 10, 18);
      const result = builder.addDays(5).addDays(3).toDate();

      expect(result.getDate()).toBe(26);
    });
  });

  describe('removeDays', () => {
    it('should remove days from the date', () => {
      const builder = DateBuilder.date(2025, 10, 18);
      const result = builder.removeDays(5).toDate();

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(9);
      expect(result.getDate()).toBe(13);
    });

    it('should handle removing days across months', () => {
      const builder = DateBuilder.date(2025, 11, 5);
      const result = builder.removeDays(10).toDate();

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(9);
      expect(result.getDate()).toBe(26);
    });

    it('should handle removing days across years', () => {
      const builder = DateBuilder.date(2026, 1, 5);
      const result = builder.removeDays(10).toDate();

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(11);
      expect(result.getDate()).toBe(26);
    });

    it('should be chainable', () => {
      const builder = DateBuilder.date(2025, 10, 18);
      const result = builder.removeDays(5).removeDays(3).toDate();

      expect(result.getDate()).toBe(10);
    });
  });

  describe('fromISO', () => {
    it('should create a DateBuilder from ISO string', () => {
      const builder = DateBuilder.fromISO('2025-10-18T12:00:00.000Z');
      const result = builder.toDate();

      expect(result.toISOString()).toBe('2025-10-18T12:00:00.000Z');
    });

    it('should handle date-only ISO strings', () => {
      const builder = DateBuilder.fromISO('2025-10-18');
      const result = builder.toDateString();

      expect(result).toBe('2025-10-18');
    });
  });

  describe('toDateString', () => {
    it('should return date string in YYYY-MM-DD format', () => {
      const builder = DateBuilder.date(2025, 10, 18);
      const result = builder.toDateString();

      expect(result).toBe('2025-10-18');
    });

    it('should pad single digit months and days', () => {
      const builder = DateBuilder.date(2025, 3, 5);
      const result = builder.toDateString();

      expect(result).toBe('2025-03-05');
    });
  });

  describe('toDate', () => {
    it('should return Date object', () => {
      const builder = DateBuilder.date(2025, 10, 18);
      const result = builder.toDate();

      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(9);
      expect(result.getDate()).toBe(18);
    });
  });

  describe('chaining multiple operations', () => {
    it('should handle complex chaining', () => {
      const result = DateBuilder.date(2025, 10, 18)
        .addDays(10)
        .removeDays(3)
        .addDays(5)
        .toDateString();

      expect(result).toBe('2025-10-30');
    });

    it('should handle chaining with fromISO', () => {
      const result = DateBuilder.fromISO('2025-10-18')
        .addDays(7)
        .toDateString();

      expect(result).toBe('2025-10-25');
    });
  });
});
