import { describe, it, expect } from 'vitest';
import { Period } from '../../../server/src/domain/period';

describe('Period', () => {
  it('can be constructed from year and month', () => {
    const p = new Period(2024, 6);
    expect(p.year).toBe(2024);
    expect(p.month).toBe(6);
  });

  it('equals returns true for same year and month', () => {
    const a = new Period(2024, 6);
    const b = new Period(2024, 6);
    expect(a.equals(b)).toBe(true);
  });

  it('equals returns false when different', () => {
    expect(new Period(2024, 6).equals(new Period(2024, 7))).toBe(false);
    expect(new Period(2024, 6).equals(new Period(2025, 6))).toBe(false);
  });

  it('toMMYYYY formats as MM-YYYY', () => {
    expect(new Period(2024, 6).toMMYYYY()).toBe('06-2024');
    expect(new Period(2024, 12).toMMYYYY()).toBe('12-2024');
  });

  it('toYYYYMM formats as YYYY-MM', () => {
    expect(new Period(2024, 6).toYYYYMM()).toBe('2024-06');
  });
});
