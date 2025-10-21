import { HsbDateTimeDto } from '../dtos/common';

export class DateBuilder {
  private date: Date;

  constructor(d = new Date()) {
    this.date = d;
  }

  static today() {
    return new DateBuilder();
  }

  static now() {
    return new DateBuilder(new Date());
  }

  static utcNow() {
    const now = new Date();
    return new DateBuilder(
      new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          now.getUTCHours(),
          now.getUTCMinutes(),
          now.getUTCSeconds(),
          now.getUTCMilliseconds(),
        ),
      ),
    );
  }

  static date(year: number, month: number, day: number) {
    return new DateBuilder(new Date(Date.UTC(year, month - 1, day)));
  }

  addDays(n: number) {
    this.date = new Date(this.date.getTime() + n * 86400000);
    return this;
  }

  removeDays(n: number) {
    this.date = new Date(this.date.getTime() - n * 86400000);
    return this;
  }

  addMinutes(n: number) {
    this.date = new Date(this.date.getTime() + n * 60000);
    return this;
  }

  removeMinutes(n: number) {
    this.date = new Date(this.date.getTime() - n * 60000);
    return this;
  }

  addHours(n: number) {
    this.date = new Date(this.date.getTime() + n * 3600000);
    return this;
  }

  removeHours(n: number) {
    this.date = new Date(this.date.getTime() - n * 3600000);
    return this;
  }

  isAfter(other: DateBuilder | Date) {
    const otherDate = other instanceof DateBuilder ? other.toDate() : other;
    return this.date.getTime() > otherDate.getTime();
  }

  isBefore(other: DateBuilder | Date) {
    const otherDate = other instanceof DateBuilder ? other.toDate() : other;
    return this.date.getTime() < otherDate.getTime();
  }

  isSame(other: DateBuilder | Date) {
    const otherDate = other instanceof DateBuilder ? other.toDate() : other;
    return this.date.getTime() === otherDate.getTime();
  }

  isAfterOrEqual(other: DateBuilder | Date) {
    const otherDate = other instanceof DateBuilder ? other.toDate() : other;
    return this.date.getTime() >= otherDate.getTime();
  }

  isBeforeOrEqual(other: DateBuilder | Date) {
    const otherDate = other instanceof DateBuilder ? other.toDate() : other;
    return this.date.getTime() <= otherDate.getTime();
  }

  setTime(time: string) {
    const [hours, minutes] = time.split(':').map(Number);
    this.date.setUTCHours(hours, minutes, 0, 0);
    return this;
  }

  getTime(): string {
    const hours = String(this.date.getUTCHours()).padStart(2, '0');
    const minutes = String(this.date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  toEpoch(): number {
    return this.date.getTime();
  }

  toDateString() {
    return DateBuilder.toISODateString(this.date);
  }

  static fromISO(isoString: string) {
    return new DateBuilder(new Date(isoString));
  }

  static from(date: Date) {
    return new DateBuilder(date);
  }

  static timeToEpoch(date: Date | string, time: string): number {
    return DateBuilder.from(typeof date === 'string' ? new Date(date) : date)
      .setTime(time)
      .toEpoch();
  }

  static epochToTime(epoch: number): string {
    return DateBuilder.from(new Date(epoch)).getTime();
  }

  static toISODateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  static hsbDateTimeToUTCEpoch(date: string, time: string): number {
    return new Date(`${date}T${time}:00.000Z`).getTime();
  }

  static fromHsbDateTime(input: HsbDateTimeDto): DateBuilder {
    return DateBuilder.from(new Date(`${input.date}T${input.time}:00.000Z`));
  }

  toDate() {
    return this.date;
  }
}
