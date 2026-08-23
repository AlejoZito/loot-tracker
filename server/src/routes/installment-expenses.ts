import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getInstallmentsByCategory, getInstallmentsByMonth, getInstallmentsByCategoryAndMonth } from '../usecases/installmentExpenses';
import { installmentExpenseToDto } from '../mappers/dtoMapper';

const router = Router();

router.use(authMiddleware);

// GET /api/installment-expenses?category=xxx&user=xxx
// GET /api/installment-expenses?month=YYYY-MM&user=xxx
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const month = req.query.month as string | undefined;
    const user = req.query.user as string | undefined;

    if (category && month) {
      const results = await getInstallmentsByCategoryAndMonth(category, month, user);
      return res.json(results.map(installmentExpenseToDto));
    }

    if (category) {
      const results = await getInstallmentsByCategory(category, user);
      return res.json(results.map(installmentExpenseToDto));
    }

    if (month) {
      const results = await getInstallmentsByMonth(month, user);
      return res.json(results.map(installmentExpenseToDto));
    }

    res.status(400).json({ message: 'Provide at least category or month query param' });
  } catch (error) {
    console.error('Error getting installment expenses:', error);
    res.status(500).json({ message: 'Failed to get installment expenses' });
  }
});

export default router;
