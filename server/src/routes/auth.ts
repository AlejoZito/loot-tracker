import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = config.auth.users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    const token = jwt.sign(
      { username, budgetUser: user.budgetUser },
      config.auth.jwtSecret,
      { expiresIn: '7d' }
    );
    return res.json({ token, budgetUser: user.budgetUser });
  }

  return res.status(401).json({ message: 'Invalid credentials' });
});

export default router;
