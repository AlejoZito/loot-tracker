export function shortMonth(period: string): string {
  const [y, m] = period.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
}

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
}

export function filterMonths(months: string[], range: 'last6' | 'ytd' | 'all'): string[] {
  if (range === 'last6') return months.slice(-6);
  if (range === 'ytd') {
    const year = new Date().getFullYear();
    return months.filter(m => m.startsWith(`${year}-`));
  }
  return months;
}

export function fmtAmt(n: number): string {
  return Math.round(n).toLocaleString('es-AR');
}
