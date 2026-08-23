import { useEffect, useRef, useState } from 'react';
import { useDialogNPC } from '../../dialog-npc-temp';

const NPC_PATH = '/dialog-npc-assets/';

const KNOWN_EMOTES = ['flex', 'judgmental', 'thinking', 'wink'];

type Mode = 'idle' | 'speaking' | { emote: string };

export default function AdvisorDebug() {
  const closedFrame = `${NPC_PATH}closed.png`;
  const openFrame = `${NPC_PATH}open.png`;

  const [mode, setMode] = useState<Mode>('idle');
  const [frame, setFrame] = useState(closedFrame);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const npc = useDialogNPC();
  const [testMessage, setTestMessage] = useState('Gastaste 40 mil pesos en delivery esta semana. <thinking> Estoy procesando esto. <wink> Bueno, al menos comiste rico. <judgmental> En serio, cuarenta mil. <flex> Igual, si lo podes sostener, adelante.');

  function clearInterval_() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => {
    clearInterval_();

    if (mode === 'idle') {
      setFrame(closedFrame);
    } else if (mode === 'speaking') {
      setFrame(closedFrame);
      intervalRef.current = setInterval(
        () => setFrame((f) => (f === closedFrame ? openFrame : closedFrame)),
        150
      );
    } else {
      setFrame(`${NPC_PATH}${mode.emote}.png`);
    }

    return clearInterval_;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const activeEmote = typeof mode === 'object' ? mode.emote : null;

  return (
    <div className="page-bg min-h-screen flex flex-col items-center py-6 px-4 gap-6">
      <h1 className="page-title text-xl">Advisor Debug</h1>

      {/* Preview */}
      <div className="content-panel flex flex-col items-center gap-2 w-full max-w-xs p-4">
        <img
          src={frame}
          alt="advisor preview"
          onError={(e) => { (e.target as HTMLImageElement).src = closedFrame; }}
          style={{ width: '100%', maxWidth: '220px', imageRendering: 'pixelated' }}
        />
        <span className="helper-text text-xs opacity-60">
          {mode === 'idle' ? 'idle' : mode === 'speaking' ? 'speaking' : `emote: ${activeEmote}`}
        </span>
      </div>

      {/* Mode buttons */}
      <div className="content-panel w-full max-w-xs p-4 flex flex-col gap-3">
        <p className="field-label text-xs mb-1">Modo</p>
        <div className="flex gap-2">
          <button
            className={`btn flex-1 ${mode === 'idle' ? 'btn-active' : ''}`}
            onClick={() => setMode('idle')}
          >
            Idle
          </button>
          <button
            className={`btn flex-1 ${mode === 'speaking' ? 'btn-active' : ''}`}
            onClick={() => setMode('speaking')}
          >
            Speaking
          </button>
        </div>

        <p className="field-label text-xs mt-2 mb-1">Emotes</p>
        <div className="flex flex-wrap gap-2">
          {KNOWN_EMOTES.map((emote) => (
            <button
              key={emote}
              className={`btn text-xs px-2 py-1 ${activeEmote === emote ? 'btn-active' : ''}`}
              onClick={() => setMode({ emote })}
            >
              {emote}
            </button>
          ))}
        </div>
      </div>

      {/* Overlay test */}
      <div className="content-panel w-full max-w-xs p-4 flex flex-col gap-3">
        <p className="field-label text-xs mb-1">Test Overlay</p>
        <textarea
          className="input-field text-sm w-full"
          rows={3}
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
        />
        <button
          className="btn"
          onClick={() => npc.show(testMessage)}
        >
          Mostrar overlay
        </button>
      </div>
    </div>
  );
}
