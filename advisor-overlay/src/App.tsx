import { AdvisorOverlayProvider, useAdvisorOverlay } from './components/AdvisorOverlayContext';
import { pickNextTip } from './advisor/useAdvisorTips';

const DEMO_MESSAGES = [
  'Welcome! I\'m your financial advisor. <think> Let\'s take a look at your spending together.',
  'Small daily expenses add up fast. A coffee here, a snack there... <surprised> That can be hundreds per month!',
  'Great job staying on budget! <wink> Keep it up and you\'ll build a solid emergency fund before you know it.',
];

function Demo() {
  const { showAdvisorOverlay } = useAdvisorOverlay();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '12px',
      padding: '24px',
    }}>
      <h1 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>Advisor Overlay</h1>
      <p style={{ opacity: 0.5, fontSize: '0.8rem', marginBottom: '20px' }}>
        Click a button to trigger. Click the overlay to dismiss.
      </p>

      {DEMO_MESSAGES.map((msg, i) => (
        <button
          key={i}
          onClick={() => showAdvisorOverlay(msg)}
          style={btnStyle}
        >
          {msg.replace(/<\w+>/g, '').trim().slice(0, 70)}…
        </button>
      ))}

      <button
        onClick={() => {
          const tip = pickNextTip(null);
          if (tip) showAdvisorOverlay(tip.text);
        }}
        style={{ ...btnStyle, borderColor: 'rgba(249,199,79,0.5)', color: '#f9c74f' }}
      >
        Random tip from tips.json
      </button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'rgba(80, 140, 220, 0.15)',
  border: '1px solid rgba(80, 140, 220, 0.4)',
  color: '#e8dfc8',
  padding: '10px 18px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.85rem',
  maxWidth: '420px',
  width: '100%',
  textAlign: 'left',
};

export default function App() {
  return (
    <AdvisorOverlayProvider advisorPath="/images/advisor/" speakerName="Advisor">
      <Demo />
    </AdvisorOverlayProvider>
  );
}
