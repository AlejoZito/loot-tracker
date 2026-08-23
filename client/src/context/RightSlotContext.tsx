import { createContext, useContext, useState } from 'react';

interface RightSlotContextValue {
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  refreshCount: number;
  notifyExpenseSaved: () => void;
}

const RightSlotContext = createContext<RightSlotContextValue | null>(null);

export function RightSlotProvider({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const notifyExpenseSaved = () => setRefreshCount(c => c + 1);

  return (
    <RightSlotContext.Provider value={{ isDrawerOpen, openDrawer, closeDrawer, refreshCount, notifyExpenseSaved }}>
      {children}
    </RightSlotContext.Provider>
  );
}

export function useRightSlot(): RightSlotContextValue {
  const ctx = useContext(RightSlotContext);
  if (!ctx) throw new Error('useRightSlot must be used inside RightSlotProvider');
  return ctx;
}
