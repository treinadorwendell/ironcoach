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
  MessageSquare,
  PenLine,
  X,
  ArrowLeftRight,
  Film,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ExerciseCommentsHistoryModal } from './ExerciseCommentsHistoryModal';
import { findExerciseMetadata } from '@/lib/exerciseDatabase';
import { ExerciseMediaModal } from './ExerciseMediaPlayer';
import { ExerciseInstructionsModal } from './ExerciseInstructionsModal';

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
  onFinishWorkout: (finalExerciseIndex?: number) => void;
  onCopyFirstSetWeightToAll: (exIndex: number) => void;
  onUpdateExerciseComment: (exIndex: number, comment: string) => void;
  isSessionStarted: boolean;
  isSessionPaused: boolean;
  onStartWorkout: () => void;
  onTogglePause: () => void;
  elapsedSeconds: number;
  formatElapsed: (sec: number) => string;
  onRequestSwapSubstitute?: (exIndex: number) => void;
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
  onUpdateExerciseComment,
  isSessionStarted,
  isSessionPaused,
  onStartWorkout,
  onTogglePause,
  elapsedSeconds,
  formatElapsed,
  onRequestSwapSubstitute,
}) => {
  const [isCommentsModalOpen, setIsCommentsModalOpen] = React.useState(false);
  const [isCurrentCommentModalOpen, setIsCurrentCommentModalOpen] = React.useState(false);
  const [isMediaExpanded, setIsMediaExpanded] = React.useState(false);
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = React.useState(false);
  const [isViewModeModalOpen, setIsViewModeModalOpen] = React.useState(false);
  const totalExercises = session.exercises.length;
  const isFirst = focusedExerciseIndex === 0;
  const isLast = focusedExerciseIndex === totalExercises - 1;

  const resolvedMeta = React.useMemo(
    () => findExerciseMetadata(focusedExercise.exerciseName),
    [focusedExercise.exerciseName]
  );
  const exerciseImages =
    focusedExercise.images && focusedExercise.images.length > 0
      ? focusedExercise.images
      : resolvedMeta?.images || [];
  const exerciseVideoUrl = focusedExercise.videoUrl || resolvedMeta?.videoUrl;
  const exerciseGifUrl = focusedExercise.gifUrl || resolvedMeta?.gifUrl;
  const hasAnyMedia =
    exerciseImages.length > 0 || !!exerciseVideoUrl || !!exerciseGifUrl;
  const exerciseInstructions =
    focusedExercise.instructions && focusedExercise.instructions.length > 0
      ? focusedExercise.instructions
      : resolvedMeta?.instructions || [];

  const completedSetsCount = focusedExercise.sets.filter((s) => s.completed).length;
  const totalSetsCount = focusedExercise.sets.length;
  const isExerciseFullyCompleted = totalSetsCount > 0 && completedSetsCount === totalSetsCount;

  // Verifica se todos os exercícios do treino têm todas as suas séries preenchidas/concluídas
  const areAllExercisesCompleted = React.useMemo(() => {
    if (!session || !session.exercises || session.exercises.length === 0) return false;
    return session.exercises.every((ex, idx) => {
      const sets = idx === focusedExerciseIndex ? focusedExercise.sets : ex.sets;
      return sets.length > 0 && sets.every((s) => s.completed);
    });
  }, [session, focusedExercise.sets, focusedExerciseIndex]);

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
            className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 active:scale-95 transition flex items-center justify-center cursor-pointer shrink-0 shadow-sm"
            title="Voltar para a visão geral e lista de todos os exercícios"
            aria-label="Voltar para a lista de exercícios"
          >
            <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-400" />
          </button>

          <span className="text-[11px] sm:text-xs text-slate-400 font-medium hidden md:inline truncate">
            {session.programName}
          </span>
        </div>

        {/* Center: Exercise Counter & Elapsed Timer */}
        <div className="flex items-center justify-between sm:justify-end gap-3 min-w-0">
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
              Exercício {focusedExerciseIndex + 1} de {totalExercises}
            </span>
            <span className="text-xs font-bold text-emerald-400 tabular-nums">
              {completedSetsCount}/{totalSetsCount} séries concluídas
            </span>
          </div>

          {/* Active Workout Timer Widget (Runs continuously until workout is finished) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {!isSessionStarted ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Botão Somente Ícone que abre o modal de Modo Visualização */}
                <button
                  type="button"
                  onClick={() => setIsViewModeModalOpen(true)}
                  className="h-9 sm:h-10 w-9 sm:w-10 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 border border-amber-500/40 text-amber-400 flex items-center justify-center transition cursor-pointer shrink-0 shadow-sm"
                  title="Modo Visualização: Clique para abrir instruções e regras do treino"
                  aria-label="Informações sobre o Modo Visualização"
                >
                  <Info className="w-4 h-4 text-amber-400" />
                </button>

                {/* Botão com a escrita Iniciar alinhado com o ícone */}
                <button
                  type="button"
                  onClick={onStartWorkout}
                  className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 transition shadow-md shadow-emerald-950/50 cursor-pointer whitespace-nowrap shrink-0"
                  title="Iniciar contagem de tempo do treino e liberar edições"
                >
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-slate-950" />
                  <span>Iniciar</span>
                </button>
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl bg-slate-950 border border-emerald-500/40 font-mono tabular-nums text-xs sm:text-sm font-bold text-emerald-400 shadow-inner shrink-0"
                title="Cronômetro em andamento contínuo até concluir e finalizar o treino"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                <span>{formatElapsed(elapsedSeconds)}</span>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              disabled={isFirst}
              onClick={() => onSelectExercise(session.exercises[focusedExerciseIndex - 1].exerciseId)}
              className="w-9 h-9 sm:w-10 sm:h-10 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition active:scale-95 flex items-center justify-center cursor-pointer shrink-0"
              title="Exercício Anterior"
            >
              <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-cyan-400" />
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={() => onSelectExercise(session.exercises[focusedExerciseIndex + 1].exerciseId)}
              className="w-9 h-9 sm:w-10 sm:h-10 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-30 disabled:pointer-events-none transition active:scale-95 flex items-center justify-center cursor-pointer shrink-0"
              title="Próximo Exercício"
            >
              <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-cyan-400" />
            </button>
          </div>
        </div>
      </div>
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

              {focusedExercise.substituteExerciseName && onRequestSwapSubstitute && (
                <button
                  type="button"
                  onClick={() => onRequestSwapSubstitute(focusedExerciseIndex)}
                  className={`p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center justify-center transition active:scale-90 cursor-pointer shadow-sm ${
                    !isSessionStarted ? 'opacity-60' : ''
                  }`}
                  title={
                    isSessionStarted
                      ? `Trocar pelo exercício substituto: ${focusedExercise.substituteExerciseName}`
                      : `Inicie o treino para trocar pelo substituto (${focusedExercise.substituteExerciseName})`
                  }
                >
                  <ArrowLeftRight className="w-4 h-4 text-amber-400" />
                </button>
              )}
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
                className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 border border-cyan-500/30 font-mono tabular-nums font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer whitespace-nowrap shrink-0"
                title="Clique para iniciar o cronômetro com o tempo de descanso planejado"
              >
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Descanso: {focusedExercise.restSeconds}s</span>
              </button>

              {/* Botão para Visualizar a Mídia / Vídeo do Exercício em Janela Separada */}
              {hasAnyMedia && (
                <button
                  type="button"
                  onClick={() => setIsMediaExpanded(true)}
                  className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl border font-extrabold text-xs flex items-center justify-center gap-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/30 active:scale-95 transition cursor-pointer whitespace-nowrap shrink-0"
                  title="Abrir mídia/vídeo do exercício em janela separada"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Ver Vídeo</span>
                </button>
              )}

              {/* Botão para Abrir Modal com a Descrição da Execução do Exercício */}
              <button
                type="button"
                onClick={() => setIsInstructionsModalOpen(true)}
                className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer whitespace-nowrap shrink-0"
                title="Abrir modal com a descrição passo a passo da execução do exercício"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>Execução</span>
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

        {/* SÉRIES DO EXERCÍCIO E SUAS INFORMAÇÕES CONTIDAS (POSICIONADAS LOGO ABAIXO DO CABEÇALHO) */}
        <div className="space-y-3.5 pt-1">
          {/* Quick Tool: Copiar carga da primeira série */}
          {focusedExercise.sets.length > 1 && focusedExercise.sets[0].weightKg != null && (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => onCopyFirstSetWeightToAll(focusedExerciseIndex)}
                className={`px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition cursor-pointer ${
                  !isSessionStarted ? 'opacity-60' : ''
                }`}
                title="Copiar a carga da Série 1 para todas as demais séries"
              >
                <Copy className="w-3 h-3 text-emerald-400" />
                <span>Copiar Carga da Série 1</span>
              </button>
            </div>
          )}

          {/* Tabela de Séries */}
          <div className="space-y-2.5">
            <div className="grid grid-cols-12 gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-400 px-2 sm:px-3 uppercase tracking-wider items-center">
              <span className="col-span-2 text-left lg:text-center w-[43.83px] sm:w-auto h-[16.5px] sm:h-auto -ml-[24px] sm:ml-0 mr-0 my-0 p-0 flex items-center justify-start lg:justify-center">Série</span>
              <span className="col-span-3 text-center w-[67.25px] sm:w-auto h-[34px] sm:h-auto -ml-[13px] sm:ml-0 p-0 flex items-center justify-center">Reps (Alvo)</span>
              <span className="col-span-3 text-center">Carga (KG)</span>
              <span className="col-span-2 text-center text-amber-400">PSE</span>
              <span className="col-span-2 text-center pl-0 ml-[5px] sm:ml-0 -mr-[10px] sm:mr-0">Check</span>
            </div>

            {focusedExercise.sets.map((set, setIndex) => {
              const hasSubsets = set.subSets && set.subSets.length > 0;
              const pseInfo = getPseInfo(set.pse);

              return (
                <div key={set.setNumber} className="space-y-1.5">
                  {/* Linha Principal da Série (Proporções Mobile de referência + Expansão Fluida Tablet/Desktop) */}
                  <div
                    className={`grid grid-cols-12 gap-1.5 sm:gap-2 items-center w-[336px] max-w-[336px] sm:w-full sm:max-w-none h-[66px] sm:h-auto sm:min-h-[68px] lg:min-h-[72px] -ml-[17px] sm:ml-0 mr-0 my-0 p-[10px] sm:p-3 lg:p-3.5 rounded-xl sm:rounded-2xl transition-all duration-150 ${
                      set.completed
                        ? 'bg-emerald-950/30 border border-emerald-500/40 shadow-sm'
                        : 'bg-slate-950/80 border border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Col 1: Número da Série + Botão Evolução (Compacto e mais à esquerda no mobile/tablet) */}
                    <div className="col-span-2 flex flex-col items-start lg:items-center justify-center -ml-1 sm:ml-0">
                      <div className="w-full sm:w-auto flex items-center justify-start lg:justify-center gap-1 sm:gap-1.5">
                        <span
                          className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 pb-0 pr-0 mr-0 rounded-md sm:rounded-lg lg:rounded-xl font-black text-[10px] sm:text-xs lg:text-sm tabular-nums flex items-center justify-center shrink-0 ${
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
                              focusedExercise.sets.length
                            )
                          }
                          className="w-[22px] h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 px-0 shrink-0 rounded-md sm:rounded-lg lg:rounded-xl bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 flex items-center justify-center transition active:scale-90 cursor-pointer touch-manipulation"
                          title={`Ver página de evolução da Série ${set.setNumber}`}
                        >
                          <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4" />
                        </button>
                      </div>

                      {set.extraVariation ? (
                        <span
                          className="text-[9px] sm:text-[10px] font-bold text-amber-400 block mt-0.5 truncate max-w-[65px] sm:max-w-[90px]"
                          title={set.extraVariation}
                        >
                          {set.extraVariation.split(' • ')[0]}
                        </span>
                      ) : set.method && set.method !== 'Normal' ? (
                        <span
                          className="text-[9px] sm:text-[10px] font-bold text-amber-400 block mt-0.5 truncate max-w-[65px] sm:max-w-[90px]"
                          title={set.method}
                        >
                          {set.method}
                        </span>
                      ) : null}
                    </div>

                    {/* Col 2: Reps Target & Stepper (Botões - e + maiores no mobile) */}
                    <div className="col-span-3 flex items-center justify-center gap-1 sm:gap-1.5 lg:gap-2 pr-0">
                      <button
                        type="button"
                        onClick={() => onAdjustReps(focusedExerciseIndex, setIndex, -1)}
                        className={`w-8 h-[38px] sm:w-8 sm:h-9 lg:w-9 lg:h-10 px-0 py-0 m-0 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-base flex items-center justify-center active:scale-90 transition touch-manipulation cursor-pointer shrink-0 ${
                          !isSessionStarted ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                        title={isSessionStarted ? '-1 repetição' : 'Inicie o treino para alterar repetições'}
                      >
                        -
                      </button>
                      <div className="text-center min-w-[28px] sm:min-w-[38px] lg:min-w-[44px]">
                        <span className="text-sm sm:text-base font-black text-white font-mono tabular-nums block">
                          {set.completedReps}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold block">
                          {set.repZone}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAdjustReps(focusedExerciseIndex, setIndex, +1)}
                        className={`w-8 h-[38px] sm:w-8 sm:h-9 lg:w-9 lg:h-10 px-0 py-0 m-0 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-base flex items-center justify-center active:scale-90 transition touch-manipulation cursor-pointer shrink-0 ${
                          !isSessionStarted ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                        title={isSessionStarted ? '+1 repetição' : 'Inicie o treino para alterar repetições'}
                      >
                        +
                      </button>
                    </div>

                    {/* Col 3: Carga (KG) */}
                    <div className="col-span-3 flex items-center justify-center">
                      <div className="relative flex justify-center text-center">
                        <input
                          type="text"
                          readOnly={!isSessionStarted}
                          inputMode="decimal"
                          pattern="[0-9]*[.,]?[0-9]*"
                          placeholder="—"
                          value={set.weightKg != null && !isNaN(Number(set.weightKg)) ? set.weightKg : ''}
                          onClick={() => {
                            if (!isSessionStarted) {
                              onSetWeightDirect(focusedExerciseIndex, setIndex, set.weightKg ?? null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (!isSessionStarted) {
                              e.preventDefault();
                              return;
                            }
                            if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) return;
                            if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
                            if (/^[0-9]$/.test(e.key)) return;
                            if ((e.key === '.' || e.key === ',') && !e.currentTarget.value.includes('.') && !e.currentTarget.value.includes(',')) return;
                            e.preventDefault();
                          }}
                          onChange={(e) => {
                            if (!isSessionStarted) return;
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
                          className={`h-[38px] w-[50px] sm:h-10 sm:w-16 lg:h-[42px] lg:w-[76px] mx-0 text-center p-0 font-mono tabular-nums font-black text-sm sm:text-base text-emerald-400 bg-slate-900 border border-slate-700/80 rounded-xl focus:outline-none focus:border-emerald-500 shadow-inner placeholder:text-slate-600 ${
                            !isSessionStarted ? 'opacity-65 cursor-not-allowed' : ''
                          }`}
                        />
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
                        className={`w-[44px] sm:w-12 lg:w-[52px] h-10 sm:h-[42px] lg:h-11 -ml-[8px] sm:ml-0 mb-0 pt-0 px-0 rounded-xl flex flex-col items-center justify-center transition-all duration-150 active:scale-90 touch-manipulation border shadow-sm group cursor-pointer shrink-0 ${
                          !isSessionStarted ? 'opacity-60 cursor-not-allowed ' : ''
                        }${
                          pseInfo
                            ? `${pseInfo.bgClass} ${pseInfo.textClass} ${pseInfo.borderClass} ring-1 ${pseInfo.ringClass} shadow-md`
                            : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 hover:border-amber-500/50 text-slate-400 hover:text-amber-400'
                        }`}
                        title={
                          !isSessionStarted
                            ? 'Inicie o treino para definir o PSE'
                            : pseInfo
                            ? `PSE ${set.pse}: ${pseInfo.label} (${pseInfo.rirNote}) - Clique para alterar`
                            : 'Definir PSE (0 a 10)'
                        }
                      >
                        {pseInfo ? (
                          <>
                            <span className="font-mono tabular-nums font-black text-sm sm:text-base leading-none">
                              {set.pse}
                            </span>
                            <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-tighter opacity-80 leading-none mt-0.5">
                              PSE
                            </span>
                          </>
                        ) : (
                          <>
                            <Gauge className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                            <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 group-hover:text-amber-400 uppercase leading-none mt-0.5">
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
                        className={`w-10 h-10 sm:w-11 sm:h-11 lg:w-[46px] lg:h-[46px] rounded-xl flex items-center justify-center shadow-lg transition-all duration-150 active:scale-90 touch-manipulation cursor-pointer shrink-0 ${
                          !isSessionStarted ? 'opacity-60 cursor-not-allowed ' : ''
                        }${
                          set.completed
                            ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400 shadow-emerald-500/40'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                        }`}
                        title={
                          !isSessionStarted
                            ? 'Inicie o treino para marcar séries concluídas'
                            : set.completed
                            ? 'Desmarcar série'
                            : 'Concluir série e iniciar cronômetro de descanso'
                        }
                      >
                        <Check
                          className={`w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[3] transition-transform ${
                            set.completed ? 'scale-110' : 'opacity-40'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* SUBSÉRIES (SE MÉTODO AVANÇADO COMO DROP-SET OU 3/7) */}
                  {hasSubsets && (
                    <div className="ml-3 sm:ml-5 pl-2.5 sm:pl-3 border-l-2 border-purple-500/50 space-y-1.5 my-1">
                      {set.subSets!.map((sub, subIdx) => (
                        <div
                          key={sub.id || subIdx}
                          className={`grid grid-cols-12 gap-1.5 sm:gap-2 items-center p-2 sm:p-2.5 lg:p-3 rounded-xl transition-all ${
                            sub.completed
                              ? 'bg-purple-950/40 border border-purple-500/50 shadow-sm'
                              : 'bg-slate-950/70 border border-purple-500/30'
                          }`}
                        >
                          <div className="col-span-2 flex flex-col items-start lg:items-center justify-center">
                            <span className="text-[10px] sm:text-xs font-black text-purple-300 tabular-nums">
                              ↳ Sub {sub.subSetNumber}
                            </span>
                            {sub.note && (
                              <span
                                className="text-[8px] sm:text-[9px] text-slate-400 block truncate max-w-[65px] sm:max-w-[90px]"
                                title={sub.note}
                              >
                                {sub.note}
                              </span>
                            )}
                          </div>

                          <div className="col-span-3 flex items-center justify-center gap-1 sm:gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                onAdjustSubSetReps(focusedExerciseIndex, setIndex, subIdx, -1)
                              }
                              className={`w-7 h-8 sm:w-7 sm:h-8 lg:w-8 lg:h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-sm flex items-center justify-center active:scale-90 cursor-pointer touch-manipulation shrink-0 ${
                                !isSessionStarted ? 'opacity-60 cursor-not-allowed' : ''
                              }`}
                            >
                              -
                            </button>
                            <div className="text-center min-w-[26px] sm:min-w-[34px]">
                              <span className="text-xs sm:text-sm font-black text-white font-mono tabular-nums block">
                                {sub.completedReps}
                              </span>
                              <span className="text-[8px] sm:text-[9px] text-slate-400 block truncate max-w-[40px] sm:max-w-[54px]">
                                {sub.repZone}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                onAdjustSubSetReps(focusedExerciseIndex, setIndex, subIdx, +1)
                              }
                              className={`w-7 h-8 sm:w-7 sm:h-8 lg:w-8 lg:h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-sm flex items-center justify-center active:scale-90 cursor-pointer touch-manipulation shrink-0 ${
                                !isSessionStarted ? 'opacity-60 cursor-not-allowed' : ''
                              }`}
                            >
                              +
                            </button>
                          </div>

                          <div className="col-span-3 flex items-center justify-center">
                            <input
                              type="text"
                              readOnly={!isSessionStarted}
                              inputMode="decimal"
                              pattern="[0-9]*[.,]?[0-9]*"
                              placeholder="—"
                              value={sub.weightKg != null && !isNaN(Number(sub.weightKg)) ? sub.weightKg : ''}
                              onClick={() => {
                                if (!isSessionStarted) {
                                  onSetSubSetWeightDirect(
                                    focusedExerciseIndex,
                                    setIndex,
                                    subIdx,
                                    sub.weightKg ?? null
                                  );
                                }
                              }}
                              onChange={(e) => {
                                if (!isSessionStarted) return;
                                const raw = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                                const parsed = raw === '' ? null : parseFloat(raw);
                                onSetSubSetWeightDirect(
                                  focusedExerciseIndex,
                                  setIndex,
                                  subIdx,
                                  parsed == null || isNaN(parsed) ? null : Math.max(0, parsed)
                                );
                              }}
                              className={`h-[34px] w-[50px] sm:h-9 sm:w-16 lg:h-10 lg:w-[72px] text-center p-0 font-mono tabular-nums font-black text-xs sm:text-sm text-purple-300 bg-slate-900 border border-slate-700/80 rounded-xl focus:outline-none focus:border-purple-500 shadow-inner placeholder:text-slate-600 ${
                                !isSessionStarted ? 'opacity-65 cursor-not-allowed' : ''
                              }`}
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
                              className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center shadow transition-all active:scale-90 cursor-pointer touch-manipulation shrink-0 ${
                                !isSessionStarted ? 'opacity-60 cursor-not-allowed ' : ''
                              }${
                                sub.completed
                                  ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                              }`}
                              title={
                                !isSessionStarted
                                  ? 'Inicie o treino para concluir subséries'
                                  : sub.completed
                                  ? 'Desmarcar'
                                  : 'Concluir'
                              }
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

        {/* OBSERVAÇÕES BIOMECÂNICAS / EXECUÇÃO (EXIBIDO SOMENTE SE CADASTRADO AO CRIAR O TREINO) */}
        {focusedExercise.observations && focusedExercise.observations.trim() && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1 text-left">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-black">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Observações Biomecânicas / Execução</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 italic pl-1 leading-relaxed">
              &ldquo;{focusedExercise.observations.trim()}&rdquo;
            </p>
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

        {/* AÇÕES: COMENTÁRIO DA SESSÃO ATUAL & COMENTÁRIOS ANTERIORES */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              if (!isSessionStarted) {
                onUpdateExerciseComment(focusedExerciseIndex, focusedExercise.exerciseComment || '');
                return;
              }
              setIsCurrentCommentModalOpen(true);
            }}
            className={`flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 hover:border-purple-500/50 border border-slate-700/80 text-xs font-bold text-white flex items-center justify-between sm:justify-start gap-2.5 transition active:scale-95 cursor-pointer shadow-sm group ${
              !isSessionStarted ? 'opacity-65 cursor-not-allowed' : ''
            }`}
            title={
              isSessionStarted
                ? 'Abrir modal para adicionar ou editar comentário da sessão atual para este exercício'
                : 'Inicie o treino para adicionar comentário nesta sessão'
            }
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
                <PenLine className="w-3.5 h-3.5" />
              </div>
              <span className="truncate group-hover:text-purple-300 transition">
                Comentário da Sessão Atual para este Exercício
              </span>
            </div>

            {focusedExercise.exerciseComment && focusedExercise.exerciseComment.trim() ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 shrink-0">
                <Check className="w-3 h-3" />
                <span>Salvo</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-normal shrink-0">
                + Adicionar nota
              </span>
            )}
          </button>

          {(() => {
            const previousComments = storage.getExerciseComments(
              focusedExercise.exerciseName,
              session.clientId
            );
            return (
              <button
                type="button"
                onClick={() => setIsCommentsModalOpen(true)}
                className="px-3 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 transition active:scale-95 cursor-pointer shrink-0 shadow-sm"
                title="Abrir página com os comentários anteriores deste exercício"
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                <span>Comentários Anteriores ({previousComments.length})</span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* 5. FOOTER DE AÇÕES DO EXERCÍCIO */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-xs font-black text-white block">
            {!isSessionStarted
              ? `Visualizando Exercício ${focusedExerciseIndex + 1} de ${totalExercises}`
              : areAllExercisesCompleted
              ? '✓ Todos os exercícios deste treino foram preenchidos!'
              : isExerciseFullyCompleted
              ? '✓ Todas as séries deste exercício foram cumpridas!'
              : `${completedSetsCount} de ${totalSetsCount} séries concluídas neste exercício`}
          </span>
          <p className="text-[11px] text-slate-400">
            {!isSessionStarted
              ? 'Clique em "Iniciar Treino" para começar a contagem do tempo e registrar as séries.'
              : areAllExercisesCompleted
              ? 'Treino completo! Clique em "Concluir e Finalizar" para parar o cronômetro e salvar.'
              : isLast
              ? 'Último exercício. Conclua todas as séries ou finalize o treino quando terminar.'
              : `Próximo: ${session.exercises[focusedExerciseIndex + 1]?.exerciseName}`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={onBackToList}
            className="flex-1 sm:flex-none h-10 sm:h-11 lg:h-12 px-4 sm:px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm border border-slate-700 active:scale-95 transition flex items-center justify-center cursor-pointer whitespace-nowrap shrink-0"
          >
            Lista de Exercícios
          </button>

          {!isSessionStarted ? (
            <>
              {!isLast && (
                <button
                  type="button"
                  onClick={() =>
                    onSelectExercise(session.exercises[focusedExerciseIndex + 1].exerciseId)
                  }
                  className="flex-1 sm:flex-none h-10 sm:h-11 lg:h-12 px-4 sm:px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs sm:text-sm border border-cyan-500/30 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Próximo Exercício</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onStartWorkout}
                className="flex-1 sm:flex-none h-10 sm:h-11 lg:h-12 px-5 sm:px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/50 transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation whitespace-nowrap shrink-0"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Iniciar Treino</span>
              </button>
            </>
          ) : areAllExercisesCompleted ? (
            <button
              type="button"
              onClick={() => {
                onFinishWorkout(focusedExerciseIndex);
              }}
              className="flex-1 sm:flex-none h-10 sm:h-11 lg:h-12 px-5 sm:px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/60 transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation whitespace-nowrap shrink-0 animate-in fade-in zoom-in-95 duration-200"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[3]" />
              <span>Concluir e Finalizar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onFinishAndAdvance(focusedExerciseIndex)}
              className="flex-1 sm:flex-none h-10 sm:h-11 lg:h-12 px-5 sm:px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/50 transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation whitespace-nowrap shrink-0"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Concluir e Avançar</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          )}
        </div>
      </div>

      <ExerciseCommentsHistoryModal
        isOpen={isCommentsModalOpen}
        onClose={() => setIsCommentsModalOpen(false)}
        exerciseName={focusedExercise.exerciseName}
        clientId={session.clientId}
      />

      {/* MODAL: COMENTÁRIO DA SESSÃO ATUAL */}
      {isCurrentCommentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col space-y-0 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
                  <PenLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Comentário da Sessão Atual
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {focusedExercise.exerciseName} • Aluno: {session.clientName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCurrentCommentModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-3">
              <label className="text-xs text-slate-300 font-semibold block">
                Observações e feedback deste exercício na sessão atual:
              </label>
              <textarea
                autoFocus
                value={focusedExercise.exerciseComment || ''}
                onChange={(e) => onUpdateExerciseComment(focusedExerciseIndex, e.target.value)}
                placeholder="Ex: Aluno realizou com excelente amplitude, ajustada a pegada na 2ª série, sentiu boa ativação..."
                className="w-full h-36 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition resize-none leading-relaxed"
              />
              <p className="text-[11px] text-slate-400">
                O comentário é salvo automaticamente no treino e ficará disponível no histórico de consultas do aluno.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-2">
              {focusedExercise.exerciseComment && focusedExercise.exerciseComment.trim() ? (
                <button
                  type="button"
                  onClick={() => onUpdateExerciseComment(focusedExerciseIndex, '')}
                  className="px-3.5 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-semibold transition cursor-pointer"
                >
                  Limpar Comentário
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setIsCurrentCommentModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Salvar e Fechar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DESCRIÇÃO DA EXECUÇÃO DO EXERCÍCIO */}
      <ExerciseInstructionsModal
        isOpen={isInstructionsModalOpen}
        onClose={() => setIsInstructionsModalOpen(false)}
        exercise={{
          name: focusedExercise.exerciseName,
          muscleGroup: focusedExercise.muscleGroup,
          primaryMuscles: focusedExercise.primaryMuscles?.length
            ? focusedExercise.primaryMuscles
            : resolvedMeta?.primaryMuscles,
          secondaryMuscles: focusedExercise.secondaryMuscles?.length
            ? focusedExercise.secondaryMuscles
            : resolvedMeta?.secondaryMuscles,
          equipment: focusedExercise.equipment || resolvedMeta?.equipment,
          level: focusedExercise.level || resolvedMeta?.level,
          mechanic: focusedExercise.mechanic || resolvedMeta?.mechanic,
          force: focusedExercise.force || resolvedMeta?.force,
          category: focusedExercise.category || resolvedMeta?.category,
          instructions: exerciseInstructions,
          images: exerciseImages,
        }}
      />

      {/* JANELA SEPARADA DE VÍDEO / GIF / MÍDIA */}
      <ExerciseMediaModal
        isOpen={isMediaExpanded}
        onClose={() => setIsMediaExpanded(false)}
        exercise={{
          name: focusedExercise.exerciseName,
          muscleGroup: focusedExercise.muscleGroup,
          images: exerciseImages,
          videoUrl: exerciseVideoUrl,
          gifUrl: exerciseGifUrl,
        }}
      />

      {/* MODAL EXPLICATIVO: MODO VISUALIZAÇÃO DO TREINO */}
      {isViewModeModalOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsViewModeModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-500/40 p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
                  <Info className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Modo Visualização
                  </h3>
                  <span className="text-[11px] text-amber-300 font-medium">
                    Treino aguardando início
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsViewModeModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p>
                Você está no <strong>Modo de Consulta Pré-Treino</strong>. Pode navegar entre exercícios, consultar o histórico de cargas e repetições de sessões anteriores, vídeos demonstrativos e instruções biomecânicas.
              </p>
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                <Play className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 fill-amber-400" />
                <span>
                  O cronômetro e as alterações de cargas, repetições, PSE e marcação de séries serão liberados imediatamente ao clicar em <strong>Iniciar</strong>.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsViewModeModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs active:scale-95 transition cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsViewModeModalOpen(false);
                  onStartWorkout();
                }}
                className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-md active:scale-95 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                <span>Iniciar Treino Agora</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
