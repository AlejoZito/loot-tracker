import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getHabitCategories } from '../usecases/habits';
import { habitCategoryToDto } from '../mappers/dtoMapper';

const router = Router();

router.use(authMiddleware);

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const categories = await getHabitCategories();
    res.json(categories.map(habitCategoryToDto));
  } catch (error) {
    console.error('Error getting habit categories:', error);
    res.status(500).json({ message: 'Failed to get habit categories' });
  }
});

export default router;
