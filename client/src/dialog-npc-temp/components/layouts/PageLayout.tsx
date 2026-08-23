import { useState } from 'react';
import type { Assets } from '../../domain/assets';
import { DEFAULT_ANIMATION } from '../../domain/config';
import type { AnimationConfig } from '../../domain/config';
import { useEngine } from '../../engine/useEngine';

interface PageLayoutProps {
  message: { text: string } | null;
  assets: Assets;
  speakerName?: string;
  animation?: AnimationConfig;
  onDone?: () => void;
}

export function PageLayout({
  message,
  assets,
  speakerName,
  animation = DEFAULT_ANIMATION,
  onDone,
}: PageLayoutProps) {
  const [displayedText, setDisplayedText] = useState('');

  const { frameUrl, isTalking } = useEngine(
    message?.text ?? null,
    assets,
    {
      onStart: () => setDisplayedText(''),
      onWord: (word) => setDisplayedText((p) => (p ? p + ' ' + word : word)),
      onDone: () => onDone?.(),
    },
    animation,
  );

  return (
    <div className="dnpc-page-root">
      <img
        src={frameUrl}
        alt={speakerName ?? 'NPC'}
        className="dnpc-page-portrait"
      />
      <div className="dnpc-page-body">
        <div className="dnpc-page-bubble">
          <p className="dnpc-page-text">
            {displayedText}
            {isTalking && <span className="dnpc-cursor">|</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
