'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Flame, Gauge, RotateCcw } from 'lucide-react';

export interface PseLevelInfo {
  value: number;
  label: string;
  category: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  ringClass: string;
  hexColor: string;
  description: string;
  rirNote: string;
}

export const PSE_SCALE: PseLevelInfo[] = [
  {
    value: 0,
    label: 'Repouso',
    category: 'Neutro',
    bgClass: 'bg-slate-800/90',
    textClass: 'text-slate-300',
    borderClass: 'border-slate-700',
    ringClass: 'ring-slate-400',
    hexColor: '#94a3b8',
    description: 'Sem esforço físico perceptível. Descanso total.',
    rirNote: 'Sem esforço',
  },
  {
    value: 1,
    label: 'Extremamente Leve',
    category: 'Muito Leve',
    bgClass: 'bg-emerald-950/70',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-600/40',
    ringClass: 'ring-emerald-500',
    hexColor: '#34d399',
    description: 'Esforço quase nulo, respiração totalmente relaxada.',
    rirNote: 'Aquecimento inicial',
  },
  {
    value: 2,
    label: 'Muito Leve',
    category: 'Muito Leve',
    bgClass: 'bg-emerald-900/60',
    textClass: 'text-emerald-300',
    borderClass: 'border-emerald-500/50',
    ringClass: 'ring-emerald-400',
    hexColor: '#10b981',
    description: 'Sensação confortável de aquecimento sem fadiga.',
    rirNote: 'Ativação muscular',
  },
  {
    value: 3,
    label: 'Leve',
    category: 'Leve',
    bgClass: 'bg-teal-950/70',
    textClass: 'text-teal-300',
    borderClass: 'border-teal-500/50',
    ringClass: 'ring-teal-400',
    hexColor: '#14b8a6',
    description: 'Início da percepção de carga com ritmo estável e fácil.',
    rirNote: 'Fácil',
  },
  {
    value: 4,
    label: 'Moderado',
    category: 'Moderado',
    bgClass: 'bg-cyan-950/70',
    textClass: 'text-cyan-300',
    borderClass: 'border-cyan-500/50',
    ringClass: 'ring-cyan-400',
    hexColor: '#06b6d4',
    description: 'Esforço perceptível, ritmo cadenciado e respiração controlada.',
    rirNote: 'Ritmo confortável',
  },
  {
    value: 5,
    label: 'Mais Pesado',
    category: 'Pesado',
    bgClass: 'bg-yellow-950/70',
    textClass: 'text-yellow-300',
    borderClass: 'border-yellow-500/50',
    ringClass: 'ring-yellow-400',
    hexColor: '#eab308',
    description: 'Começa a exigir foco deliberado. Respiração acelerada.',
    rirNote: 'Trabalho real',
  },
  {
    value: 6,
    label: 'Pesado',
    category: 'Pesado',
    bgClass: 'bg-amber-950/70',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-500/60',
    ringClass: 'ring-amber-400',
    hexColor: '#f59e0b',
    description: 'Esforço vigoroso e firme. Exige concentração para manter técnica.',
    rirNote: 'Intensidade firme',
  },
  {
    value: 7,
    label: 'Muito Pesado',
    category: 'Muito Pesado',
    bgClass: 'bg-orange-950/70',
    textClass: 'text-orange-300',
    borderClass: 'border-orange-500/60',
    ringClass: 'ring-orange-400',
    hexColor: '#f97316',
    description: 'A velocidade da carga diminui visivelmente. Faltam ~3 reps para falha.',
    rirNote: 'RIR ~3 (3 de reserva)',
  },
  {
    value: 8,
    label: 'Muito Difícil',
    category: 'Muito Pesado',
    bgClass: 'bg-orange-900/80',
    textClass: 'text-orange-200',
    borderClass: 'border-orange-400/70',
    ringClass: 'ring-orange-400',
    hexColor: '#fb923c',
    description: 'Esforço muito intenso. Sobrariam apenas 2 repetições com boa forma.',
    rirNote: 'RIR ~2 (2 de reserva)',
  },
  {
    value: 9,
    label: 'Quase Máximo',
    category: 'Extremo',
    bgClass: 'bg-rose-950/80',
    textClass: 'text-rose-300',
    borderClass: 'border-rose-500/70',
    ringClass: 'ring-rose-400',
    hexColor: '#f43f5e',
    description: 'Limite técnico. Esforço extremo, sobraria apenas 1 repetição se muito.',
    rirNote: 'RIR ~1 (1 de reserva)',
  },
  {
    value: 10,
    label: 'Máximo Absoluto',
    category: 'Falha Total',
    bgClass: 'bg-purple-950/90',
    textClass: 'text-purple-200',
    borderClass: 'border-purple-500/80',
    ringClass: 'ring-purple-400',
    hexColor: '#a855f7',
    description: 'Falha muscular momentânea. Não conseguiria completar nem mais 1 rep.',
    rirNote: 'RIR 0 (Falha concêntrica)',
  },
];

export function getPseInfo(value: number | null | undefined): PseLevelInfo | null {
  if (value == null || isNaN(value)) return null;
  const rounded = Math.round(value);
  const clamped = Math.max(0, Math.min(10, rounded));
  return PSE_SCALE[clamped] || null;
}

interface PsePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: number | null;
  exerciseName?: string;
  setNumber?: number;
  onSelect: (value: number | null) => void;
}

export function PsePickerModal({
  isOpen,
  onClose,
  initialValue,
  exerciseName,
  setNumber,
  onSelect,
}: PsePickerModalProps) {
  const [prevInitialValue, setPrevInitialValue] = useState(initialValue);
  const [selected, setSelected] = useState<number | null>(
    typeof initialValue === 'number' ? initialValue : null
  );

  if (prevInitialValue !== initialValue) {
    setPrevInitialValue(initialValue);
    setSelected(typeof initialValue === 'number' ? initialValue : null);
  }

  if (!isOpen) return null;

  const currentLevel = getPseInfo(selected);

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {
        // Ignorar caso o dispositivo bloqueie vibração
      }
    }
  };

  // Clique rápido: registra imediatamente (substituindo o PSE anterior se houver) e fecha o modal
  const handleSelectNumber = (val: number) => {
    triggerHaptic();
    setSelected(val);
    onSelect(val);
    onClose();
  };

  const handleClear = () => {
    triggerHaptic();
    setSelected(null);
    onSelect(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white tracking-wide flex items-center gap-1.5">
                  Escala de PSE (0 a 10)
                </h3>
                <p className="text-xs text-slate-400">
                  {exerciseName ? (
                    <span>
                      <strong className="text-slate-200">{exerciseName}</strong>
                      {setNumber ? ` • Série ${setNumber}` : ''}
                    </span>
                  ) : (
                    'Percepção Subjetiva de Esforço'
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Destaque Atual Selecionado */}
          <div className="px-5 py-3 bg-slate-950/30 border-b border-slate-800/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl font-mono tabular-nums border shadow-md transition-all ${
                  currentLevel
                    ? `${currentLevel.bgClass} ${currentLevel.textClass} ${currentLevel.borderClass}`
                    : 'bg-slate-800/70 text-slate-500 border-slate-700'
                }`}
              >
                {selected != null ? selected : '—'}
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {currentLevel ? 'PSE Atual (Toque em outro para substituir)' : 'Nível Selecionado'}
                </span>
                <span className={`text-sm font-black ${currentLevel ? currentLevel.textClass : 'text-slate-400'}`}>
                  {currentLevel ? `${currentLevel.label} (${currentLevel.rirNote})` : 'Nenhum PSE definido'}
                </span>
              </div>
            </div>

            {selected != null && (
              <button
                type="button"
                onClick={handleClear}
                className="h-9 sm:h-10 text-xs sm:text-sm font-semibold text-slate-400 hover:text-rose-400 flex items-center gap-1.5 px-3 sm:px-3.5 rounded-xl hover:bg-rose-950/30 transition active:scale-95 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Limpar</span>
              </button>
            )}
          </div>

          {/* Barra de Seleção Rápida de Números (Touch Horizontal - 1 Clique Registra e Fecha) */}
          <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800/60 shrink-0">
            <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center justify-between">
              <span>Clique Rápido (0 a 10):</span>
              <span className="text-[10px] text-amber-400 font-semibold">Toque para registrar e fechar</span>
            </div>
            <div className="grid grid-cols-11 gap-1 sm:gap-1.5">
              {PSE_SCALE.map((level) => {
                const isCurrent = selected === level.value;
                return (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => handleSelectNumber(level.value)}
                    className={`h-10 sm:h-11 lg:h-12 rounded-xl font-mono tabular-nums font-black text-xs sm:text-sm lg:text-base transition-all duration-150 flex items-center justify-center border active:scale-95 touch-manipulation cursor-pointer ${
                      isCurrent
                        ? `${level.bgClass} ${level.textClass} ${level.borderClass} ring-2 ${level.ringClass} scale-105 shadow-md`
                        : `${level.bgClass} text-slate-300 border-transparent hover:border-slate-700`
                    }`}
                    title={`${level.value} - ${level.label} (Clique para registrar)`}
                  >
                    {level.value}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista com Explicação Detalhada de Cada Cor e Nível (1 Clique Registra e Fecha) */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Guia de Intensidades e Cores
              </span>
              <span className="text-[10px] font-semibold text-slate-500 normal-case">
                Toque na faixa para registrar
              </span>
            </div>

            {PSE_SCALE.map((level) => {
              const isCurrent = selected === level.value;
              return (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => handleSelectNumber(level.value)}
                  className={`w-full text-left p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 active:scale-[0.99] touch-manipulation ${
                    isCurrent
                      ? `${level.bgClass} ${level.borderClass} ring-1 ${level.ringClass} shadow-md`
                      : 'bg-slate-950/40 hover:bg-slate-950/70 border-slate-800/80'
                  }`}
                >
                  {/* Badge Numérico com a Cor Específica */}
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-mono tabular-nums font-black text-base shrink-0 border shadow-sm ${level.bgClass} ${level.textClass} ${level.borderClass}`}
                  >
                    {level.value}
                  </div>

                  {/* Informações e Explicação */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-black ${isCurrent ? level.textClass : 'text-white'}`}>
                        {level.label}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/90 text-slate-300 border border-slate-700/60 shrink-0">
                        {level.rirNote}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {level.description}
                    </p>
                  </div>

                  {/* Check Indicator if selected */}
                  {isCurrent && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${level.textClass}`}>
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="p-3.5 sm:p-4 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full h-10 sm:h-11 rounded-2xl font-bold text-xs sm:text-sm text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition active:scale-95 touch-manipulation flex items-center justify-center cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
