// Advisor commentary shown when logging an expense/income or toggling a habit.
//
// This app doesn't know your category or habit ids ahead of time (they're defined in
// your sheet), so there's no per-category flavor text here — just a generic pool per
// transaction type. If you want category-specific commentary, key a `tips` map by the
// category `id` you set up in your sheet and look it up in `pickDialog` before falling
// back to `fallbacks`.

const fallbacks: Record<'income' | 'expense', string[]> = {
  expense: [
    'Gasto registrado. <judgmental> Bien anotado.',
    'Anotado. <thinking> El registro es la mitad de la batalla.',
    'Gasto guardado. <wink> Al menos sabes lo que gastas.',
  ],
  income: [
    'Ingreso registrado. <thinking> El consejero no pregunta de donde viene. Solo anota que llego.',
    'Entro plata. <wink> Disfrutalo. Dura menos de lo que pensas.',
    'Ingreso anotado. <smirk> Ahora viene la parte dificil.',
    'Plata en la cuenta. <greedy> El cofre no se llena solo. Aunque tampoco se vacia solo, por lo que el consejero ha observado.',
    'Ingreso registrado. <judgmental> El consejero habia empezado a preocuparse.',
    'Llego. <flex> Trabajas, cobras, gastas, volvemos a empezar. Pero por ahora, bien.',
  ],
};

export function pickDialog(_categoryId: string | null, type: 'income' | 'expense' = 'expense'): string {
  const pool = fallbacks[type];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickHabitDialog(_categoryId: string, _newValue: boolean): string | null {
  return null;
}
