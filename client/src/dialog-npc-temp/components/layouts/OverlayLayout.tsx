import { useEffect, useRef, useState } from 'react';
import type { Assets } from '../../domain/assets';
import { DEFAULT_ANIMATION } from '../../domain/config';
import type { AnimationConfig } from '../../domain/config';
import { useEngine } from '../../engine/useEngine';

const SLIDE_DURATION_MS = 350;
const LINE_HEIGHT_PX = 20;
const LINE_SLIDE_MS = 160;
const VISIBLE_LINES = 3;
const BOX_HEIGHT_PX = LINE_HEIGHT_PX * VISIBLE_LINES;

interface OverlayLayoutProps {
  message: { text: string; durationMs: number };
  assets: Assets;
  speakerName?: string;
  animation?: AnimationConfig;
  onDismiss: () => void;
}

export function OverlayLayout({
  message,
  assets,
  speakerName,
  animation = DEFAULT_ANIMATION,
  onDismiss,
}: OverlayLayoutProps) {
  const [visible, setVisible] = useState(false);
  const [lines, setLines] = useState<string[]>(['']);
  const [isDone, setIsDone] = useState(false);
  const [slideOffset, setSlideOffset] = useState(0);
  const [isSliding, setIsSliding] = useState(false);

  const linesRef = useRef<string[]>(['']);
  const slidingRef = useRef(false);
  const dismissingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!isDone) return;
    const id = setTimeout(dismiss, message.durationMs);
    return () => clearTimeout(id);
  }, [isDone, message.durationMs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (lines.length <= VISIBLE_LINES || slidingRef.current) return;
    slidingRef.current = true;
    setIsSliding(true);
    setSlideOffset(-LINE_HEIGHT_PX);
    setTimeout(() => {
      const next = linesRef.current.slice(1);
      linesRef.current = next;
      setLines([...next]);
      setSlideOffset(0);
      setIsSliding(false);
      slidingRef.current = false;
    }, LINE_SLIDE_MS);
  }, [lines]); // eslint-disable-line react-hooks/exhaustive-deps

  function addWord(word: string) {
    const container = containerRef.current;
    if (!container) return;

    const probe = document.createElement('div');
    probe.style.cssText = [
      'position:absolute',
      'visibility:hidden',
      'pointer-events:none',
      `width:${container.clientWidth}px`,
      `font-size:${getComputedStyle(container).fontSize}`,
      `line-height:${LINE_HEIGHT_PX}px`,
      'white-space:nowrap',
    ].join(';');
    container.appendChild(probe);

    const current = linesRef.current;
    const lastLine = current[current.length - 1];
    const candidate = lastLine ? lastLine + ' ' + word : word;
    probe.textContent = candidate;
    const fits = probe.scrollWidth <= probe.clientWidth;
    container.removeChild(probe);

    const next = fits
      ? [...current.slice(0, -1), candidate]
      : [...current, word];
    linesRef.current = next;
    setLines(next);
  }

  const { frameUrl, isTalking } = useEngine(
    message.text,
    assets,
    {
      onStart: () => { linesRef.current = ['']; setLines(['']); },
      onWord: addWord,
      onDone: () => setIsDone(true),
      pauseRef: slidingRef,
    },
    animation,
  );

  function dismiss() {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    setVisible(false);
    setTimeout(onDismiss, SLIDE_DURATION_MS);
  }

  return (
    <div
      className="dnpc-overlay-root"
      style={{
        transform: visible ? 'translateX(0)' : 'translateX(-110%)',
        transition: `transform ${SLIDE_DURATION_MS}ms ease-out`,
      }}
      onClick={dismiss}
    >
      <img
        src={frameUrl}
        alt={speakerName ?? 'NPC'}
        className="dnpc-overlay-portrait"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.onerror = null;
          target.src = `${assets.baseUrl}/${assets.frames.idle}`;
        }}
        draggable={false}
      />
      <div className="dnpc-overlay-box">
        {speakerName && <p className="dnpc-overlay-speaker">{speakerName}:</p>}
        <div
          ref={containerRef}
          className="dnpc-overlay-viewport"
          style={{ height: `${BOX_HEIGHT_PX}px` }}
        >
          <div
            style={{
              transform: `translateY(${slideOffset}px)`,
              transition: isSliding ? `transform ${LINE_SLIDE_MS}ms ease-out` : 'none',
            }}
          >
            {lines.map((line, i) => (
              <div
                key={i}
                className="dnpc-overlay-line"
                style={{ lineHeight: `${LINE_HEIGHT_PX}px`, height: `${LINE_HEIGHT_PX}px` }}
              >
                {line}
                {i === lines.length - 1 && isTalking && (
                  <span className="dnpc-cursor">▌</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
