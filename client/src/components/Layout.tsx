import { Link, useLocation } from 'react-router-dom';
import OfflineBanner from './OfflineBanner';
import { useViewport } from '../hooks/useViewport';
import { useBudgetConfig } from '../context/BudgetConfigContext';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

interface LayoutProps {
  children: React.ReactNode;
  budgetUser?: string | null;
  aside?: React.ReactNode;
}

export default function Layout({ children, budgetUser, aside }: LayoutProps) {
  const location = useLocation();
  const viewport = useViewport();
  const { labelForUser } = useBudgetConfig();

  const navItems: NavItem[] = [
    { path: '/', icon: '/images/icons/list.jpg', label: 'Gastos' },
    { path: '/summary', icon: '/images/icons/abacus.jpg', label: 'Resumen' },
    { path: '/habits', icon: '/images/icons/health.jpg', label: 'Hábitos' },
    { path: '/advisor', icon: '/images/icons/advisor.jpg', label: 'Consejero' },
    { path: '/cuenta', icon: '/images/icons/exit.jpg', label: 'Cuenta' },
  ];

  const isDesktop = viewport === 'desktop';

  return (
    <div className={`app-shell${aside ? ' app-shell--with-aside' : ''}`} data-viewport={viewport}>
      <div className="app-banner">
        <OfflineBanner />
      </div>

      {/* Sidebar (desktop) / Bottom nav (mobile+tablet) */}
      <nav className="app-nav" aria-label="Navegación principal">
        {isDesktop && (
          <div className="app-nav-brand">
            <span className="app-nav-brand-text">Budget</span>
          </div>
        )}

        <div className="app-nav-items">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={`app-nav-item ${isActive ? 'app-nav-item--active' : ''}`}
              >
                <img src={item.icon} alt={item.label} className="app-nav-icon" style={{ width: 32, height: 32 }} />
                {isDesktop && <span className="app-nav-label">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {isDesktop && budgetUser && (
          <div className="app-nav-user">
            <span className="app-nav-user-name">{labelForUser(budgetUser)}</span>
          </div>
        )}
      </nav>

      <main className="app-main">{children}</main>

      <div className="app-aside">
        {aside}
      </div>
    </div>
  );
}
