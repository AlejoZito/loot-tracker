export class Period {
  constructor(
    public readonly year: number,
    public readonly month: number,
  ) {}

  equals(other: { year: number; month: number }): boolean {
    return this.year === other.year && this.month === other.month;
  }

  toMMYYYY(): string {
    return `${String(this.month).padStart(2, '0')}-${this.year}`;
  }

  toYYYYMM(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}`;
  }

  static fromYYYYMM(s: string): Period {
    const [y, m] = (s || '').split('-').map(Number);
    return new Period(y || 0, m || 0);
  }
}
