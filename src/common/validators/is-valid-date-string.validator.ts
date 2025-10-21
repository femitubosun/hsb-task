import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidDateString', async: false })
export class IsValidDateStringConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const [year, month, day] = value.split('-').map(Number);

    const date = new Date(Date.UTC(year, month - 1, day));

    if (isNaN(date.getTime())) {
      return false;
    }

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return false;
    }

    return true;
  }

  defaultMessage(): string {
    return 'Invalid date string provided. Must be in YYYY-MM-DD format and represent a valid date';
  }
}

export function IsValidDateString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidDateStringConstraint,
    });
  };
}
