import { validate } from 'class-validator';
import { IsValidDateString } from './is-valid-date-string.validator';

class TestDto {
  @IsValidDateString()
  date: string;
}

describe('IsValidDateString Validator', () => {
  it('should pass validation for valid YYYY-MM-DD date strings', async () => {
    const dto = new TestDto();
    dto.date = '2025-10-10';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation for valid leap year date', async () => {
    const dto = new TestDto();
    dto.date = '2024-02-29';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation for invalid month (13)', async () => {
    const dto = new TestDto();
    dto.date = '2025-13-10';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isValidDateString');
  });

  it('should fail validation for invalid day (32)', async () => {
    const dto = new TestDto();
    dto.date = '2025-10-32';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isValidDateString');
  });

  it('should fail validation for invalid date (Feb 30)', async () => {
    const dto = new TestDto();
    dto.date = '2025-02-30';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isValidDateString');
  });

  it('should fail validation for Feb 29 on non-leap year', async () => {
    const dto = new TestDto();
    dto.date = '2025-02-29';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isValidDateString');
  });

  it('should fail validation for wrong format (has time)', async () => {
    const dto = new TestDto();
    dto.date = '2025-10-10T12:56:55';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isValidDateString');
  });

  it('should fail validation for non-string values', async () => {
    const dto = new TestDto();
    dto.date = 12345 as unknown as string;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
