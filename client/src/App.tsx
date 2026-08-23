import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login/Login';
import ExpenseList from './pages/ExpenseList/ExpenseList';
import AddExpense from './pages/AddExpense/AddExpense';
import CrossMonthSummary from './pages/CrossMonthSummary/CrossMonthSummary';
import SummaryV3 from './pages/SummaryV3';
import Cuenta from './pages/Cuenta/Cuenta';
import Habits from './pages/Habits/Habits';
import HabitsHistory from './pages/HabitsHistory/HabitsHistory';
import AdvisorPage from './pages/AdvisorPage/AdvisorPage';
import AdvisorDebug from './pages/AdvisorDebug/AdvisorDebug';
import Layout from './components/Layout';
import { DialogNPCProvider } from './dialog-npc-temp';
import { npcAssets } from './dialog-npc-config';
import { RightSlotProvider } from './context/RightSlotContext';
import { RightSlotPanel } from './feature/RightSlot/RightSlotPanel';
import { BudgetConfigProvider } from './context/BudgetConfigContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [budgetUser, setBudgetUser] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('budgetUser');
    if (token) {
      setIsAuthenticated(true);
      setBudgetUser(storedUser);
    }
  }, []);

  const handleLogin = (token: string, user: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('budgetUser', user);
    setIsAuthenticated(true);
    setBudgetUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('budgetUser');
    setIsAuthenticated(false);
    setBudgetUser(null);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BudgetConfigProvider>
      <RightSlotProvider>
        <DialogNPCProvider config={{ assets: npcAssets, speakerName: 'Consejero' }}>
          <AppShell budgetUser={budgetUser} onLogout={handleLogout} />
        </DialogNPCProvider>
      </RightSlotProvider>
    </BudgetConfigProvider>
  );
}

interface AppShellProps {
  budgetUser: string | null;
  onLogout: () => void;
}

function AppShell({ budgetUser, onLogout }: AppShellProps) {
  const location = useLocation();
  const isExpenseList = location.pathname === '/';

  return (
    <div className="budget-app">
      <Layout budgetUser={budgetUser} aside={isExpenseList ? <RightSlotPanel /> : undefined}>
        <Routes>
          <Route path="/" element={<ExpenseList budgetUser={budgetUser} />} />
          <Route path="/add" element={<AddExpense />} />
          <Route path="/edit/:id" element={<AddExpense />} />
          <Route path="/summary" element={<SummaryV3 budgetUser={budgetUser} />} />
          <Route path="/summary/history" element={<CrossMonthSummary budgetUser={budgetUser} />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/habits/history" element={<HabitsHistory />} />
          <Route path="/advisor" element={<AdvisorPage budgetUser={budgetUser} />} />
          <Route path="/cuenta" element={<Cuenta budgetUser={budgetUser} onLogout={onLogout} />} />
          <Route path="/advisor-debug" element={<AdvisorDebug />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </div>
  );
}

export default App;
