'use client';

import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/usePWAInstall';
import { useMounted } from '@/hooks/useMounted';
import { storage } from '@/lib/storage';
import { cloudSync } from '@/lib/firebase';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isMounted = useMounted();
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateQueueCount = () => {
      setPendingCount(storage.getPendingOperations().length);
    };
    updateQueueCount();
    window.addEventListener('ironcoach:sync-queue-updated', updateQueueCount);
    window.addEventListener('ironcoach:data-synced', updateQueueCount);
    return () => {
      window.removeEventListener('ironcoach:sync-queue-updated', updateQueueCount);
      window.removeEventListener('ironcoach:data-synced', updateQueueCount);
    };
  }, []);

  if (!isMounted || isOnline) {
    if (pendingCount > 0) {
      return (
        <button
          type="button"
          onClick={() => cloudSync.processPendingQueue()}
          title="Sincronizando fila de operações pendentes com o Firestore"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-[11px] text-cyan-300 font-semibold select-none cursor-pointer"
        >
          <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
          <span className="hidden sm:inline">Sincronizando ({pendingCount})</span>
        </button>
      );
    }

    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 font-medium select-none">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <Wifi className="w-3 h-3 text-emerald-400" />
        <span className="hidden sm:inline">Data Persist Ativo</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-[11px] text-amber-300 font-semibold select-none animate-pulse">
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>
        Modo Offline{pendingCount > 0 ? ` • ${pendingCount} na fila` : ''}
      </span>
    </div>
  );
};

