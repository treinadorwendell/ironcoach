'use client';

import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Dumbbell,
  Layers,
  Sparkles,
  Activity,
  CheckCircle2,
  Film,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DatabaseExercise } from '@/types';
import {
  findExerciseMetadata,
  formatAnatomyMuscle,
  formatEquipment,
  formatLevel,
  formatMechanic,
  formatForce,
  formatCategory,
} from '@/lib/exerciseDatabase';
import { ExerciseMediaPlayer } from './ExerciseMediaPlayer';

interface ExerciseInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise?: (Partial<DatabaseExercise> & { name: string }) | null;
  exerciseName?: string;
  exerciseData?: Partial<DatabaseExercise>;
}

export const ExerciseInstructionsModal: React.FC<ExerciseInstructionsModalProps> = ({
  isOpen,
  onClose,
  exercise,
  exerciseName,
  exerciseData,
}) => {
  const [showMediaInModal, setShowMediaInModal] = useState(false);

  const resolvedName = exercise?.name || exerciseName || '';
  const resolvedData = exercise || exerciseData;

  if (!isOpen || !resolvedName) return null;

  const catalogMatch = findExerciseMetadata(resolvedName);
  const merged: Partial<DatabaseExercise> = {
    ...catalogMatch,
    ...resolvedData,
    instructions:
      resolvedData?.instructions && resolvedData.instructions.length > 0
        ? resolvedData.instructions
        : catalogMatch?.instructions || [],
    images:
      resolvedData?.images && resolvedData.images.length > 0
        ? resolvedData.images
        : catalogMatch?.images || [],
    primaryMuscles:
      resolvedData?.primaryMuscles && resolvedData.primaryMuscles.length > 0
        ? resolvedData.primaryMuscles
        : catalogMatch?.primaryMuscles || [],
    secondaryMuscles:
      resolvedData?.secondaryMuscles && resolvedData.secondaryMuscles.length > 0
        ? resolvedData.secondaryMuscles
        : catalogMatch?.secondaryMuscles || [],
    equipment: resolvedData?.equipment ?? catalogMatch?.equipment ?? null,
    level: resolvedData?.level ?? catalogMatch?.level,
    mechanic: resolvedData?.mechanic ?? catalogMatch?.mechanic,
    force: resolvedData?.force ?? catalogMatch?.force,
    category: resolvedData?.category ?? catalogMatch?.category,
  };

  const instructions = merged.instructions || [];
  const images = merged.images || [];
  const primaryMuscles = merged.primaryMuscles || [];
  const secondaryMuscles = merged.secondaryMuscles || [];

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block">
                Guia Técnico e Biomecânica do Movimento
              </span>
              <h3 className="text-base sm:text-lg font-black text-white leading-snug break-words">
                {resolvedName}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Technical Classification Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">
                Equipamento
              </span>
              <span className="text-xs font-extrabold text-emerald-400 mt-0.5 block truncate">
                {formatEquipment(merged.equipment)}
              </span>
            </div>

            {merged.level && (
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">
                  Nível
                </span>
                <span className="text-xs font-extrabold text-cyan-300 mt-0.5 block">
                  {formatLevel(merged.level)}
                </span>
              </div>
            )}

            {merged.mechanic && (
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">
                  Mecânica
                </span>
                <span className="text-xs font-extrabold text-purple-300 mt-0.5 block truncate">
                  {formatMechanic(merged.mechanic)}
                </span>
              </div>
            )}

            {(merged.force || merged.category) && (
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">
                  Força / Categoria
                </span>
                <span className="text-xs font-extrabold text-amber-300 mt-0.5 block truncate">
                  {merged.force ? formatForce(merged.force) : formatCategory(merged.category)}
                </span>
              </div>
            )}
          </div>

          {/* Anatomy Section: Primary & Secondary Muscles */}
          {(primaryMuscles.length > 0 || secondaryMuscles.length > 0) && (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-black text-slate-200 uppercase tracking-wider">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Anatomia Exigida pelo Movimento</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                    Músculos Primários (Alvo Principal):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {primaryMuscles.length > 0 ? (
                      primaryMuscles.map((m) => (
                        <span
                          key={m}
                          className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold flex items-center gap-1"
                        >
                          <Dumbbell className="w-3 h-3 text-emerald-400" />
                          <span>{formatAnatomyMuscle(m)}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">Não especificado</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                    Músculos Secundários (Sinergistas):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {secondaryMuscles.length > 0 ? (
                      secondaryMuscles.map((m) => (
                        <span
                          key={m}
                          className="px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1"
                        >
                          <Layers className="w-3 h-3 text-cyan-400" />
                          <span>{formatAnatomyMuscle(m)}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">
                        Sem músculos secundários registrados
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Collapsible Media Inside Modal if available */}
          {images.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowMediaInModal((prev) => !prev)}
                className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-cyan-400" />
                  <span>
                    {showMediaInModal
                      ? 'Ocultar Demonstração em Vídeo / Mídia'
                      : 'Visualizar Demonstração em Vídeo / Mídia'}
                  </span>
                </div>
                {showMediaInModal ? (
                  <ChevronUp className="w-4 h-4 text-cyan-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-cyan-400" />
                )}
              </button>

              {showMediaInModal && (
                <ExerciseMediaPlayer images={images} exerciseName={resolvedName} autoPlay />
              )}
            </div>
          )}

          {/* Step-by-Step Execution Instructions */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Passo a Passo da Execução</span>
              </div>
              {instructions.length > 0 && (
                <span className="text-[10px] font-mono font-bold text-slate-400 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800">
                  {instructions.length} etapas
                </span>
              )}
            </div>

            {instructions.length > 0 ? (
              <ol className="space-y-2.5">
                {instructions.map((step, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs sm:text-sm text-slate-200 leading-relaxed"
                  >
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="flex-1">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                <p className="text-xs font-semibold text-slate-300">
                  Este exercício não possui etapas detalhadas cadastradas no catálogo.
                </p>
                <p className="text-[11px] text-slate-500">
                  Mantenha a postura alinhada, controle a fase excêntrica e siga as observações do treinador.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>Entendido, Fechar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
