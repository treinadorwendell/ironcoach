'use client';

import React from 'react';
import { MainNavSection } from '@/types';
import { Users, CalendarDays, PlusCircle, Flame } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomNavProps {
  currentSection: MainNavSection;
  onSelectSection: (section: MainNavSection) => void;
  hasActiveSession?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentSection,
  onSelectSection,
  hasActiveSession = false,
}) => {
  const navItems: {
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 shadow-[0_-8px_30px_rgba(0,0,0,0.7)] px-2 py-1.5 max-w-4xl mx-auto">
      <div className="grid grid-cols-4 gap-1 sm:gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              whileTap={{ scale: 0.94 }}
              className={`relative flex flex-col items-center justify-center py-2 px-1 min-h-[60px] rounded-2xl transition-colors touch-manipulation ${
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
                  className="absolute inset-0 bg-slate-800/90 rounded-2xl shadow-inner shadow-slate-700/40 border border-slate-700/60"
                />
              )}

              {/* Sliding active indicator bar */}
              {isActive && (
                <motion.span
                  layoutId="activeBottomNavIndicator"
                  transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                  className="absolute top-1.5 w-8 h-1 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] z-10"
                />
              )}

              {/* Badge for active workout */}
              {item.badge && (
                <span className="absolute -top-1.5 right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[9px] font-black text-slate-950 tracking-wider animate-pulse shadow-md z-10">
                  AO VIVO
                </span>
              )}

              <div className="relative z-10">
                <motion.div
                  animate={{ scale: isActive ? 1.15 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <Icon
                    className={`w-6 h-6 transition-colors ${
                      isActive ? item.accentColor : 'text-slate-400'
                    }`}
                  />
                </motion.div>
              </div>

              <span
                className={`relative z-10 mt-1 text-[11px] sm:text-xs font-semibold tracking-tight text-center leading-tight transition-colors ${
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
