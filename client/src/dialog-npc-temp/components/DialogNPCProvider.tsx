import { createContext, useCallback, useState } from 'react';
import type { Assets } from '../domain/assets';
import type { DialogNPCConfig } from '../domain/config';
import { resolveAnimation } from '../domain/config';
import type { DialogMessage, InternalMessage } from '../domain/message';
import { normalizeMessage } from '../domain/message';
import type { DialogNPCPort } from '../port/npc';
import type { StorageAdapter } from '../port/storage';
import { OverlayLayout } from './layouts/OverlayLayout';
import { PageLayout } from './layouts/PageLayout';

const localStorageAdapter: StorageAdapter = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  },
};

const STORAGE_KEY = 'dnpc-enabled';

export const DialogNPCContext = createContext<DialogNPCPort>({
  show: () => {},
  playSequence: () => {},
  hide: () => {},
  enabled: true,
  setEnabled: () => {},
  setAssets: () => {},
});

interface DialogNPCProviderProps {
  config: DialogNPCConfig;
  children: React.ReactNode;
}

export function DialogNPCProvider({ config, children }: DialogNPCProviderProps) {
  const {
    assets: initialAssets,
    enabled: initialEnabled = true,
    defaultDurationMs = 3000,
    speakerName,
    storage = localStorageAdapter,
    animation,
    ui,
  } = config;

  const resolvedAnimation = resolveAnimation(animation);
  const variant = ui?.variant ?? 'overlay';

  const [currentAssets, setCurrentAssets] = useState<Assets>(initialAssets);
  const [queue, setQueue] = useState<InternalMessage[]>([]);
  const [enabled, setEnabledState] = useState<boolean>(() => {
    const stored = storage.get(STORAGE_KEY);
    return stored !== null ? stored !== 'false' : initialEnabled;
  });

  const setEnabled = useCallback((value: boolean) => {
    storage.set(STORAGE_KEY, String(value));
    setEnabledState(value);
  }, [storage]);

  const show = useCallback((msg: DialogMessage) => {
    if (!enabled) return;
    setQueue((q) => [...q, normalizeMessage(msg, defaultDurationMs)]);
  }, [enabled, defaultDurationMs]);

  const playSequence = useCallback((msgs: DialogMessage[]) => {
    if (!enabled) return;
    setQueue((q) => [...q, ...msgs.map((m) => normalizeMessage(m, defaultDurationMs))]);
  }, [enabled, defaultDurationMs]);

  const hide = useCallback(() => setQueue([]), []);

  const setAssets = useCallback((assets: Assets) => setCurrentAssets(assets), []);

  const port: DialogNPCPort = { show, playSequence, hide, enabled, setEnabled, setAssets };

  return (
    <DialogNPCContext.Provider value={port}>
      {children}
      {queue[0] && variant === 'overlay' && (
        <OverlayLayout
          key={queue[0].id}
          message={queue[0]}
          assets={currentAssets}
          speakerName={speakerName}
          animation={resolvedAnimation}
          onDismiss={() => setQueue((q) => q.slice(1))}
        />
      )}
      {queue[0] && variant === 'page' && (
        <PageLayout
          key={queue[0].id}
          message={queue[0]}
          assets={currentAssets}
          speakerName={speakerName}
          animation={resolvedAnimation}
          onDone={() => setQueue((q) => q.slice(1))}
        />
      )}
    </DialogNPCContext.Provider>
  );
}
