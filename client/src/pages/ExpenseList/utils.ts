import type { AppConfig } from '../../types';

/** Which household slot a budget-user id belongs to (defaults to userA if unknown). */
export function slotForUser(userId: string | null | undefined, config: AppConfig): 'userA' | 'userB' {
  return config.users.find(u => u.id === userId)?.slot ?? 'userA';
}

/** Display label for a household slot. */
export function labelForSlot(slot: 'userA' | 'userB', config: AppConfig): string {
  return config.users.find(u => u.slot === slot)?.label || slot;
}
