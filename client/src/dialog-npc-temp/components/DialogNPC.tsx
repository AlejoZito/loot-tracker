import type { Assets } from '../domain/assets';
import type { AnimationConfig } from '../domain/config';
import type { DialogMessage } from '../domain/message';
import { OverlayLayout } from './layouts/OverlayLayout';
import { PageLayout } from './layouts/PageLayout';

interface DialogNPCProps {
  variant: 'overlay' | 'page';
  message: DialogMessage | null;
  assets: Assets;
  speakerName?: string;
  animation?: AnimationConfig;
  onDone?: () => void;
}

export function DialogNPC({ variant, message, assets, speakerName, animation, onDone }: DialogNPCProps) {
  const text = message == null ? null : typeof message === 'string' ? message : message.text;
  const durationMs = message != null && typeof message === 'object' && message.durationMs != null
    ? message.durationMs
    : 3000;

  if (variant === 'overlay') {
    if (!text) return null;
    return (
      <OverlayLayout
        message={{ text, durationMs }}
        assets={assets}
        speakerName={speakerName}
        animation={animation}
        onDismiss={() => onDone?.()}
      />
    );
  }

  return (
    <PageLayout
      message={text ? { text } : null}
      assets={assets}
      speakerName={speakerName}
      animation={animation}
      onDone={onDone}
    />
  );
}
