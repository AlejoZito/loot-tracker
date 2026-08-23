export class Date {
  constructor(
    public readonly year: number,
    public readonly month: number,
    public readonly day: number,
  ) {}

  toISO(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}-${String(this.day).padStart(2, '0')}`;
  }

  equals(other: Date): boolean {
    return this.year === other.year && this.month === other.month && this.day === other.day;
  }

  static fromISO(iso: string): Date {
    const [y, m, d] = (iso || '').split('-').map(Number);
    return new Date(y || 0, m || 0, d || 0);
  }
}
