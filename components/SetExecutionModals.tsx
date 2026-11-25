'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  Minus,
  Plus,
  Dumbbell,
  Repeat,
  History,
  Target,
  RotateCcw,
  Copy,
} from 'lucide-react';

export interface RepsPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  setNumber: number;
  subSetNumber?: number;
  repZone: string;
  currentReps: number;
  lastWorkoutReps?: number | null;
  onChangeReps: (newReps: number, applyToSubsequent?: boolean) => void;
}

export const RepsPickerModal: React.FC<RepsPickerModalProps> = ({
  isOpen,
  onClose,
  exerciseName,
  setNumber,
  subSetNumber,
  repZone,
  currentReps,
  lastWorkoutReps,
  onChangeReps,
}) => {
  const [prevInitialReps, setPrevInitialReps] = useState(currentReps);
  const [repsValue, setRepsValue] = useState<number>(currentReps || 10);

  if (prevInitialReps !== currentReps) {
    setPrevInitialReps(currentReps);
    setRepsValue(currentReps || 10);
  }

  if (!isOpen || typeof document === 'undefined') return null;

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(20);
      } catch {
        // ignore vibration restriction
      }
    }
  };

  const handleStep = (delta: number) => {
    triggerHaptic();
    const next = Math.max(1, repsValue + delta);
    setRepsValue(next);
    onChangeReps(next, false);
  };

  const handleSelectQuickReps = (val: number) => {
    triggerHaptic();
    const next = Math.max(1, val);
    setRepsValue(next);
    onChangeReps(next, false);
  };

  const handleConfirm = (applyToSubsequent = false) => {
    triggerHaptic();
    onChangeReps(repsValue, applyToSubsequent);
    onClose();
  };

  // Gerar sugestões rápidas baseadas na Zona de Repetição Alvo
  const getZoneSuggestions = (): number[] => {
    const nums = repZone
      .split(/[^0-9]+/)
      .map((n) => parseInt(n, 10))
      .filter((n) => !isNaN(n) && n > 0);

    const setVals = new Set<number>();
    if (nums.length >= 2) {
      const min = Math.min(nums[0], nums[1]);
      const max = Math.max(nums[0], nums[1]);
      for (let i = min; i <= max && setVals.size < 6; i++) {
        setVals.add(i);
      }
      setVals.add(max);
    } else if (nums.length === 1) {
      const base = nums[0];
      [Math.max(1, base - 2), Math.max(1, base - 1), base, base + 1, base + 2].forEach((v) =>
        setVals.add(v)
      );
    } else {
      [6, 8, 10, 12, 15].forEach((v) => setVals.add(v));
    }

    if (lastWorkoutReps && lastWorkoutReps > 0) {
      setVals.add(lastWorkoutReps);
    }

    return Array.from(setVals).sort((a, b) => a - b);
  };

  const suggestions = getZoneSuggestions();

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-slate-950/85 backdrop-blur-md pl-[max(0.5rem,var(--sal))] pr-[max(0.5rem,var(--sar))] sm:px-4 pt-[calc(var(--sat)+0.5rem)] pb-[calc(var(--sab)+0.5rem)]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 36, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 36, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-modal-safe sm:max-h-[88dvh]"
        >
          {/* Header */}
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Repeat className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-white truncate">
                  Número de Repetições
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  <strong className="text-slate-200">{exerciseName}</strong> • Série {setNumber}
                  {subSetNumber ? ` (Sub ${subSetNumber})` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar modal de repetições"
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95 touch-manipulation cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
            {/* Faixa de Zona Alvo + Último Treino Concluído */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-950/90 border border-cyan-500/30 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  <span>Zona Alvo</span>
                </span>
                <span className="text-base sm:text-lg font-black text-white font-mono tabular-nums mt-1">
                  {repZone} <span className="text-xs font-semibold text-slate-400">reps</span>
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/90 border border-purple-500/30 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                  <History className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                  <span>Último Treino</span>
                </span>
                {lastWorkoutReps != null && lastWorkoutReps > 0 ? (
                  <div className="flex items-center justify-between gap-1 mt-1">
                    <span className="text-base sm:text-lg font-black text-purple-200 font-mono tabular-nums">
                      {lastWorkoutReps} <span className="text-xs font-semibold text-slate-400">reps</span>
                    </span>
                    {repsValue !== lastWorkoutReps && (
                      <button
                        type="button"
                        onClick={() => handleSelectQuickReps(lastWorkoutReps)}
                        className="px-2 py-0.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-[10px] font-bold text-purple-200 transition active:scale-95 cursor-pointer"
                      >
                        Usar
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-slate-500 mt-1.5">
                    Sem registro anterior
                  </span>
                )}
              </div>
            </div>

            {/* Controle Central Gigante (- e +) */}
            <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800/90 flex items-center justify-between gap-3 shadow-inner">
              <button
                type="button"
                onClick={() => handleStep(-1)}
                disabled={repsValue <= 1}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-40 border border-slate-700 text-white flex items-center justify-center shadow-lg transition active:scale-90 touch-manipulation cursor-pointer shrink-0"
                aria-label="Diminuir 1 repetição"
              >
                <Minus className="w-7 h-7 stroke-[3]" />
              </button>

              <div className="flex flex-col items-center justify-center text-center min-w-0 flex-1">
                <span className="text-4xl sm:text-5xl font-black text-white font-mono tabular-nums tracking-tight leading-none">
                  {repsValue}
                </span>
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider mt-1.5">
                  Repetições Realizadas
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Meta prescrita: <strong className="text-slate-200">{repZone}</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleStep(1)}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-400 border border-cyan-400/40 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-950/50 transition active:scale-90 touch-manipulation cursor-pointer shrink-0"
                aria-label="Aumentar 1 repetição"
              >
                <Plus className="w-7 h-7 stroke-[3]" />
              </button>
            </div>

            {/* Botões de Seleção Rápida (Zona Alvo & Último Treino) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>Seleção Rápida (Zona Alvo):</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStep(-5)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] font-bold border border-slate-700 active:scale-95 transition cursor-pointer"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStep(5)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] font-bold border border-slate-700 active:scale-95 transition cursor-pointer"
                  >
                    +5
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">
                {suggestions.map((val) => {
                  const isSelected = repsValue === val;
                  const isLastWorkout = lastWorkoutReps === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelectQuickReps(val)}
                      className={`h-10 rounded-xl font-mono tabular-nums font-black text-xs sm:text-sm flex flex-col items-center justify-center border transition active:scale-95 touch-manipulation cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 border-cyan-300 ring-2 ring-cyan-400/60 shadow-md'
                          : isLastWorkout
                          ? 'bg-purple-950/60 text-purple-200 border-purple-500/50 hover:bg-purple-900/60'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <span>{val}</span>
                      {isLastWorkout && !isSelected && (
                        <span className="text-[8px] font-sans font-bold text-purple-300 leading-none">
                          último
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/90 flex flex-col gap-2 shrink-0">
            {!subSetNumber && (
              <button
                type="button"
                onClick={() => handleConfirm(true)}
                className="w-full h-9 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 touch-manipulation cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>Aplicar {repsValue} reps também nas séries seguintes</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleConfirm(false)}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-1.5 transition active:scale-95 touch-manipulation cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Confirmar ({repsValue} repetições)</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export interface WeightPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  setNumber: number;
  subSetNumber?: number;
  currentWeight: number | null;
  lastWorkoutWeight?: number | null;
  onChangeWeight: (newWeight: number | null, applyToSubsequent?: boolean) => void;
}

export const WeightPickerModal: React.FC<WeightPickerModalProps> = ({
  isOpen,
  onClose,
  exerciseName,
  setNumber,
  subSetNumber,
  currentWeight,
  lastWorkoutWeight,
  onChangeWeight,
}) => {
  const [prevInitialWeight, setPrevInitialWeight] = useState(currentWeight);
  const [weightInput, setWeightInput] = useState<string>(
    currentWeight != null && !isNaN(Number(currentWeight)) ? String(currentWeight) : ''
  );

  if (prevInitialWeight !== currentWeight) {
    setPrevInitialWeight(currentWeight);
    setWeightInput(
      currentWeight != null && !isNaN(Number(currentWeight)) ? String(currentWeight) : ''
    );
  }

  if (!isOpen || typeof document === 'undefined') return null;

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(20);
      } catch {
        // ignore vibration restriction
      }
    }
  };

  const parseCurrentNumeric = (): number => {
    const cleaned = weightInput.replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  };

  const handleAdjustWeight = (delta: number) => {
    triggerHaptic();
    const base = parseCurrentNumeric();
    const next = Math.max(0, parseFloat((base + delta).toFixed(1)));
    setWeightInput(String(next));
    onChangeWeight(next, false);
  };

  const handleDirectInputChange = (rawVal: string) => {
    const sanitized = rawVal.replace(',', '.').replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    const formatted = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
    setWeightInput(formatted);

    if (formatted === '') {
      onChangeWeight(null, false);
    } else {
      const parsed = parseFloat(formatted);
      if (!isNaN(parsed)) {
        onChangeWeight(Math.max(0, parsed), false);
      }
    }
  };

  const handleClearWeight = () => {
    triggerHaptic();
    setWeightInput('');
    onChangeWeight(null, false);
  };

  const handleConfirm = (applyToSubsequent = false) => {
    triggerHaptic();
    const cleaned = weightInput.replace(',', '.').trim();
    if (cleaned === '') {
      onChangeWeight(null, applyToSubsequent);
    } else {
      const parsed = parseFloat(cleaned);
      onChangeWeight(isNaN(parsed) ? null : Math.max(0, parsed), applyToSubsequent);
    }
    onClose();
  };

  const numericWeight = weightInput.trim() === '' ? null : parseCurrentNumeric();

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-slate-950/85 backdrop-blur-md pl-[max(0.5rem,var(--sal))] pr-[max(0.5rem,var(--sar))] sm:px-4 pt-[calc(var(--sat)+0.5rem)] pb-[calc(var(--sab)+0.5rem)]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 36, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 36, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-modal-safe sm:max-h-[88dvh]"
        >
          {/* Header */}
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Dumbbell className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-white truncate">
                  Definir Carga (kg)
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  <strong className="text-slate-200">{exerciseName}</strong> • Série {setNumber}
                  {subSetNumber ? ` (Sub ${subSetNumber})` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar modal de carga"
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95 touch-manipulation cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
            {/* Última Carga Registrada & Limpar */}
            <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-950/90 border border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <History className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Último Treino Concluído
                  </span>
                  {lastWorkoutWeight != null && lastWorkoutWeight > 0 ? (
                    <span className="text-sm font-black text-emerald-300 font-mono tabular-nums">
                      {lastWorkoutWeight} kg
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">
                      Sem carga anterior
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {lastWorkoutWeight != null &&
                  lastWorkoutWeight > 0 &&
                  numericWeight !== lastWorkoutWeight && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setWeightInput(String(lastWorkoutWeight));
                        onChangeWeight(lastWorkoutWeight, false);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition active:scale-95 cursor-pointer"
                    >
                      Usar {lastWorkoutWeight}kg
                    </button>
                  )}

                {weightInput !== '' && (
                  <button
                    type="button"
                    onClick={handleClearWeight}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                    title="Limpar carga"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Limpar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Controle Central de Carga (- / Input Direto / +) */}
            <div className="p-3.5 sm:p-4 rounded-3xl bg-slate-950 border border-slate-800/90 flex items-center justify-between gap-2.5 shadow-inner">
              <button
                type="button"
                onClick={() => handleAdjustWeight(-1)}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-white flex flex-col items-center justify-center shadow-lg transition active:scale-90 touch-manipulation cursor-pointer shrink-0"
                aria-label="Diminuir 1 kg"
              >
                <Minus className="w-6 h-6 stroke-[3]" />
                <span className="text-[9px] font-mono font-bold text-slate-400">-1kg</span>
              </button>

              <div className="flex-1 min-w-0 flex flex-col items-center justify-center">
                <div className="relative flex items-baseline justify-center w-full">
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    placeholder="—"
                    value={weightInput}
                    onChange={(e) => handleDirectInputChange(e.target.value)}
                    className="w-32 sm:w-36 h-14 text-center bg-slate-900/90 border border-emerald-500/40 focus:border-emerald-400 rounded-2xl text-3xl sm:text-4xl font-black text-emerald-400 font-mono tabular-nums focus:outline-none shadow-inner placeholder:text-slate-600"
                  />
                  <span className="ml-1.5 text-sm font-black text-slate-400 uppercase">kg</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">
                  Toque no número para digitar ou use os botões
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleAdjustWeight(1)}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 border border-emerald-400/40 text-slate-950 flex flex-col items-center justify-center shadow-lg shadow-emerald-950/50 transition active:scale-90 touch-manipulation cursor-pointer shrink-0"
                aria-label="Aumentar 1 kg"
              >
                <Plus className="w-6 h-6 stroke-[3]" />
                <span className="text-[9px] font-mono font-black text-slate-900">+1kg</span>
              </button>
            </div>

            {/* Incrementos Rápidos de Anilha / Halteres */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 block">
                Ajuste Rápido de Carga:
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[-5, -2.5, -0.5].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => handleAdjustWeight(delta)}
                    className="h-9 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-rose-300 font-mono tabular-nums font-bold text-xs transition active:scale-95 touch-manipulation cursor-pointer"
                  >
                    {delta} kg
                  </button>
                ))}
                {[+0.5, +2.5, +5].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => handleAdjustWeight(delta)}
                    className="h-9 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 font-mono tabular-nums font-bold text-xs transition active:scale-95 touch-manipulation cursor-pointer"
                  >
                    +{delta} kg
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-slate-950/90 flex flex-col gap-2 shrink-0">
            {!subSetNumber && numericWeight != null && (
              <button
                type="button"
                onClick={() => handleConfirm(true)}
                className="w-full h-9 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 touch-manipulation cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>Aplicar {numericWeight} kg também nas séries seguintes</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleConfirm(false)}
              className="w-full h-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1.5 transition active:scale-95 touch-manipulation cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                {numericWeight != null
                  ? `Confirmar Carga (${numericWeight} kg)`
                  : 'Confirmar Sem Carga'}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
