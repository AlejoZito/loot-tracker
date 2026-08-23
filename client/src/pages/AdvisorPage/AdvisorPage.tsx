import { useState, useEffect } from 'react';
import { DialogNPC } from '../../dialog-npc-temp';
import { npcAssets } from '../../dialog-npc-config';
import { pickNextTip } from '../../dialog/useTips';

interface AdvisorPageProps {
  budgetUser: string | null;
}

export default function AdvisorPage({ budgetUser }: AdvisorPageProps) {
  const [tip, setTip] = useState(() => pickNextTip(budgetUser));
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('advisor-page-active');
    return () => document.documentElement.classList.remove('advisor-page-active');
  }, []);

  function nextTip() {
    setDone(false);
    setTip(pickNextTip(budgetUser));
  }

  if (!tip) {
    return (
      <div style={{ background: 'black', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#fef9c3' }}>No hay consejos disponibles.</p>
      </div>
    );
  }

  return (
    <>
      <DialogNPC
        variant="page"
        message={{ text: tip.text }}
        assets={npcAssets}
        speakerName="Consejero"
        onDone={() => setDone(true)}
      />
      {done && (
        <button
          onClick={nextTip}
          className="btn"
          style={{ position: 'fixed', bottom: '4.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
        >
          Otro consejo
        </button>
      )}
    </>
  );
}
