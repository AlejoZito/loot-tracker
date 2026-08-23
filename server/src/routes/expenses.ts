import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getAllExpenses, createExpense, updateExpense, deleteExpense, searchExpenses, type SearchScope } from '../usecases/expenses';
import { pagedExpensesResponse, expenseToDto } from '../mappers/dtoMapper';
import { DateTime } from '../domain/dateTime';

const router = Router();

router.use(authMiddleware);

router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const q = (req.query.q as string | undefined) ?? '';
    const scopeParam = (req.query.scope as string | undefined) ?? 'last3m';
    const scope: SearchScope = scopeParam === 'all' ? 'all' : 'last3m';
    const categoryParam = req.query.category as string | undefined;
    const category = categoryParam && categoryParam.length > 0 ? categoryParam : null;

    const results = await searchExpenses(q, scope, category);
    const capped = results.slice(0, 500);
    res.json({
      expenses: capped.map(expenseToDto),
      truncated: results.length > 500,
    });
  } catch (error) {
    console.error('Error searching expenses:', error);
    res.status(500).json({ message: 'Failed to search expenses' });
  }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const expenses = await getAllExpenses();
    res.json(pagedExpensesResponse(expenses, limit, offset));
  } catch (error) {
    console.error('Error getting expenses:', error);
    res.status(500).json({ message: 'Failed to get expenses' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    let date = DateTime.fromISO(body.date);
    if (date.hour === 0 && date.minute === 0 && date.second === 0) {
      const now = new globalThis.Date();
      date = new DateTime(date.year, date.month, date.day, now.getHours(), now.getMinutes(), now.getSeconds());
    }
    const expenseData = {
      ...body,
      date,
      user: body.user || req.user?.budgetUser || '',
    };
    const expense = await createExpense(expenseData);
    res.status(201).json(expenseToDto(expense));
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ message: 'Failed to create expense' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    const updates = {
      ...body,
      ...(body.date !== undefined && { date: DateTime.fromISO(body.date) }),
    };
    const expense = await updateExpense(req.params.id, updates);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json(expenseToDto(expense));
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ message: 'Failed to update expense' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await deleteExpense(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ message: 'Failed to delete expense' });
  }
});

export default router;
