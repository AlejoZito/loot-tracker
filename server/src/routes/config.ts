import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { budgetUsers } from '../config/env';
import { appSettingsRepository } from '../repositories';
import type { AppConfig } from '../../../common/types';

const router = Router();

router.use(authMiddleware);

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const settings = await appSettingsRepository.get();
    const config: AppConfig = {
      users: budgetUsers.map(({ slot, id, label }) => ({ slot, id, label })),
      mainCurrency: settings.mainCurrency,
      defaultExpenseCurrency: settings.defaultExpenseCurrency,
      locale: settings.locale,
      availableCurrencies: settings.availableCurrencies,
    };
    res.json(config);
  } catch (error) {
    console.error('Failed to load app config:', error);
    res.status(500).json({ error: 'Failed to load config' });
  }
});

export default router;
