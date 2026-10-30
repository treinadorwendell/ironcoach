'use client';

import React from 'react';
import { Dumbbell, User as UserIcon, ShieldCheck, GraduationCap, ChevronDown } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import { CloudSyncBadge } from './CloudSyncBadge';
import { User } from 'firebase/auth';
import { TrainerProfile, AppUserRole, Client } from '@/types';

interface HeaderProps {
  isTabletFramed: boolean;
  onToggleTabletFrame: () => void;
  activeClientName?: string;
  currentUser?: User | null;
  trainerProfile?: TrainerProfile | null;
  onLogout?: () => void;
  onOpenTrainerProfile?: () => void;
  appRole?: AppUserRole;
  onChangeRole?: (role: AppUserRole) => void;
  clients?: Client[];
  activeStudentId?: string;
  onSelectStudentId?: (studentId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeClientName,
  currentUser,
  trainerProfile,
  onOpenTrainerProfile,
  appRole = 'trainer',
  onChangeRole,
  clients = [],
  activeStudentId,
  onSelectStudentId,
}) => {
  const trainerDisplayName =
    trainerProfile?.name?.trim() ||
    currentUser?.displayName ||
    currentUser?.email ||
    '';

  const currentStudent =
    clients.find((c) => c.id === activeStudentId) || clients[0] || null;

  const isTrainer = appRole === 'trainer';

  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-2.5 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3 w-full">
      <div className="w-full flex items-center justify-between gap-2 sm:gap-3 px-0.5 sm:px-2">
        {/* Brand & Trainer profile trigger */}
        <div
          onClick={isTrainer ? onOpenTrainerProfile : undefined}
          className={`flex items-center gap-2 sm:gap-3 min-w-0 py-0.5 rounded-2xl ${
            isTrainer && onOpenTrainerProfile ? 'cursor-pointer group select-none' : ''
          }`}
          title={
            isTrainer && onOpenTrainerProfile
              ? 'Abrir perfil do treinador'
              : undefined
          }
        >
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg flex-shrink-0 transition ${
              isTrainer
                ? 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 shadow-emerald-950/50 group-hover:scale-105'
                : 'bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-500 shadow-cyan-950/50'
            }`}
          >
            {trainerProfile?.logoDataUrl ? (
              <img
                src={trainerProfile.logoDataUrl}
                alt="Logo IronCoach"
                className="w-full h-full object-cover"
              />
            ) : (
              <Dumbbell className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base lg:text-lg tracking-tight text-white leading-tight whitespace-nowrap">
                IronCoach
              </span>
              {!isTrainer && (
                <span className="text-[10px] font-bold text-cyan-400 hidden xs:inline whitespace-nowrap">
                  · Aluno
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate">
              {!isTrainer ? (
                <span>
                  {currentStudent ? (
                    <>
                      Aluno: <strong className="text-cyan-400 font-semibold">{currentStudent.name}</strong>
                    </>
                  ) : (
                    <span className="text-amber-400 font-semibold">Visão do Aluno</span>
                  )}
                </span>
              ) : activeClientName ? (
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
                <span className="truncate max-w-[140px] sm:max-w-xs inline-block text-emerald-400 font-semibold">
                  {trainerDisplayName}
                </span>
              ) : (
                'Gestão & Prescrição'
              )}
            </p>
          </div>
        </div>

        {/* Center/Right: Dev Role Switcher + Student Selector + Cloud Sync/Offline/PWA */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {onChangeRole && (
            <div className="flex items-center gap-1 bg-slate-900/95 border border-slate-800 p-1 rounded-xl shadow-inner">
              <button
                type="button"
                onClick={() => onChangeRole('trainer')}
                title="Alternar para Perfil do Treinador (Gestão Completa)"
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isTrainer
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Treinador</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeRole('student')}
                title="Alternar para Perfil do Aluno (Treino, Dieta e Progresso)"
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  !isTrainer
                    ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-950/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                <span>Aluno</span>
              </button>

              {/* Seletor rápido de qual aluno simular quando no modo Aluno */}
              {!isTrainer && clients.length > 0 && onSelectStudentId && (
                <div className="relative flex items-center pl-1 border-l border-slate-800">
                  <UserIcon className="w-3 h-3 text-cyan-400 ml-1 hidden sm:inline shrink-0 pointer-events-none" />
                  <select
                    aria-label="Selecionar aluno ativo"
                    value={currentStudent?.id || ''}
                    onChange={(e) => onSelectStudentId(e.target.value)}
                    className="appearance-none bg-slate-950 text-cyan-300 hover:text-white text-[10px] sm:text-xs font-bold pl-1.5 pr-5 py-1 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 max-w-[96px] sm:max-w-[150px] truncate cursor-pointer"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 pointer-events-none" />
                </div>
              )}
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2">
            <CloudSyncBadge />
            <OfflineIndicator />
          </div>

          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
