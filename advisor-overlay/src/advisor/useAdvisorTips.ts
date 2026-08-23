import tipsData from './tips.json';
import type { Tip } from './types';

function storageKey(user: string) {
  return `advisor-seen-${user}`;
}

function getSeenIndices(user: string): number[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(user)) || '[]');
  } catch {
    return [];
  }
}

function saveSeenIndices(user: string, indices: number[]): void {
  localStorage.setItem(storageKey(user), JSON.stringify(indices));
}

/** Pick the next unseen tip for `budgetUser`, cycling back when all have been seen. */
export function pickNextTip(budgetUser: string | null): Tip | null {
  const user = budgetUser ?? 'all';

  const eligible = (tipsData.tips as Tip[]).filter(
    (t) => t.users === 'all' || (Array.isArray(t.users) && t.users.includes(user))
  );

  if (eligible.length === 0) return null;

  let seen = getSeenIndices(user);
  const unseen = eligible.map((_, i) => i).filter((i) => !seen.includes(i));

  const pool = unseen.length > 0 ? unseen : eligible.map((_, i) => i);
  if (unseen.length === 0) seen = [];

  const pick = pool[Math.floor(Math.random() * pool.length)];
  saveSeenIndices(user, [...seen, pick]);

  return eligible[pick];
}
