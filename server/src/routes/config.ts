import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { budgetUsers } from '../config/env';
import type { AppConfig } from '../../../common/types';

const router = Router();

router.use(authMiddleware);

router.get('/', (_req: AuthRequest, res: Response) => {
  const config: AppConfig = {
    users: budgetUsers.map(({ slot, id, label }) => ({ slot, id, label })),
  };
  res.json(config);
});

export default router;
