import type { Assets } from '../domain/assets';
import type { DialogMessage } from '../domain/message';

export interface DialogNPCPort {
  show(message: DialogMessage): void;
  playSequence(messages: DialogMessage[]): void;
  hide(): void;
  enabled: boolean;
  setEnabled(enabled: boolean): void;
  setAssets(assets: Assets): void;
}
