export class DateBuilder {
  private date: Date;

  constructor(d = new Date()) {
    this.date = d;
  }

  static today() {
    return new DateBuilder();
  }

  static date(year: number, month: number, day: number) {
    return new DateBuilder(new Date(year, month - 1, day));
  }

  addDays(n: number) {
    this.date = new Date(this.date.getTime() + n * 86400000);
    return this;
  }

  removeDays(n: number) {
    this.date = new Date(this.date.getTime() - n * 86400000);
    return this;
  }

  static fromISO(isoString: string) {
    return new DateBuilder(new Date(isoString));
  }

  toDateString() {
    return this.date.toISOString().split('T')[0];
  }

  toDate() {
    return this.date;
  }
}
