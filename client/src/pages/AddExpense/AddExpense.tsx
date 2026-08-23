import { useNavigate, useParams } from 'react-router-dom';
import { AddExpenseForm } from '../../feature/AddExpense/AddExpenseForm';

export default function AddExpense() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  return (
    <AddExpenseForm
      id={id}
      onSuccess={() => navigate('/')}
    />
  );
}
