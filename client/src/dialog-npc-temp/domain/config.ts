import type { StorageAdapter } from '../port/storage';
import type { Assets } from './assets';

export interface AnimationConfig {
  typewriterSpeedMs: number;
  mouthFlapSpeedMs: number;
  emotePauseMs: number;
}

export const DEFAULT_ANIMATION: AnimationConfig = {
  typewriterSpeedMs: 40,
  mouthFlapSpeedMs: 150,
  emotePauseMs: 2000,
};

export interface DialogNPCConfig {
  assets: Assets;
  speakerName?: string;
  enabled?: boolean;
  defaultDurationMs?: number;
  storage?: StorageAdapter;
  animation?: Partial<AnimationConfig>;
  ui?: {
    variant?: 'overlay' | 'page';
  };
}

export function resolveAnimation(partial?: Partial<AnimationConfig>): AnimationConfig {
  return { ...DEFAULT_ANIMATION, ...partial };
}
