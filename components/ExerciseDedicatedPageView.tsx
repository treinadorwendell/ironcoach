'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  ActiveWorkoutSession,
  ExecutionExerciseState,
} from '@/types';
import { storage } from '@/lib/storage';
import { getPseInfo } from './PsePickerModal';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  TrendingUp,
  Gauge,
  History,
  Info,
  Link2,
  Dumbbell,
  Sparkles,
  Copy,
  Flame,
  Layers,
} from 'lucide-react';

interface ExerciseDedicatedPageViewProps {
  session: ActiveWorkoutSession;
  focusedExercise: ExecutionExerciseState;
  focusedExerciseIndex: number;
  onSelectExercise: (exerciseId: string) => void;
  onBackToList: () => void;
  onToggleSetCheck: (exIndex: number, setIndex: number) => void;
  onAdjustReps: (exIndex: number, setIndex: number, delta: number) => void;
  onSetWeightDirect: (exIndex: number, setIndex: number, weight: number | null) => void;
  onAdjustWeight: (exIndex: number, setIndex: number, delta: number) => void;
  onOpenPseModal: (
    exIndex: number,
    setIndex: number,
    pse: number | null | undefined,
    name: string,
    setNumber: number
  ) => void;
  onOpenSeriesHistory: (name: string, setNumber: number, totalSets: number) => void;
  onToggleSubSetCheck: (exIndex: number, setIndex: number, subIndex: number) => void;
  onAdjustSubSetReps: (exIndex: number, setIndex: number, subIndex: number, delta: number) => void;
  onSetSubSetWeightDirect: (exIndex: number, setIndex: number, subIndex: number, val: number | null) => void;
  onTriggerRestTimer: (seconds: number, exerciseName: string, setNumber: number) => void;
  onFinishAndAdvance: (exIndex: number) => void;
  onFinishWorkout: () => void;
  onCopyFirstSetWeightToAll: (exIndex: number) => void;
  isSessionStarted: boolean;
  isSessionPaused: boolean;
  onStartWorkout: () => void;
  onTogglePause: () => void;
  elapsedSeconds: number;
  formatElapsed: (sec: number) => string;
}

export const ExerciseDedicatedPageView: React.FC<ExerciseDedicatedPageViewProps> = ({
  session,
  focusedExercise,
  focusedExerciseIndex,
  onSelectExercise,
  onBackToList,
  onToggleSetCheck,
  onAdjustReps,
  onSetWeightDirect,
  onAdjustWeight,
  onOpenPseModal,
  onOpenSeriesHistory,
  onToggleSubSetCheck,
  onAdjustSubSetReps,
  onSetSubSetWeightDirect,
  onTriggerRestTimer,
  onFinishAndAdvance,
  onFinishWorkout,
  onCopyFirstSetWeightToAll,
  isSessionStarted,
  isSessionPaused,
  onStartWorkout,
  onTogglePause,
  elapsedSeconds,
  formatElapsed,
}) => {
  const totalExercises = session.exercises.length;
  const isFirst = focusedExerciseIndex === 0;
  const isLast = focusedExerciseIndex === totalExercises - 1;

  const completedSetsCount = focusedExercise.sets.filter((s) => s.completed).length;
  const totalSetsCount = focusedExercise.sets.length;
  const isExerciseFullyCompleted = totalSetsCount > 0 && completedSetsCount === totalSetsCount;

  // Retrieve past historical performance for this exercise
  const exerciseHistory = storage.getExerciseHistory(
    focusedExercise.exerciseName,
    session.clientId
  );
  const latestHistoryEntry =
    exerciseHistory && exerciseHistory.length > 0
      ? exerciseHistory[exerciseHistory.length - 1]
      : null;

  // Find partner exercises in combination (Bi-set, Tri-set)
  const combinationPartners = focusedExercise.combinationGroupId
    ? session.exercises.filter(
        (ex) =>
          ex.combinationGroupId === focusedExercise.combinationGroupId &&
          ex.exerciseId !== focusedExercise.exerciseId
      )
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* 1. TOP NAVIGATION BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToList}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 active:scale-95 transition cursor-pointer"
            title="Voltar para a visão geral e lista de todos os exercícios"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Voltar à Lista</span>
          </button>

          <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
            {session.programName}
          </span>
        </div>

        {/* Center: Exercise Counter & Elapsed Timer */}
        <div className="flex items-center justify-between sm:justify-end gap-3 min-w-0">
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
              Exercício {focusedExerciseIndex + 1} de {totalExercises}
            </span>
            <span className="text-xs font-bold text-emerald-400">
              {completedSetsCount}/{totalSetsCount} séries concluídas
            </span>
          </div>

          {/* Active Workout Timer Widget */}
          <div className="flex items-center gap-2">
            {!isSessionStarted ? (
              <button
                type="button"
                onClick={onStartWorkout}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center gap-1.5 active:scale-95 transition shadow-sm cursor-pointer"
                title="Iniciar contagem de tempo do treino"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Iniciar</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onTogglePause}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 active:scale-95 transition cursor-pointer"
                  title={isSessionPaused ? 'Retomar' : 'Pausar'}
                >
                  {isSessionPaused ? (
                    <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  ) : (
                    <Pause className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  )}
                </button>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950 border border-emerald-500/40 font-mono text-xs font-bold text-emerald-400">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>{formatElapsed(elapsedSeconds)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={isFirst}
              onClick={() => onSelectExercise(session.exercises[focusedExerciseIndex - 1].exerciseId)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition active:scale-95 cursor-pointer"
              title="Exercício Anterior"
            >
              <ChevronLeft className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={() => onSelectExercise(session.exercises[focusedExerciseIndex + 1].exerciseId)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition active:scale-95 cursor-pointer"
              title="Próximo Exercício"
            >
              <ChevronRight className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. HORIZONTAL EXERCISE CAROUSEL / NAVIGATOR */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {session.exercises.map((item, idx) => {
          const isCurrent = item.exerciseId === focusedExercise.exerciseId;
          const completedInItem = item.sets.filter((s) => s.completed).length;
          const isItemDone = item.sets.length > 0 && completedInItem === item.sets.length;

          return (
            <button
              key={item.exerciseId}
              type="button"
              onClick={() => onSelectExercise(item.exerciseId)}
              className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-2 border transition active:scale-95 cursor-pointer ${
                isCurrent
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 shadow-md font-black ring-2 ring-emerald-400/40'
                  : isItemDone
                  ? 'bg-slate-900/90 text-emerald-400 border-emerald-500/40 hover:bg-slate-800'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-lg text-[10px] flex items-center justify-center font-black ${
                  isCurrent
                    ? 'bg-slate-950 text-white'
                    : isItemDone
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {idx + 1}
              </span>
              <span className="truncate max-w-[140px] sm:max-w-[180px]">
                {item.exerciseName}
              </span>
              {isItemDone && (
                <Check className={`w-3.5 h-3.5 stroke-[3] ${isCurrent ? 'text-slate-950' : 'text-emerald-400'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. HERO: TODAS AS INFORMAÇÕES DO EXERCÍCIO */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
        {/* Header com Nome, Grupo Muscular, Método e Descanso */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black text-sm flex items-center justify-center shrink-0">
                {focusedExerciseIndex + 1}
              </span>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {focusedExercise.exerciseName}
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-bold border border-slate-700 flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
                <span>{focusedExercise.muscleGroup}</span>
              </span>

              {focusedExercise.method && focusedExercise.method !== 'Normal' ? (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-black border border-amber-500/40 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Método: {focusedExercise.method}</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-400 font-semibold border border-slate-700">
                  Método Tradicional
                </span>
              )}

              <button
                type="button"
                onClick={() =>
                  onTriggerRestTimer(
                    focusedExercise.restSeconds || 60,
                    focusedExercise.exerciseName,
                    1
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 border border-cyan-500/30 font-mono font-bold flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                title="Clique para iniciar o cronômetro com o tempo de descanso planejado"
              >
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Descanso: {focusedExercise.restSeconds}s</span>
              </button>
            </div>
          </div>

          {/* Status Geral do Exercício */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div
              className={`px-3.5 py-2 rounded-2xl flex items-center gap-2 border font-bold text-xs ${
                isExerciseFullyCompleted
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700'
              }`}
            >
              {isExerciseFullyCompleted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Exercício Concluído ({completedSetsCount}/{totalSetsCount})</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>{completedSetsCount} de {totalSetsCount} séries prontas</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* COMBINAÇÃO (BI-SET / TRI-SET) SE HOUVER */}
        {focusedExercise.combinationGroupId && (
          <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/40 space-y-2">
            <div className="flex items-center gap-2 text-purple-300 text-xs font-bold">
              <Link2 className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                Exercício Combinado ({focusedExercise.combinationLabel || 'Bi-set'} - {focusedExercise.combinationOrder || 1}º em sequência direta)
              </span>
            </div>
            {combinationPartners.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[11px] text-slate-300">Combinado com:</span>
                {combinationPartners.map((partner) => (
                  <button
                    key={partner.exerciseId}
                    type="button"
                    onClick={() => onSelectExercise(partner.exerciseId)}
                    className="px-2.5 py-1 rounded-lg bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-500/30 text-xs font-bold flex items-center gap-1 active:scale-95 transition cursor-pointer"
                  >
                    <span>{partner.exerciseName}</span>
                    <ArrowRight className="w-3 h-3 text-purple-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* OBSERVAÇÕES E INSTRUÇÕES TÉCNICAS DO TREINADOR */}
        {focusedExercise.observations ? (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1 text-left">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-black">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Instruções & Observações Técnicas do Exercício</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 italic pl-1 leading-relaxed">
              &ldquo;{focusedExercise.observations}&rdquo;
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Mantenha a postura alinhada, respiração coordenada e cadência controlada na fase excêntrica.</span>
          </div>
        )}

        {/* SNAPSHOT HISTÓRICO: CARGA ANTERIOR DO ALUNO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-cyan-500/20 shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                Histórico Anterior do Aluno
              </span>
              <p className="text-xs text-slate-200">
                {latestHistoryEntry ? (
                  <>
                    Última sessão ({latestHistoryEntry.date}):{' '}
                    <strong className="text-emerald-400 font-mono text-sm">
                      {latestHistoryEntry.weightKg ? `${latestHistoryEntry.weightKg} kg` : 'Sem carga'}
                    </strong>{' '}
                    com <strong className="text-white font-mono">{latestHistoryEntry.reps} reps</strong>
                  </>
                ) : (
                  'Primeira execução registrada deste exercício para este aluno.'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenSeriesHistory(focusedExercise.exerciseName, 1, totalSetsCount)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto transition active:scale-95 cursor-pointer shadow-sm"
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ver Gráfico de Evolução</span>
          </button>
        </div>
      </div>

      {/* 4. TABELA INTERATIVA DE SÉRIES E EXECUÇÃO */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Séries do Exercício ({totalSetsCount})
            </h3>
          </div>

          {/* Quick Tool: Copiar carga da primeira série */}
          {focusedExercise.sets.length > 1 && focusedExercise.sets[0].weightKg != null && (
            <button
              type="button"
              onClick={() => onCopyFirstSetWeightToAll(focusedExerciseIndex)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
              title="Copiar a carga da Série 1 para todas as demais séries"
            >
              <Copy className="w-3 h-3 text-emerald-400" />
              <span>Copiar Carga da Série 1</span>
            </button>
          )}
        </div>

        {/* Tabela de Séries */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-12 gap-1.5 text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider items-center">
            <span className="col-span-2 text-center">Série</span>
            <span className="col-span-3 text-center">Reps (Alvo)</span>
            <span className="col-span-3 text-center">Carga (KG)</span>
            <span className="col-span-2 text-center text-amber-400">PSE</span>
            <span className="col-span-2 text-center">Check</span>
          </div>

          {focusedExercise.sets.map((set, setIndex) => {
            const hasSubsets = set.subSets && set.subSets.length > 0;
            const pseInfo = getPseInfo(set.pse);

            return (
              <div key={set.setNumber} className="space-y-1.5">
                {/* Linha Principal da Série */}
                <div
                  className={`grid grid-cols-12 gap-1.5 items-center p-2.5 sm:p-3 rounded-2xl transition-all duration-150 ${
                    set.completed
                      ? 'bg-emerald-950/30 border border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950/80 border border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Col 1: Número da Série + Ícone de Evolução */}
                  <div className="col-span-2 flex flex-col items-center justify-center">
                    <div className="w-full flex items-center justify-center gap-1">
                      <span
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center shrink-0 ${
                          set.completed
                            ? 'bg-emerald-500 text-slate-950 shadow-md'
                            : 'bg-slate-800 text-slate-200'
                        }`}
                        title={`Série ${set.setNumber}`}
                      >
                        {set.setNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onOpenSeriesHistory(
                            focusedExercise.exerciseName,
                            set.setNumber,
                            totalSetsCount
                          )
                        }
                        className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 flex items-center justify-center transition active:scale-90 cursor-pointer"
                        title={`Ver evolução histórica da Série #${set.setNumber}`}
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {set.extraVariation ? (
                      <span
                        className="text-[9px] font-bold text-amber-400 block mt-0.5 truncate max-w-[70px]"
                        title={set.extraVariation}
                      >
                        {set.extraVariation.split(' • ')[0]}
                      </span>
                    ) : set.method && set.method !== 'Normal' ? (
                      <span
                        className="text-[9px] font-bold text-amber-400 block mt-0.5 truncate max-w-[70px]"
                        title={set.method}
                      >
                        {set.method}
                      </span>
                    ) : null}
                  </div>

                  {/* Col 2: Reps Target & Stepper */}
                  <div className="col-span-3 flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => onAdjustReps(focusedExerciseIndex, setIndex, -1)}
                      className="w-8 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-sm flex items-center justify-center active:scale-90 transition touch-manipulation cursor-pointer"
                      title="-1 repetição"
                    >
                      -
                    </button>
                    <div className="text-center min-w-[36px]">
                      <span className="text-sm sm:text-base font-black text-white font-mono block">
                        {set.completedReps}
                      </span>
                      <span className="text-[9px] text-slate-400 font-semibold block">
                        {set.repZone}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAdjustReps(focusedExerciseIndex, setIndex, +1)}
                      className="w-8 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-sm flex items-center justify-center active:scale-90 transition touch-manipulation cursor-pointer"
                      title="+1 repetição"
                    >
                      +
                    </button>
                  </div>

                  {/* Col 3: Carga (KG) com Stepper Rápido e Input */}
                  <div className="col-span-3 flex flex-col items-center justify-center gap-1">
                    <div className="relative flex justify-center text-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        placeholder="—"
                        value={set.weightKg != null && !isNaN(Number(set.weightKg)) ? set.weightKg : ''}
                        onKeyDown={(e) => {
                          if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) return;
                          if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
                          if (/^[0-9]$/.test(e.key)) return;
                          if ((e.key === '.' || e.key === ',') && !e.currentTarget.value.includes('.') && !e.currentTarget.value.includes(',')) return;
                          e.preventDefault();
                        }}
                        onChange={(e) => {
                          const raw = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                          if (raw === '') {
                            onSetWeightDirect(focusedExerciseIndex, setIndex, null);
                          } else {
                            const parsed = parseFloat(raw);
                            onSetWeightDirect(
                              focusedExerciseIndex,
                              setIndex,
                              isNaN(parsed) ? null : Math.max(0, parsed)
                            );
                          }
                        }}
                        className="h-[40px] w-[56px] text-center p-0 font-mono font-black text-sm sm:text-base text-emerald-400 bg-slate-900 border border-slate-700/80 rounded-xl focus:outline-none focus:border-emerald-500 shadow-inner placeholder:text-slate-600"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onAdjustWeight(focusedExerciseIndex, setIndex, -1)}
                        className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-slate-400 hover:text-white border border-slate-800"
                        title="-1kg"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdjustWeight(focusedExerciseIndex, setIndex, +1)}
                        className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-slate-400 hover:text-white border border-slate-800"
                        title="+1kg"
                      >
                        +1
                      </button>
                    </div>
                  </div>

                  {/* Col 4: PSE (0 a 10) */}
                  <div className="col-span-2 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenPseModal(
                          focusedExerciseIndex,
                          setIndex,
                          set.pse,
                          focusedExercise.exerciseName,
                          set.setNumber
                        )
                      }
                      className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all duration-150 active:scale-90 touch-manipulation border shadow-sm group cursor-pointer ${
                        pseInfo
                          ? `${pseInfo.bgClass} ${pseInfo.textClass} ${pseInfo.borderClass} ring-1 ${pseInfo.ringClass} shadow-md`
                          : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 hover:border-amber-500/50 text-slate-400 hover:text-amber-400'
                      }`}
                      title={
                        pseInfo
                          ? `PSE ${set.pse}: ${pseInfo.label} (${pseInfo.rirNote}) - Clique para alterar`
                          : 'Definir PSE (0 a 10)'
                      }
                    >
                      {pseInfo ? (
                        <>
                          <span className="font-mono font-black text-sm leading-none">
                            {set.pse}
                          </span>
                          <span className="text-[8px] font-bold uppercase tracking-tighter opacity-80 leading-none mt-0.5">
                            PSE
                          </span>
                        </>
                      ) : (
                        <>
                          <Gauge className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                          <span className="text-[8px] font-bold text-slate-500 group-hover:text-amber-400 uppercase leading-none mt-0.5">
                            PSE
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Col 5: Check Série */}
                  <div className="col-span-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => onToggleSetCheck(focusedExerciseIndex, setIndex)}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-all duration-150 active:scale-90 touch-manipulation cursor-pointer ${
                        set.completed
                          ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400 shadow-emerald-500/40'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                      }`}
                      title={set.completed ? 'Desmarcar série' : 'Concluir série e iniciar cronômetro de descanso'}
                    >
                      <Check
                        className={`w-5 h-5 stroke-[3] transition-transform ${
                          set.completed ? 'scale-110' : 'opacity-40'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* SUBSÉRIES (SE MÉTODO AVANÇADO COMO DROP-SET OU 3/7) */}
                {hasSubsets && (
                  <div className="ml-3 sm:ml-5 pl-2.5 border-l-2 border-purple-500/50 space-y-1.5 my-1">
                    {set.subSets!.map((sub, subIdx) => (
                      <div
                        key={sub.id || subIdx}
                        className={`grid grid-cols-12 gap-1.5 items-center p-2 rounded-xl transition-all ${
                          sub.completed
                            ? 'bg-purple-950/40 border border-purple-500/50 shadow-sm'
                            : 'bg-slate-950/70 border border-purple-500/30'
                        }`}
                      >
                        <div className="col-span-2 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-black text-purple-300">
                            ↳ Sub #{sub.subSetNumber}
                          </span>
                          {sub.note && (
                            <span
                              className="text-[8px] text-slate-400 block truncate max-w-[65px]"
                              title={sub.note}
                            >
                              {sub.note}
                            </span>
                          )}
                        </div>

                        <div className="col-span-3 flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              onAdjustSubSetReps(focusedExerciseIndex, setIndex, subIdx, -1)
                            }
                            className="w-6 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs flex items-center justify-center active:scale-90"
                          >
                            -
                          </button>
                          <div className="text-center min-w-[28px]">
                            <span className="text-xs font-black text-white font-mono block">
                              {sub.completedReps}
                            </span>
                            <span className="text-[8px] text-slate-400 block truncate max-w-[40px]">
                              {sub.repZone}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              onAdjustSubSetReps(focusedExerciseIndex, setIndex, subIdx, +1)
                            }
                            className="w-6 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs flex items-center justify-center active:scale-90"
                          >
                            +
                          </button>
                        </div>

                        <div className="col-span-3 flex items-center justify-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            placeholder="—"
                            value={sub.weightKg != null && !isNaN(Number(sub.weightKg)) ? sub.weightKg : ''}
                            onChange={(e) => {
                              const raw = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                              const parsed = raw === '' ? null : parseFloat(raw);
                              onSetSubSetWeightDirect(
                                focusedExerciseIndex,
                                setIndex,
                                subIdx,
                                parsed == null || isNaN(parsed) ? null : Math.max(0, parsed)
                              );
                            }}
                            className="h-[34px] w-[50px] text-center p-0 font-mono font-black text-xs text-purple-300 bg-slate-900 border border-slate-700/80 rounded-xl focus:outline-none focus:border-purple-500 shadow-inner placeholder:text-slate-600"
                          />
                        </div>

                        <div className="col-span-2 flex items-center justify-center">
                          <span className="text-slate-700 text-xs font-mono font-bold">—</span>
                        </div>

                        <div className="col-span-2 flex justify-center">
                          <button
                            type="button"
                            onClick={() =>
                              onToggleSubSetCheck(focusedExerciseIndex, setIndex, subIdx)
                            }
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shadow transition-all active:scale-90 cursor-pointer ${
                              sub.completed
                                ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                            }`}
                            title={sub.completed ? 'Desmarcar' : 'Concluir'}
                          >
                            <Check
                              className={`w-5 h-5 stroke-[3] ${
                                sub.completed ? 'scale-110' : 'opacity-40'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. FOOTER DE AÇÕES DO EXERCÍCIO */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-xs font-black text-white block">
            {isExerciseFullyCompleted
              ? '✓ Todas as séries deste exercício foram cumpridas!'
              : `${completedSetsCount} de ${totalSetsCount} séries concluídas neste exercício`}
          </span>
          <p className="text-[11px] text-slate-400">
            {isLast
              ? 'Este é o último exercício do treino. Ao concluir, você poderá finalizar a sessão.'
              : `Próximo: ${session.exercises[focusedExerciseIndex + 1]?.exerciseName}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={onBackToList}
            className="flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 active:scale-95 transition cursor-pointer"
          >
            Lista de Exercícios
          </button>

          {!isLast ? (
            <button
              type="button"
              onClick={() => onFinishAndAdvance(focusedExerciseIndex)}
              className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/50 transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Concluir e Avançar</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onFinishAndAdvance(focusedExerciseIndex);
                onFinishWorkout();
              }}
              className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/60 transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[3]" />
              <span>Concluir Exercício e Finalizar Treino</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
