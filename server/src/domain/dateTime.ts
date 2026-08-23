export class DateTime {
  constructor(
    public readonly year: number,
    public readonly month: number,
    public readonly day: number,
    public readonly hour: number = 0,
    public readonly minute: number = 0,
    public readonly second: number = 0,
  ) {}

  /** Returns the date portion as YYYY-MM-DD */
  toISO(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}-${String(this.day).padStart(2, '0')}`;
  }

  /** Returns full datetime as YYYY-MM-DD HH:MM:SS, or just YYYY-MM-DD if time is midnight */
  toISODateTime(): string {
    if (this.hour === 0 && this.minute === 0 && this.second === 0) return this.toISO();
    return `${this.toISO()} ${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}:${String(this.second).padStart(2, '0')}`;
  }

  equals(other: DateTime): boolean {
    return (
      this.year === other.year &&
      this.month === other.month &&
      this.day === other.day &&
      this.hour === other.hour &&
      this.minute === other.minute &&
      this.second === other.second
    );
  }

  /** Parse from YYYY-MM-DD or YYYY-MM-DD HH:MM:SS */
  static fromISO(iso: string): DateTime {
    const [datePart, timePart] = (iso || '').split(' ');
    const [y, m, d] = (datePart || '').split('-').map(Number);
    const [h, min, s] = (timePart || '').split(':').map(Number);
    return new DateTime(y || 0, m || 0, d || 0, h || 0, min || 0, s || 0);
  }

  /** Parse from M/D/YYYY H:MM:SS (Google Sheets expense format) */
  static fromSheetExpense(s: string): DateTime {
    const trimmed = (s || '').trim();
    if (!trimmed) return new DateTime(0, 0, 0);
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return DateTime.fromISO(trimmed);
    const parts = trimmed.split('/');
    if (parts.length === 3 && trimmed.includes(' ')) {
      const [month, day, yearAndTime] = parts;
      const [year, time] = yearAndTime.split(' ');
      const [h, min, sec] = (time || '').split(':').map(Number);
      return new DateTime(Number(year) || 0, Number(month) || 0, Number(day) || 0, h || 0, min || 0, sec || 0);
    }
    return DateTime.fromISO(trimmed);
  }
}
