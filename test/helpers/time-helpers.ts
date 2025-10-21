export class TimeHelpers {
  static utcDate(
    year: number,
    month: number,
    day: number,
    hour = 0,
    minute = 0,
  ): Date {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  }

  static dateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  static timeString(date: Date): string {
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  static toEpoch(dateStr: string, timeStr: string): number {
    const date = new Date(`${dateStr}T${timeStr}:00.000Z`);
    return date.getTime();
  }

  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  static isoWithoutZ(date: Date): string {
    return date.toISOString().replace('Z', '');
  }
}
