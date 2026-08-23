import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getAllCategories } from '../usecases/categories';
import { categoryToDto } from '../mappers/dtoMapper';

const router = Router();

router.use(authMiddleware);

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const categories = await getAllCategories();
    res.json(categories.map(categoryToDto));
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ message: 'Failed to get categories' });
  }
});

export default router;
