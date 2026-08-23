import { useEffect, useRef, useState } from 'react';
import { parseSegments } from '../advisor/types';

const TYPEWRITER_SPEED_MS = 40;
const MOUTH_FLAP_SPEED_MS = 150;
const EMOTION_PAUSE_MS = 2000;
const SLIDE_DURATION_MS = 350;
const LINE_HEIGHT_PX = 20;
const LINE_SLIDE_MS = 160;
const VISIBLE_LINES = 3;
const BOX_HEIGHT_PX = LINE_HEIGHT_PX * VISIBLE_LINES;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export interface AdvisorOverlayProps {
  message: string;
  onDismiss: () => void;
  /** Base path to advisor image folder, with trailing slash. Default: '/images/advisor/' */
  advisorPath?: string;
  /** Label shown above the dialogue text. Default: 'Advisor' */
  speakerName?: string;
}

export default function AdvisorOverlay({
  message,
  onDismiss,
  advisorPath = '/images/advisor/',
  speakerName = 'Advisor',
}: AdvisorOverlayProps) {
  const closedFrame = `${advisorPath}advisor-closed.png`;
  const openFrames = [
    `${advisorPath}advisor-open.png`,
    `${advisorPath}advisor-open-2.png`,
  ];

  const [visible, setVisible] = useState(false);
  const [lines, setLines] = useState<string[]>(['']);
  const [isTalking, setIsTalking] = useState(false);
  const [frameOpen, setFrameOpen] = useState<string | null>(null);
  const [currentEmotion, setCurrentEmotion] = useState<string | null>(null);
  const [slideOffset, setSlideOffset] = useState(0);
  const [isSliding, setIsSliding] = useState(false);

  const epochRef = useRef(0);
  const dismissingRef = useRef(false);
  const slidingRef = useRef(false);
  const linesRef = useRef<string[]>(['']);
  const containerRef = useRef<HTMLDivElement>(null);

  // Slide in on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Mouth flap: toggles between null (closed) and a random open frame
  useEffect(() => {
    if (!isTalking) { setFrameOpen(null); return; }
    const id = setInterval(() => {
      setFrameOpen((p) =>
        p !== null ? null : openFrames[Math.floor(Math.random() * openFrames.length)]
      );
    }, MOUTH_FLAP_SPEED_MS);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTalking]);

  // Slide up exactly 1 line when lines exceed VISIBLE_LINES.
  // Removing lines[0] never reflows the remaining <div>s — the snap is seamless.
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  /**
   * Append `word` to the last line if it fits, otherwise start a new line.
   * Uses a temporary invisible probe <div> — never mutates any rendered element.
   */
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

  useEffect(() => {
    const epoch = ++epochRef.current;

    async function runMessage() {
      linesRef.current = [''];
      setLines(['']);
      setCurrentEmotion(null);
      setIsTalking(true);

      const segments = parseSegments(message);

      for (const seg of segments) {
        if (epochRef.current !== epoch) return;

        if (seg.type === 'emotion') {
          setIsTalking(false);
          setCurrentEmotion(seg.emotion);
          await sleep(EMOTION_PAUSE_MS);
          if (epochRef.current !== epoch) return;
          setCurrentEmotion(null);
          setIsTalking(true);
        } else {
          const words = seg.content.trim().split(/\s+/).filter(Boolean);
          for (const word of words) {
            if (epochRef.current !== epoch) return;
            while (slidingRef.current) {
              await sleep(TYPEWRITER_SPEED_MS);
              if (epochRef.current !== epoch) return;
            }
            addWord(word);
            await sleep(TYPEWRITER_SPEED_MS * word.length);
          }
        }
      }

      if (epochRef.current !== epoch) return;
      setIsTalking(false);
      setCurrentEmotion(null);
    }

    runMessage();
    return () => { epochRef.current++; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  function dismiss() {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    epochRef.current++;
    setVisible(false);
    setTimeout(onDismiss, SLIDE_DURATION_MS);
  }

  function getCurrentFrame(): string {
    if (currentEmotion) return `${advisorPath}advisor-${currentEmotion}.png`;
    return isTalking && frameOpen ? frameOpen : closedFrame;
  }

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        cursor: 'pointer',
        userSelect: 'none',
        transform: visible ? 'translateX(0)' : 'translateX(-110%)',
        transition: `transform ${SLIDE_DURATION_MS}ms ease-out`,
      }}
    >
      {/* Portrait — floats above the dialogue box, anchored bottom-left */}
      <img
        src={getCurrentFrame()}
        alt="Advisor"
        draggable={false}
        onError={(e) => { (e.target as HTMLImageElement).src = closedFrame; }}
        style={{
          position: 'absolute',
          left: 0,
          bottom: '100%',
          zIndex: 10,
          width: '66vw',
          maxWidth: '420px',
          objectFit: 'contain',
          objectPosition: 'bottom',
          pointerEvents: 'none',
          imageRendering: 'pixelated',
        }}
      />

      {/* Dialogue box */}
      <div
        style={{
          width: '100%',
          background: 'rgba(10, 20, 40, 0.92)',
          borderTop: '2px solid rgba(80, 140, 220, 0.7)',
          padding: '10px 14px 14px',
        }}
      >
        <p
          style={{
            fontSize: '0.75rem',
            fontWeight: 'bold',
            marginBottom: '4px',
            color: '#f9c74f',
            letterSpacing: '0.05em',
          }}
        >
          {speakerName}:
        </p>

        {/* Fixed-height text viewport — font-size set here so probe measurement matches */}
        <div
          ref={containerRef}
          style={{
            overflow: 'hidden',
            position: 'relative',
            height: BOX_HEIGHT_PX + 'px',
            fontSize: '0.875rem',
          }}
        >
          {/* Line list — animated up on scroll */}
          <div
            style={{
              transform: `translateY(${slideOffset}px)`,
              transition: isSliding ? `transform ${LINE_SLIDE_MS}ms ease-out` : 'none',
            }}
          >
            {lines.map((line, i) => (
              <div
                key={i}
                style={{
                  color: '#e8dfc8',
                  lineHeight: LINE_HEIGHT_PX + 'px',
                  height: LINE_HEIGHT_PX + 'px',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {line}
                {i === lines.length - 1 && isTalking && (
                  <span className="advisor-cursor">▌</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
