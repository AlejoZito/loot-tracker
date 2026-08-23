import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getPendingExpenses, flushQueue } from '../services/offlineQueue';
import { api } from '../services/api';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(getPendingExpenses().length);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Poll pending count (catches additions from other tabs or the form)
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingCount(getPendingExpenses().length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const doFlush = useCallback(async () => {
    const pending = getPendingExpenses();
    if (pending.length === 0) return;

    setSyncing(true);
    const { synced, failed } = await flushQueue(api.createExpense.bind(api));
    setPendingCount(getPendingExpenses().length);
    setSyncing(false);

    if (synced > 0 && failed === 0) {
      setSyncResult('Sincronizado');
      setTimeout(() => setSyncResult(null), 2500);
    } else if (synced > 0) {
      setSyncResult(`${synced} sincronizados, ${failed} pendientes`);
      setTimeout(() => setSyncResult(null), 3000);
    }
  }, []);

  // Auto-flush when coming back online
  useEffect(() => {
    if (isOnline) {
      doFlush();
    }
  }, [isOnline, doFlush]);

  // Nothing to show
  if (isOnline && pendingCount === 0 && !syncResult && !syncing) {
    return null;
  }

  return (
    <div className="offline-banner">
      {!isOnline && (
        <span>Sin conexión — los gastos se guardarán localmente</span>
      )}
      {isOnline && syncing && (
        <span>Sincronizando...</span>
      )}
      {isOnline && syncResult && !syncing && (
        <span>{syncResult}</span>
      )}
      {isOnline && !syncing && !syncResult && pendingCount > 0 && (
        <span>{pendingCount} gasto{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''}</span>
      )}
    </div>
  );
}
