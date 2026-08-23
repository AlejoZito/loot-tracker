import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Period } from '../domain/period';
import { getSummaryByMonth, getCategoryBreakdownForPeriod, getCategoryHistory } from '../usecases/summary';
import { monthlySummaryToDto } from '../mappers/dtoMapper';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/summary/by-category/:month?type=income|expense
 *
 * Source: summary_by_categories sheet
 * Filters by: period + type (all users)
 * Returns: IncomeCategoryBreakdown[] — each { category, user, shared, personal, total }
 *
 * Query params:
 *   type — "income" | "expense" (required)
 */
router.get('/by-category/:month', async (req: AuthRequest, res: Response) => {
  try {
    const [y, m] = req.params.month.split('-').map(Number);
    const period = new Period(y, m);

    if (!period.year || !period.month || period.month < 1 || period.month > 12) {
      return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
    }

    const type = req.query.type as string;
    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ message: 'Query param "type" must be "income" or "expense"' });
    }

    const budgetUser = req.user?.budgetUser;
    if (!budgetUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const data = await getCategoryBreakdownForPeriod(period, type);
    res.json(data);
  } catch (error) {
    console.error('Error getting by category:', error);
    res.status(500).json({ message: 'Failed to get by category' });
  }
});

/**
 * GET /api/summary/history
 *
 * Returns all category transactions aggregated by (period, user, category, type)
 * Used for cross-month charts
 */
router.get('/history', async (_req: AuthRequest, res: Response) => {
  try {
    const data = await getCategoryHistory();
    res.json(data);
  } catch (error) {
    console.error('Error getting category history:', error);
    res.status(500).json({ message: 'Failed to get category history' });
  }
});

/**
 * GET /api/summary/:month
 *
 * Source: summary sheet only (pre-calculated data)
 * Returns: SummaryMonth
 */
router.get('/:month', async (req: AuthRequest, res: Response) => {
  try {
    const [year, month] = req.params.month.split('-').map(Number);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
    }

    const summary = await getSummaryByMonth(year, month);

    if (!summary) {
      return res.status(404).json({ message: 'No summary data for this month' });
    }

    res.json(monthlySummaryToDto(summary));
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({ message: 'Failed to get summary' });
  }
});

export default router;
