import { validate } from 'class-validator';
import { IsValidDate } from './is-valid-date.validator';

class TestDto {
  @IsValidDate()
  date: string;
}

describe('IsValidDate Validator', () => {
  it('should pass validation for valid ISO date strings', async () => {
    const dto = new TestDto();
    dto.date = '2025-10-10T12:56:55.011Z';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation for valid ISO date strings with timezone', async () => {
    const dto = new TestDto();
    dto.date = '2025-10-10T12:56:55.011+00:00';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation for date with invalid month', async () => {
    const dto = new TestDto();
    dto.date = '2025-13-10T12:56:55.011+00:00';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isValidDate');
  });

  it('should fail validation for date with invalid day', async () => {
    const dto = new TestDto();
    dto.date = '2025-10-32T12:56:55.011+00:00';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isValidDate');
  });

  it('should fail validation for invalid date (Feb 30)', async () => {
    const dto = new TestDto();
    dto.date = '2025-02-30T12:56:55.011Z';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isValidDate');
  });

  it('should fail validation for non-string values', async () => {
    const dto = new TestDto();
    dto.date = 12345 as unknown as string;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail validation for completely invalid date strings', async () => {
    const dto = new TestDto();
    dto.date = 'not-a-date';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isValidDate');
  });
});
