'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, CloudCheck, RefreshCw, LogIn, LogOut, ShieldCheck, AlertCircle } from 'lucide-react';
import { auth, loginWithGoogle, logoutUser, cloudSync } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface CloudSyncBadgeProps {
  onManualSyncTrigger?: () => void;
}

export const CloudSyncBadge: React.FC<CloudSyncBadgeProps> = ({ onManualSyncTrigger }) => {
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'unauthenticated'>(
    'unauthenticated'
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setSyncStatus('unauthenticated');
      } else {
        setSyncStatus('syncing');
      }
    });

    return () => unsub();
  }, []);

  const handleLogin = async () => {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
      setIsOpen(false);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(
        err instanceof Error ? err.message : 'Falha ao autenticar com o Google.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleLogout = async () => {
    setIsBusy(true);
    try {
      cloudSync.unsubscribe();
      await logoutUser();
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBusy(false);
    }
  };

  const handleForceSeed = async () => {
    if (!user) return;
    setIsBusy(true);
    try {
      await cloudSync.seedLocalToCloud(user.uid);
      if (onManualSyncTrigger) onManualSyncTrigger();
      setSyncStatus('synced');
    } catch (err) {
      console.error(err);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="relative">
      {user ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-xs font-semibold transition active:scale-95 shadow-sm"
          title="Status da sincronização em nuvem entre tablets"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Cloud className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Nuvem Sincronizada</span>
          <span className="sm:hidden">Nuvem</span>
        </button>
      ) : (
        <button
          onClick={handleLogin}
          disabled={isBusy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900/90 hover:to-blue-900/90 text-cyan-200 text-xs font-bold transition active:scale-95 shadow-md shadow-cyan-950/30"
          title="Entrar com Google para sincronizar automaticamente entre diferentes tablets"
        >
          {isBusy ? (
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          ) : (
            <Cloud className="w-3.5 h-3.5 text-cyan-400" />
          )}
          <span className="hidden sm:inline">Sincronizar Tablets</span>
          <span className="sm:hidden">Sincronizar</span>
        </button>
      )}

      {/* Cloud Sync Modal / Dropdown */}
      {isOpen && user && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-slate-900 border border-slate-700/80 p-4 shadow-2xl z-50 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="font-bold text-xs text-white truncate max-w-[170px]">
                    {user.displayName || user.email}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
                    {user.email}
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Ativo
              </span>
            </div>

            <div className="py-3 space-y-2 text-xs">
              <div className="flex items-start gap-2 text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Firestore Conectado:</strong> Os alunos, treinos prescritos, histórico de cargas e configurações são sincronizados em tempo real entre todos os seus tablets conectados com esta conta.
                </div>
              </div>

              {errorMessage && (
                <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleForceSeed}
                disabled={isBusy}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isBusy ? 'animate-spin' : ''}`} />
                <span>Re-sincronizar dados deste tablet</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isBusy}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-semibold transition"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Desconectar Conta</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
