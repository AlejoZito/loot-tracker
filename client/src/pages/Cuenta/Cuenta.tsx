import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useDialogNPC } from '../../dialog-npc-temp';
import { Toggle } from '../../components/primitives/Toggle/Toggle';
import { useBudgetConfig } from '../../context/BudgetConfigContext';

interface CuentaProps {
  budgetUser: string | null;
  onLogout: () => void;
}

/** One portrait character per household slot. */
const PORTRAIT_BY_SLOT: Record<'userA' | 'userB', string> = {
  userA: 'druid',
  userB: 'warlock',
};

export default function Cuenta({ budgetUser, onLogout }: CuentaProps) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { enabled: advisorEnabled, setEnabled: setAdvisorEnabled } = useDialogNPC();
  const { labelForUser, slotForUser } = useBudgetConfig();
  const displayName = budgetUser ? labelForUser(budgetUser) : 'Usuario';
  const portraitBase = budgetUser ? PORTRAIT_BY_SLOT[slotForUser(budgetUser)] : 'default';
  const portraitName = `${portraitBase}_${theme}`;

  return (
    <div className="cuenta-page page-bg flex flex-col items-center">
      <div className="cuenta-container content-panel">
        <div className="cuenta-desktop-grid">
        {/* Left: Portrait */}
        <div className="cuenta-portrait-col">
          <div className="cuenta-portrait-frame">
            <img
              src={`/images/portraits/${portraitName}.jpg`}
              alt={`Retrato de ${displayName}`}
              className="cuenta-portrait"
            />
          </div>
          <h1 className="cuenta-username page-title">
            {displayName}
          </h1>
        </div>

        {/* Right: Settings */}
        <div className="cuenta-settings-col">
        {/* Theme Switcher */}
        <div className="theme-switcher flex flex-col items-center">
          <span className="theme-switcher-label">Tema</span>
          <div className="toggle-container">
            <button
              type="button"
              onClick={() => setTheme('orc')}
              className={`toggle-btn ${theme === 'orc' ? 'toggle-btn-active' : ''}`}
            >
              Orc
            </button>
            <button
              type="button"
              onClick={() => setTheme('material')}
              className={`toggle-btn ${theme === 'material' ? 'toggle-btn-active' : ''}`}
            >
              Material
            </button>
          </div>
        </div>

        {/* Advisor Toggle */}
        <div className="theme-switcher flex flex-col items-center">
          <span className="theme-switcher-label">Consejero</span>
          <button
            type="button"
            className={`switch-toggle ${advisorEnabled ? 'switch-toggle-on' : ''}`}
            onClick={() => setAdvisorEnabled(!advisorEnabled)}
          >
            <div className={`switch-thumb ${advisorEnabled ? 'switch-thumb-on' : 'switch-thumb-off'}`} />
          </button>
        </div>

        {/* Toggle demo */}
        <div className="theme-switcher flex flex-col items-center">
          <span className="theme-switcher-label">Toggle (nuevo)</span>
          <Toggle defaultChecked={false} />
        </div>

        {/* Advisor Debug */}
        {import.meta.env.DEV && (
          <button
            onClick={() => navigate('/advisor-debug')}
            className="btn w-full"
          >
            Advisor Debug
          </button>
        )}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="cuenta-logout-btn"
        >
          <div className="cuenta-logout-icon-frame">
            <img
              src="/images/icons/exit.jpg"
              alt="Salir"
              className="cuenta-logout-icon"
            />
          </div>
          <span className="cuenta-logout-label">Salir</span>
        </button>
        </div>{/* cuenta-settings-col */}
        </div>{/* cuenta-desktop-grid */}
      </div>
    </div>
  );
}
