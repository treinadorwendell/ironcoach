'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cloudSync, auth } from '@/lib/firebase';

interface UseInactivitySyncOptions {
  /**
   * Tempo mínimo de inatividade / em segundo plano (em milissegundos) para disparar a sincronização ao retornar.
   * Padrão: 15.000 ms (15 segundos).
   */
  inactivityThresholdMs?: number;
  /**
   * Se verdadeiro, exibe feedback visual temporário (notificação toast) ao sincronizar.
   * Padrão: true.
   */
  showToast?: boolean;
}

export function useInactivitySync({
  inactivityThresholdMs = 15000,
  showToast = true,
}: UseInactivitySyncOptions = {}) {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const hiddenAtRef = useRef<number | null>(null);
  const lastActiveRef = useRef<number>(0);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerToast = useCallback((message: string, duration = 3000) => {
    if (!showToast) return;
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setSyncNotice(message);
    toastTimeoutRef.current = setTimeout(() => {
      setSyncNotice(null);
    }, duration);
  }, [showToast]);

  const forceSyncNow = useCallback(async (reason = 'manual') => {
    const user = auth.currentUser;
    if (!user) return;

    setIsSyncing(true);
    if (reason === 'return') {
      triggerToast('Sincronizando treinos e PSE com o Firestore...', 2500);
    }

    try {
      const res = await cloudSync.forceSync(user.uid);
      if (res.success) {
        setLastSyncTime(new Date());
        if (reason === 'return') {
          triggerToast('Histórico e PSE sincronizados com sucesso!', 3500);
        }
      }
    } catch (e) {
      console.warn('Erro ao sincronizar após inatividade:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [triggerToast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    lastActiveRef.current = Date.now();

    // Registra atividade recente do usuário
    const handleUserActivity = () => {
      lastActiveRef.current = Date.now();
    };

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Detecta mudança de visibilidade (mudança de aba, tela bloqueada, app minimizado)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        const now = Date.now();
        const awayMs = hiddenAtRef.current ? now - hiddenAtRef.current : 0;
        const inactiveMs = now - lastActiveRef.current;

        hiddenAtRef.current = null;
        lastActiveRef.current = now;

        // Se ficou em segundo plano ou inativo pelo tempo limite, força a sincronização
        if (awayMs >= inactivityThresholdMs || inactiveMs >= inactivityThresholdMs) {
          forceSyncNow('return');
        }
      }
    };

    // Detecta foco na janela
    const handleWindowFocus = () => {
      const now = Date.now();
      const awayMs = hiddenAtRef.current ? now - hiddenAtRef.current : 0;
      if (awayMs >= inactivityThresholdMs) {
        hiddenAtRef.current = null;
        lastActiveRef.current = now;
        forceSyncNow('return');
      }
    };

    // Detecta retorno da conexão de rede
    const handleOnline = () => {
      forceSyncNow('online');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', handleOnline);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [inactivityThresholdMs, forceSyncNow]);

  return {
    isSyncing,
    lastSyncTime,
    syncNotice,
    forceSyncNow,
  };
}
