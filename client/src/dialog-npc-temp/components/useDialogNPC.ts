import { useContext } from 'react';
import type { DialogNPCPort } from '../port/npc';
import { DialogNPCContext } from './DialogNPCProvider';

export function useDialogNPC(): DialogNPCPort {
  return useContext(DialogNPCContext);
}
