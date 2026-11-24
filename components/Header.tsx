'use client';

import React from 'react';
import {
  Dumbbell,
  ShieldCheck,
  GraduationCap,
  Settings,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import { CloudSyncBadge } from './CloudSyncBadge';
import { User } from 'firebase/auth';
import { TrainerProfile, AppUserRole, Client } from '@/types';

interface HeaderProps {
  activeClientName?: string;
  currentUser?: User | null;
  trainerProfile?: TrainerProfile | null;
  onLogout?: () => void;
  onOpenTrainerProfile?: () => void;
  onOpenStudentSettings?: () => void;
  appRole?: AppUserRole;
  onChangeRole?: (role: AppUserRole) => void;
  isStudentAccountLocked?: boolean;
  clients?: Client[];
  activeStudentId?: string;
  onSelectStudentId?: (studentId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeClientName,
  currentUser,
  trainerProfile,
  onOpenTrainerProfile,
  onOpenStudentSettings,
  appRole = 'trainer',
  onChangeRole,
  isStudentAccountLocked = false,
  clients = [],
  activeStudentId,
}) => {
  const trainerDisplayName =
    trainerProfile?.name?.trim() ||
    currentUser?.displayName ||
    currentUser?.email ||
    '';

  const currentStudent =
    clients.find((c) => c.id === activeStudentId) || clients[0] || null;

  const isTrainer = !isStudentAccountLocked && appRole === 'trainer';
  const handleLogoClick = isTrainer ? onOpenTrainerProfile : onOpenStudentSettings;

  return (
    <header className="Header sticky top-0 z-30 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 pt-[max(var(--sat),env(safe-area-inset-top,0px))] transition-all">
      {/* Barra principal do cabeçalho posicionada abaixo da área segura do iOS (Notch / Dynamic Island) */}
      <nav
        aria-label="Cabeçalho principal"
        className="w-full flex items-center justify-between gap-2 sm:gap-3 pl-[max(0.75rem,var(--sal))] pr-[max(0.75rem,var(--sar))] sm:pl-[max(1.25rem,var(--sal))] sm:pr-[max(1.25rem,var(--sar))] lg:pl-[max(1.5rem,var(--sal))] lg:pr-[max(1.5rem,var(--sar))] py-2.5 sm:py-3"
      >
        {/* Brand & Profile / Settings trigger */}
        <button
          type="button"
          onClick={handleLogoClick}
          className={`flex items-center gap-2 sm:gap-3 min-w-0 min-h-[44px] py-0.5 rounded-2xl text-left ${
            handleLogoClick ? 'cursor-pointer group select-none' : ''
          }`}
          title={
            isTrainer
              ? 'Abrir perfil do treinador'
              : 'Configurações do Aluno (Editar dados, senha e sair)'
          }
        >
          <div className="relative flex-shrink-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg transition ${
                isTrainer
                  ? 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 shadow-emerald-950/50 group-hover:scale-105'
                  : 'bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-500 shadow-cyan-950/50 group-hover:scale-105'
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
            {!isTrainer && (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-slate-900 border border-cyan-500/60 text-cyan-400 flex items-center justify-center shadow-md group-hover:bg-cyan-500 group-hover:text-slate-950 transition">
                <Settings className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base lg:text-lg tracking-tight text-white leading-tight whitespace-nowrap group-hover:text-cyan-300 transition">
                IronCoach
              </span>
              {!isTrainer && (
                <span className="text-[10px] font-bold text-cyan-400 hidden sm:inline whitespace-nowrap">
                  · {isStudentAccountLocked ? 'Portal do Aluno' : 'Pré-visualização Aluno'}
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate max-w-[130px] min-[390px]:max-w-[155px] min-[414px]:max-w-[180px] sm:max-w-xs">
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
                <span className="truncate inline-block text-emerald-400 font-semibold">
                  {trainerDisplayName}
                </span>
              ) : (
                'Gestão & Prescrição'
              )}
            </p>
          </div>
        </button>

        {/* Center/Right: Trainer Preview Switcher (hidden for locked Student login) + Cloud Sync/Offline/PWA */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {!isStudentAccountLocked && onChangeRole && (
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-900/95 border border-slate-800 p-1 rounded-xl shadow-inner">
              <button
                type="button"
                onClick={() => onChangeRole('trainer')}
                title="Painel Exclusivo do Treinador (Gestão Completa)"
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 min-h-[34px] rounded-lg text-[10px] sm:text-xs font-bold transition whitespace-nowrap cursor-pointer touch-manipulation ${
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
                title="Pré-visualizar Visão do Aluno (Treino, Dieta e Progresso)"
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 min-h-[34px] rounded-lg text-[10px] sm:text-xs font-bold transition whitespace-nowrap cursor-pointer touch-manipulation ${
                  !isTrainer
                    ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-950/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden min-[420px]:inline">Ver como Aluno</span>
                <span className="inline min-[420px]:hidden">Aluno</span>
              </button>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2">
            <CloudSyncBadge />
            <OfflineIndicator />
          </div>

          <PWAInstallButton />
        </div>
      </nav>
    </header>
  );
};
