export class DateBuilder {
  private date: Date;

  constructor(d = new Date()) {
    this.date = d;
  }

  static today() {
    return new DateBuilder();
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

  static fromISO(isoString: string) {
    return new DateBuilder(new Date(isoString));
  }

  static from(date: Date) {
    return new DateBuilder(date);
  }

  toDateString() {
    return this.date.toISOString().split('T')[0];
  }

  toDate() {
    return this.date;
  }
}
