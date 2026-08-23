import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import expenseRoutes from './routes/expenses';
import categoryRoutes from './routes/categories';
import summaryRoutes from './routes/summary';
import habitRoutes from './routes/habits';
import habitCategoryRoutes from './routes/habits-categories';
import installmentExpenseRoutes from './routes/installment-expenses';
import configRoutes from './routes/config';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/habits-categories', habitCategoryRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/installment-expenses', installmentExpenseRoutes);
app.use('/api/config', configRoutes);

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok' });
});

export default app;
