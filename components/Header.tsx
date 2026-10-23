'use client';

import React from 'react';
import { Dumbbell, LogOut, User as UserIcon } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import { CloudSyncBadge } from './CloudSyncBadge';
import { User } from 'firebase/auth';
import { TrainerProfile } from '@/types';

interface HeaderProps {
  isTabletFramed: boolean;
  onToggleTabletFrame: () => void;
  activeClientName?: string;
  currentUser?: User | null;
  trainerProfile?: TrainerProfile | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isTabletFramed,
  onToggleTabletFrame,
  activeClientName,
  currentUser,
  trainerProfile,
  onLogout,
}) => {
  const trainerDisplayName =
    trainerProfile?.name?.trim() ||
    currentUser?.displayName ||
    currentUser?.email ||
    '';

  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-2 sm:px-4 py-2.5 sm:py-3 w-full">
      <div className="w-full flex items-center justify-between gap-2 px-1 sm:px-2">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-950/50 flex-shrink-0">
            {trainerProfile?.logoDataUrl ? (
              <img
                src={trainerProfile.logoDataUrl}
                alt="Logo IronCoach"
                className="w-full h-full object-cover"
              />
            ) : (
              <Dumbbell className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white leading-tight">
                IronCoach
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {activeClientName ? (
                <span>
                  {trainerDisplayName ? (
                    <>
                      <strong className="text-slate-200 font-semibold">{trainerDisplayName}</strong>
                      {' • '}
                    </>
                  ) : null}
                  Aluno: <strong className="text-emerald-400 font-semibold">{activeClientName}</strong>
                </span>
              ) : trainerDisplayName ? (
                <span className="truncate max-w-[200px] sm:max-w-xs inline-block text-emerald-400 font-semibold">
                  {trainerDisplayName}
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
