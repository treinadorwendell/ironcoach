'use client';

import React, { useState, useEffect } from 'react';
import {
  Cloud,
  RefreshCw,
  LogIn,
  LogOut,
  ShieldCheck,
  AlertCircle,
  User as UserIcon,
} from 'lucide-react';
import { auth, logoutUser, cloudSync } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { AuthScreen } from './AuthScreen';

interface CloudSyncBadgeProps {
  onManualSyncTrigger?: () => void;
}

export const CloudSyncBadge: React.FC<CloudSyncBadgeProps> = ({ onManualSyncTrigger }) => {
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'unauthenticated'>(
    'unauthenticated'
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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

  const handleOpenAuth = () => {
    setIsAuthModalOpen(true);
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
    <>
      <div className="relative">
        {user ? (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 text-xs font-semibold transition active:scale-95 shadow-sm"
            title="Conta conectada • Sincronização em nuvem ativa"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline font-bold">
              {user.displayName ? user.displayName.split(' ')[0] : 'Conectado'}
            </span>
            <span className="sm:hidden">Nuvem</span>
          </button>
        ) : (
          <button
            onClick={handleOpenAuth}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/80 to-teal-950/80 hover:from-emerald-900/90 hover:to-teal-900/90 text-emerald-200 text-xs font-extrabold transition active:scale-95 shadow-md shadow-emerald-950/40"
            title="Entrar ou Cadastrar com E-mail e Senha para sincronizar dados no Firebase"
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Entrar / Cadastrar</span>
            <span className="sm:hidden">Entrar</span>
          </button>
        )}

        {/* Cloud Sync Modal / Dropdown */}
        {isOpen && user && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-slate-900 border border-slate-700/80 p-4 shadow-2xl z-50 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm ring-1 ring-emerald-500/40">
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
                  Firebase Ativo
                </span>
              </div>

              <div className="py-3 space-y-2 text-xs">
                <div className="flex items-start gap-2 text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <strong>Autenticação Nativa Conectada:</strong> Seus dados de treinos, alunos e histórico estão protegidos por regras seguras no Firestore e sincronizados em tempo real entre seus dispositivos.
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
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isBusy ? 'animate-spin' : ''}`} />
                  <span>Sincronizar dados deste tablet</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isBusy}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-semibold transition active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sair da Conta (Logout)</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tela de Login e Cadastro Modal */}
      <AuthScreen
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          if (onManualSyncTrigger) onManualSyncTrigger();
        }}
      />
    </>
  );
};
