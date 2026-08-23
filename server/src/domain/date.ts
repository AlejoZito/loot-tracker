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

  /** UTC arithmetic, so a DST boundary can never move the result by a day. */
  minusDays(days: number): Date {
    const t = new globalThis.Date(globalThis.Date.UTC(this.year, this.month - 1, this.day - days));
    return new Date(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }

  static today(): Date {
    const now = new globalThis.Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  static fromISO(iso: string): Date {
    const [y, m, d] = (iso || '').split('-').map(Number);
    return new Date(y || 0, m || 0, d || 0);
  }
}
