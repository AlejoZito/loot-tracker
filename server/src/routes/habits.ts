import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getHabitsForDay, getRecentHabits, computeHabitMonthSummary, upsertHabit, initHabitDay, getHabitHistory } from '../usecases/habits';
import { habitToDto } from '../mappers/dtoMapper';
import { Date as DomainDate } from '../domain/date';

const router = Router();

router.use(authMiddleware);

// GET /api/habits?day=YYYY-MM-DD or GET /api/habits?days=30
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : undefined;

    if (days) {
      const habits = await getRecentHabits(days, DomainDate.today().toISO());
      return res.json(habits.map(habitToDto));
    }

    const day = req.query.day as string;
    if (!day) {
      return res.status(400).json({ message: 'day or days query parameter is required' });
    }
    const habits = await getHabitsForDay(day);
    res.json(habits.map(habitToDto));
  } catch (error) {
    console.error('Error getting habits:', error);
    res.status(500).json({ message: 'Failed to get habits' });
  }
});

// GET /api/habits/history
router.get('/history', async (_req: AuthRequest, res: Response) => {
  try {
    res.json(await getHabitHistory());
  } catch (error) {
    console.error('Error getting habit history:', error);
    res.status(500).json({ message: 'Failed to get habit history' });
  }
});

// GET /api/habits/monthly-summary?month=YYYY-MM
router.get('/monthly-summary', async (req: AuthRequest, res: Response) => {
  try {
    const month = req.query.month as string;
    if (!month) {
      return res.status(400).json({ message: 'month query parameter is required (YYYY-MM)' });
    }

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    res.json(await computeHabitMonthSummary(year, monthNum));
  } catch (error) {
    console.error('Error getting monthly summary:', error);
    res.status(500).json({ message: 'Failed to get monthly summary' });
  }
});

// PUT /api/habits — upsert single habit
router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const { day, categoryId, value } = req.body;
    if (!day || !categoryId || value === undefined) {
      return res.status(400).json({ message: 'day, categoryId, and value are required' });
    }

    const user = req.user!.budgetUser;
    const habit = await upsertHabit(day, categoryId, value, user);
    res.json(habitToDto(habit));
  } catch (error) {
    console.error('Error updating habit:', error);
    res.status(500).json({ message: 'Failed to update habit' });
  }
});

// POST /api/habits/init-day — create default entries for a day
router.post('/init-day', async (req: AuthRequest, res: Response) => {
  try {
    const { day } = req.body;
    if (!day) {
      return res.status(400).json({ message: 'day is required' });
    }

    const user = req.user!.budgetUser;
    const habits = await initHabitDay(day, user);
    res.json(habits.map(habitToDto));
  } catch (error) {
    console.error('Error initializing day:', error);
    res.status(500).json({ message: 'Failed to initialize day' });
  }
});

export default router;
