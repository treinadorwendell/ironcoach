'use client';

import React from 'react';
import { MainNavSection, AppUserRole, StudentNavSection } from '@/types';
import {
  Users,
  CalendarDays,
  PlusCircle,
  Flame,
  Dumbbell,
  Utensils,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'motion/react';

interface BottomNavProps {
  currentSection: MainNavSection;
  onSelectSection: (section: MainNavSection) => void;
  hasActiveSession?: boolean;
  appRole?: AppUserRole;
  studentSection?: StudentNavSection;
  onSelectStudentSection?: (section: StudentNavSection) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentSection,
  onSelectSection,
  hasActiveSession = false,
  appRole = 'trainer',
  studentSection = 'meu-treino',
  onSelectStudentSection,
}) => {
  const trainerNavItems: {
    id: MainNavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    badge?: string;
  }[] = [
    {
      id: 'cliente',
      label: 'Cliente',
      icon: Users,
      accentColor: 'text-blue-400',
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: CalendarDays,
      accentColor: 'text-purple-400',
    },
    {
      id: 'criar-treino',
      label: 'Criar Treino',
      icon: PlusCircle,
      accentColor: 'text-amber-400',
    },
    {
      id: 'execucao',
      label: 'Execução do Treino',
      icon: Flame,
      accentColor: 'text-emerald-400',
      badge: hasActiveSession ? 'EM ANDAMENTO' : undefined,
    },
  ];

  const studentNavItems: {
    id: StudentNavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    badge?: string;
  }[] = [
    {
      id: 'meu-treino',
      label: 'Meu Treino',
      icon: Dumbbell,
      accentColor: 'text-emerald-400',
      badge: hasActiveSession ? 'AO VIVO' : undefined,
    },
    {
      id: 'minha-dieta',
      label: 'Minha Dieta',
      icon: Utensils,
      accentColor: 'text-cyan-400',
    },
    {
      id: 'meu-progresso',
      label: 'Meu Progresso',
      icon: TrendingUp,
      accentColor: 'text-amber-400',
    },
  ];

  const isStudent = appRole === 'student';
  const items = isStudent ? studentNavItems : trainerNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 shadow-[0_-8px_30px_rgba(0,0,0,0.7)] px-2 sm:px-6 lg:px-10 py-1 sm:py-1.5 w-full">
      <div
        className={`max-w-6xl mx-auto grid ${
          isStudent ? 'grid-cols-3' : 'grid-cols-4'
        } gap-1 sm:gap-2 lg:gap-3`}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isStudent
            ? studentSection === item.id
            : currentSection === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => {
                if (isStudent) {
                  onSelectStudentSection?.(item.id as StudentNavSection);
                } else {
                  onSelectSection(item.id as MainNavSection);
                }
              }}
              whileTap={{ scale: 0.94 }}
              className={`relative flex flex-col sm:flex-row lg:gap-2.5 items-center justify-center py-1.5 sm:py-2.5 px-1.5 sm:px-3 min-h-[54px] sm:min-h-[60px] lg:min-h-[62px] rounded-xl sm:rounded-2xl transition-colors touch-manipulation cursor-pointer ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Sliding active background for smooth fluid feeling */}
              {isActive && (
                <motion.div
                  layoutId="activeBottomNavBg"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute inset-0 bg-slate-800/90 rounded-xl sm:rounded-2xl shadow-inner shadow-slate-700/40 border border-slate-700/60"
                />
              )}

              {/* Sliding active indicator bar */}
              {isActive && (
                <motion.span
                  layoutId="activeBottomNavIndicator"
                  transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                  className={`absolute top-1 sm:top-1.5 w-7 sm:w-10 h-1 rounded-full z-10 ${
                    isStudent
                      ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]'
                      : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]'
                  }`}
                />
              )}

              {/* Badge for active workout */}
              {item.badge && (
                <span className="absolute -top-1.5 right-1 sm:right-2 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[8px] sm:text-[9px] font-black text-slate-950 tracking-wider animate-pulse shadow-md z-10 whitespace-nowrap">
                  AO VIVO
                </span>
              )}

              <div className="relative z-10 shrink-0">
                <motion.div
                  animate={{ scale: isActive ? 1.12 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <Icon
                    className={`w-5 h-5 sm:w-5.5 sm:h-5.5 lg:w-6 lg:h-6 transition-colors ${
                      isActive ? item.accentColor : 'text-slate-400'
                    }`}
                  />
                </motion.div>
              </div>

              <span
                className={`relative z-10 mt-1 sm:mt-0 sm:ml-2 lg:ml-0 text-[10px] sm:text-xs lg:text-sm font-semibold tracking-tight text-center leading-tight whitespace-nowrap truncate max-w-full transition-colors ${
                  isActive ? 'text-white font-bold' : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
