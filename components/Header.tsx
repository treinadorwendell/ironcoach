'use client';

import React from 'react';
import { Dumbbell, LogOut, User as UserIcon } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import { CloudSyncBadge } from './CloudSyncBadge';
import { User } from 'firebase/auth';

interface HeaderProps {
  isTabletFramed: boolean;
  onToggleTabletFrame: () => void;
  activeClientName?: string;
  currentUser?: User | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isTabletFramed,
  onToggleTabletFrame,
  activeClientName,
  currentUser,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-950/50 flex-shrink-0">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">
                IronCoach
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {activeClientName ? (
                <span>
                  Aluno: <strong className="text-emerald-400 font-semibold">{activeClientName}</strong>
                </span>
              ) : currentUser?.email ? (
                <span className="truncate max-w-[180px] sm:max-w-xs inline-block text-slate-300">
                  Treinador: {currentUser.displayName || currentUser.email}
                </span>
              ) : (
                'Tablet Vertical • Musculação'
              )}
            </p>
          </div>
        </div>

        {/* Right tools: Cloud Sync, Offline badge, PWA install, Logout */}
        <div className="flex items-center gap-2">
          <CloudSyncBadge />
          <OfflineIndicator />

          <PWAInstallButton />

          {currentUser && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/70 text-slate-300 hover:text-rose-300 border border-slate-700 transition active:scale-95"
              title="Sair da conta / Trocar de Treinador"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
