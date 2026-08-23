/** A per-slot pair of values. `userA` / `userB` are household slots, not people. */
export interface UserPair {
  userA: number;
  userB: number;
}

export class MonthlySummary {
  constructor(
    public readonly year: number,
    public readonly monthLabel: string,
    public readonly individualExpenses: UserPair,
    public readonly sharedExpenses: UserPair & { total: number },
    public readonly sharedExpensesPercent: UserPair,
    public readonly totalExpenses: UserPair,
    public readonly individualIncome: UserPair,
    public readonly sharedIncome: UserPair,
    public readonly incomePercent: UserPair,
    public readonly sharedIncomeTotal: number,
    public readonly totalIncome: UserPair,
    public readonly savings: UserPair,
    public readonly householdSavings: number,
    public readonly savingsPercent: UserPair,
    public readonly householdSavingsPercent: number,
    /** Net settlement between the two slots. */
    public readonly saldo: { aToB: number; bToA: number },
  ) {}
}
