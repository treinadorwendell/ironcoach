'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  WorkoutProgram,
  WorkoutSplit,
  Client,
  ActiveWorkoutSession,
  ExecutionExerciseState,
  ExecutionSet,
  ExecutionSubSet,
  CompletedWorkoutRecord,
  CompletedExerciseRecord,
} from '@/types';
import { storage } from '@/lib/storage';
import { sounds } from '@/lib/sound';
import { cloudSync } from '@/lib/firebase';
import { useActiveWorkoutPersistence } from '@/hooks/useActiveWorkoutPersistence';
import { SeriesHistoryModal } from './ExerciseHistoryChart';
import { RestCountdownTimer } from './RestCountdownTimer';
import {
  Flame,
  Check,
  TrendingUp,
  Clock,
  Play,
  Pause,
  CheckCircle2,
  Trophy,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  ExternalLink,
  LayoutList,
  Info,
  History,
  BookOpen,
  Target,
  User,
  Dumbbell,
  FilePlus,
  Sparkles,
  Weight,
  Ruler,
  Activity,
  Layers,
  Link2,
  FileText,
  X,
  Gauge,
  Calendar as CalendarIcon,
  PenLine,
  UserPlus,
} from 'lucide-react';
import { PsePickerModal, getPseInfo } from './PsePickerModal';
import { ExerciseDedicatedPageView } from './ExerciseDedicatedPageView';
import { CalendarEvent } from '@/types';

interface WorkoutExecutionSectionProps {
  clients: Client[];
  workouts: WorkoutProgram[];
  activeWorkout: WorkoutProgram | null;
  calendarEvents?: CalendarEvent[];
  onSelectWorkout: (workout: WorkoutProgram) => void;
  onNavigateToClients?: () => void;
  onNavigateToCreateWorkout?: (clientId: string) => void;
  onFinishWorkout?: () => void;
  onRegisterWorkoutInAgenda?: (
    clientId: string,
    clientName: string,
    workoutName: string,
    dateStr: string
  ) => void;
  onConfirmWorkoutCompletedInAgenda?: (
    clientId: string,
    clientName: string,
    workoutName: string,
    dateIso: string,
    startTimeStr?: string,
    trainerNotes?: string
  ) => void;
}

export const WorkoutExecutionSection: React.FC<WorkoutExecutionSectionProps> = ({
  clients,
  workouts,
  activeWorkout,
  calendarEvents,
  onSelectWorkout,
  onNavigateToClients,
  onNavigateToCreateWorkout,
  onFinishWorkout,
  onRegisterWorkoutInAgenda,
  onConfirmWorkoutCompletedInAgenda,
}) => {
  // Helper to build a session from a program (with split support)
  const buildSession = useCallback(
    (prog: WorkoutProgram, specificSplit?: WorkoutSplit): ActiveWorkoutSession => {
      const client = clients.find((c) => c.id === prog.clientId);
      const clientName = client ? client.name : 'Aluno';

      const targetSplit =
        specificSplit ||
        (prog.splits && prog.splits.length > 0 ? prog.splits[0] : null);

      const exercisesToUse = targetSplit
        ? targetSplit.exercises
        : prog.exercises || [];

      const displayName = targetSplit
        ? targetSplit.name
        : prog.name;

      const exercisesState: ExecutionExerciseState[] = exercisesToUse.map((ex) => {
        const lastRecordedWeight = storage.getLastPerformedWeight(ex.name, prog.clientId);

        const setsCount =
          ex.setDetails && ex.setDetails.length > 0 ? ex.setDetails.length : ex.sets;

        const sets: ExecutionSet[] = Array.from({ length: setsCount }).map((_, idx) => {
          const setDetail = ex.setDetails?.[idx];
          const activeRepZone = setDetail?.repZone || ex.repZone || '10';
          const parsedReps = parseInt(activeRepZone.split('-')[0], 10) || 10;
          const setHistoryWeight = storage.getLastPerformedWeight(ex.name, prog.clientId, idx);
          const setWeight = setHistoryWeight ?? lastRecordedWeight ?? null;
          const setMethod =
            setDetail?.method && setDetail.method !== 'Normal'
              ? setDetail.method
              : undefined;

          const subSets: ExecutionSubSet[] = (setDetail?.subSets || []).map((sub, subIdx) => {
            const subParsedReps = parseInt(sub.repZone.split('-')[0], 10) || 8;
            return {
              id: sub.id || `subset-${idx}-${subIdx}`,
              subSetNumber: sub.subSetNumber || subIdx + 1,
              repZone: sub.repZone,
              targetReps: subParsedReps,
              completedReps: subParsedReps,
              weightKg: setWeight,
              completed: false,
              note: sub.note,
            };
          });

          return {
            setNumber: idx + 1,
            repZone: activeRepZone,
            targetReps: parsedReps,
            completedReps: parsedReps,
            weightKg: setWeight,
            completed: false,
            extraVariation: setMethod,
            method: setDetail?.method || ex.method,
            subSets,
          };
        });

        return {
          exerciseId: ex.id,
          exerciseName: ex.name,
          muscleGroup: ex.muscleGroup,
          method: ex.method,
          observations: ex.observations,
          restSeconds: ex.restSeconds || 60,
          sets,
          combinationGroupId: ex.combinationGroupId,
          combinationLabel: ex.combinationLabel,
          combinationOrder: ex.combinationOrder,
        };
      });

      return {
        programId: prog.id,
        clientId: prog.clientId,
        clientName,
        programName: displayName,
        startTime: new Date().toISOString(),
        elapsedSeconds: 0,
        isPaused: false,
        isStarted: false,
        exercises: exercisesState,
        trainerNotes: '',
      };
    },
    [clients]
  );

  type ExecutionStep = 'selecao-aluno' | 'programas' | 'selecao-treino' | 'execucao';

  // Dedicated hook that automatically persists active workout progress to localStorage and protects against data loss on refresh
  const {
    session,
    setSession,
    startNewSession: persistStartNewSession,
    clearActiveSession,
  } = useActiveWorkoutPersistence({
    activeWorkout,
    buildSession,
    onClientSync: (clientId) => {
      setSelectedClientId(clientId);
    },
  });

  // Selected student state for explicit selection
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    return session?.clientId || activeWorkout?.clientId || '';
  });

  // Sequential navigation steps:
  // 0. 'selecao-aluno': Choose student first
  // 1. 'programas': Vertical list of training programs for the selected student
  // 2. 'selecao-treino': Choose which workout/split to execute from the chosen program
  // 3. 'execucao': Hidden execution page rendered ready with timer waiting to start
  const [currentStep, setCurrentStep] = useState<ExecutionStep>(() => {
    if (session && session.isStarted) return 'execucao';
    if (activeWorkout) return 'execucao';
    return 'selecao-aluno';
  });

  const [selectedProgram, setSelectedProgram] = useState<WorkoutProgram | null>(() => {
    if (activeWorkout) return activeWorkout;
    const initialClientWorkouts = workouts.filter(
      (w) => w.clientId === (session?.clientId || clients[0]?.id || '')
    );
    return initialClientWorkouts[0] || null;
  });

  // Helpers to format program dates (Vigência) and days of week
  const formatVigencia = (start?: string, end?: string) => {
    if (!start && !end) return 'Vigência contínua';
    const formatSingle = (s?: string) => {
      if (!s) return '';
      try {
        const parts = s.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return s;
      } catch {
        return s;
      }
    };
    if (start && end) {
      return `${formatSingle(start)} até ${formatSingle(end)}`;
    }
    if (start) {
      return `A partir de ${formatSingle(start)}`;
    }
    return `Até ${formatSingle(end)}`;
  };

  const formatProgramDays = (program: WorkoutProgram) => {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const allDays: number[] = [];

    if (program.splits && program.splits.length > 0) {
      program.splits.forEach((s) => {
        if (s.weekDays && Array.isArray(s.weekDays)) {
          allDays.push(...s.weekDays);
        }
      });
    } else if (program.weekDays && Array.isArray(program.weekDays)) {
      allDays.push(...program.weekDays);
    }

    const uniqueDays = Array.from(new Set(allDays)).sort((a, b) => a - b);
    if (uniqueDays.length === 0) return 'Dias flexíveis';
    return uniqueDays.map((d) => dayNames[d]).join(', ');
  };

  // Helper to ensure only the workout name is shown
  const getWorkoutDisplayName = (fullName?: string) => {
    if (!fullName) return 'Treino';
    if (fullName.includes(' • ')) {
      return fullName.split(' • ').slice(1).join(' • ');
    }
    return fullName;
  };

  // 1 - Estado para a Página/Modal de Evolução por Série (Requisitos 1, 1.1, 1.2, 1.3, 1.4)
  const [seriesHistoryModal, setSeriesHistoryModal] = useState<{
    isOpen: boolean;
    exerciseName: string;
    setNumber: number;
    totalSets: number;
  } | null>(null);

  // Toast feedback ao clicar em "Concluir e Recolher"
  const [exerciseFinishedToast, setExerciseFinishedToast] = useState<string | null>(null);

  // Expansion state for the active workout to be performed
  const [isWorkoutExpanded, setIsWorkoutExpanded] = useState<boolean>(true);

  // Individual exercise expansion states (default: collapsed on workout selection)
  const [expandedExerciseIds, setExpandedExerciseIds] = useState<Record<string, boolean>>({});

  // Modo de visualização dos exercícios durante o treino: 'pagina' (página dedicada com todas as informações) ou 'lista' (expansão em lista)
  const [exerciseViewMode, setExerciseViewMode] = useState<'pagina' | 'lista'>('pagina');
  // ID do exercício atualmente focado na página dedicada
  const [focusedExerciseId, setFocusedExerciseId] = useState<string | null>(null);

  // Carrega e sincroniza a preferência salva de modo de visualização
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ironcoach_exercise_view_mode');
      if (saved === 'pagina' || saved === 'lista') {
        setExerciseViewMode(saved);
      }
    }
  }, []);

  const handleSetExerciseViewMode = (mode: 'pagina' | 'lista') => {
    setExerciseViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ironcoach_exercise_view_mode', mode);
    }
  };

  const handleSelectExercise = (exId: string) => {
    if (exerciseViewMode === 'pagina') {
      setFocusedExerciseId(exId);
    } else {
      handleToggleExerciseExpand(exId);
    }
  };

  // Active Rest Timer state
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [timerExerciseName, setTimerExerciseName] = useState('');
  const [timerSetNumber, setTimerSetNumber] = useState(1);

  // Workout Completion Modal State
  const [isFinishedModalOpen, setIsFinishedModalOpen] = useState(false);
  const [workoutSummary, setWorkoutSummary] = useState<{
    totalVolumeKg: number;
    completedSets: number;
    totalSets: number;
    durationStr: string;
    trainerNotes?: string;
    clientId: string;
    clientName: string;
    workoutName: string;
    dateFormatted: string;
    dateIso: string;
    timeFormatted?: string;
  } | null>(null);
  const [registerInAgendaConfirmed, setRegisterInAgendaConfirmed] = useState<boolean>(true);

  // Estado para a Página/Modal de Seleção de PSE (0 a 10)
  const [pseModalConfig, setPseModalConfig] = useState<{
    isOpen: boolean;
    exerciseIndex: number;
    setIndex: number;
    initialValue?: number | null;
    exerciseName: string;
    setNumber: number;
  } | null>(null);

  const handleOpenPseModal = (
    exerciseIndex: number,
    setIndex: number,
    currentPse: number | null | undefined,
    exerciseName: string,
    setNumber: number
  ) => {
    setPseModalConfig({
      isOpen: true,
      exerciseIndex,
      setIndex,
      initialValue: currentPse ?? null,
      exerciseName,
      setNumber,
    });
  };

  const handleSelectPse = (pseValue: number | null) => {
    if (!pseModalConfig || !session) return;
    const { exerciseIndex, setIndex } = pseModalConfig;
    const updatedExercises = [...session.exercises];
    const targetEx = { ...updatedExercises[exerciseIndex] };
    const targetSets = [...targetEx.sets];
    targetSets[setIndex] = {
      ...targetSets[setIndex],
      pse: pseValue,
    };
    targetEx.sets = targetSets;
    updatedExercises[exerciseIndex] = targetEx;

    const updatedSession = {
      ...session,
      exercises: updatedExercises,
    };
    setSession(updatedSession);
    storage.saveActiveSession(updatedSession);
    setPseModalConfig(null);
  };

  const handleOpenSeriesHistory = (
    exerciseName: string,
    setNumber: number,
    totalSets: number
  ) => {
    setSeriesHistoryModal({
      isOpen: true,
      exerciseName,
      setNumber,
      totalSets,
    });
  };

  const handleToggleExerciseExpand = (exId: string) => {
    setExpandedExerciseIds((prev) => ({
      ...prev,
      [exId]: !prev[exId],
    }));
  };

  // 1.3: Concluir e Recolher - Salva snapshot das séries do exercício e recolhe
  const handleFinishAndCollapseExercise = (exIndex: number) => {
    if (!session) return;
    const ex = session.exercises[exIndex];
    if (!ex) return;

    // Marca todas as séries como concluídas se ainda não estavam
    const updatedSets = ex.sets.map((s) => ({
      ...s,
      completed: true,
    }));

    const updatedExercises = [...session.exercises];
    updatedExercises[exIndex] = {
      ...ex,
      sets: updatedSets,
    };

    const updatedSession = {
      ...session,
      exercises: updatedExercises,
    };

    setSession(updatedSession);
    storage.saveActiveSession(updatedSession);

    // Grava imediatamente o snapshot para o histórico de evolução de cada série
    const savedSnapshot = storage.recordExerciseFinishedOnCollapse(
      session.clientId,
      ex.exerciseName,
      updatedSets
    );
    if (savedSnapshot) {
      cloudSync.syncFinishedExerciseSnapshot(savedSnapshot);
    }
    cloudSync.syncActiveSession(updatedSession);

    // Recolhe o exercício
    setExpandedExerciseIds((prev) => ({
      ...prev,
      [ex.exerciseId]: false,
    }));

    // Toast de confirmação para o treinador
    setExerciseFinishedToast(
      `Exercício "${ex.exerciseName}" concluído! Séries salvas no histórico de evolução.`
    );
    setTimeout(() => {
      setExerciseFinishedToast(null);
    }, 3500);
  };

  // Conclui o exercício atual, salva o snapshot e avança para o próximo exercício na página dedicada
  const handleFinishAndAdvanceExercise = (exIndex: number) => {
    handleFinishAndCollapseExercise(exIndex);
    if (session && exIndex < session.exercises.length - 1) {
      setFocusedExerciseId(session.exercises[exIndex + 1].exerciseId);
    } else {
      setFocusedExerciseId(null);
    }
  };

  const handleExpandAllExercises = () => {
    if (!session) return;
    const allExp: Record<string, boolean> = {};
    session.exercises.forEach((ex) => {
      allExp[ex.exerciseId] = true;
    });
    setExpandedExerciseIds(allExp);
  };

  const handleCollapseAllExercises = () => {
    setExpandedExerciseIds({});
  };

  const startNewSession = useCallback(
    (prog: WorkoutProgram, split?: WorkoutSplit) => {
      persistStartNewSession(prog, split);
      setIsWorkoutExpanded(true);
      setExpandedExerciseIds({}); // Initially collapsed when new session starts
    },
    [persistStartNewSession]
  );

  // Switch student handler: Always stays on Step 1 ('programas') to display vertical program cards
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const clientWorkouts = workouts.filter((w) => w.clientId === clientId);
    if (clientWorkouts.length > 0) {
      setSelectedProgram(clientWorkouts[0]);
    } else {
      setSelectedProgram(null);
    }
    // Return to programs list when switching student
    setCurrentStep('programas');
  };

  // Switch workout program handler / Open splits (Etapa 1 -> Etapa 2)
  const handleOpenProgramSplits = (prog: WorkoutProgram) => {
    setSelectedProgram(prog);
    onSelectWorkout(prog);
    setCurrentStep('selecao-treino');
  };

  // Switch specific split/treino da semana and load execution page (Etapa 2 -> Etapa 3)
  const handleStartSplitExecution = (prog: WorkoutProgram, split: WorkoutSplit) => {
    setSelectedProgram(prog);
    const newSession = buildSession(prog, split);
    // Explicitly guarantee timer starts at 00:00 awaiting tap on Iniciar Treino
    newSession.isStarted = false;
    newSession.isPaused = false;
    newSession.elapsedSeconds = 0;

    setSession(newSession);
    storage.saveActiveSession(newSession);
    cloudSync.syncActiveSession(newSession);
    setIsWorkoutExpanded(true);
    setExpandedExerciseIds({});
    setCurrentStep('execucao');
  };

  // Quick Starter Workout Generator if student doesn't have one yet
  const handleCreateQuickStarterWorkout = () => {
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return;

    const quickExercises = [
      {
        id: `ex-q1-${Date.now()}`,
        name: 'Supino Reto com Barra',
        muscleGroup: 'Peitoral' as const,
        sets: 3,
        repZone: '10-12',
        restSeconds: 60,
        method: 'Normal',
        observations: 'Manter escápulas aduzidas e respiração coordenada.',
        extraBlocks: [],
      },
      {
        id: `ex-q2-${Date.now()}`,
        name: 'Puxada Frontal Aberta',
        muscleGroup: 'Dorsal' as const,
        sets: 3,
        repZone: '10-12',
        restSeconds: 60,
        method: 'Normal',
        observations: 'Puxar em direção ao peitoral superior com peito aberto.',
        extraBlocks: [],
      },
      {
        id: `ex-q3-${Date.now()}`,
        name: 'Agachamento Livre com Barra',
        muscleGroup: 'Quadríceps' as const,
        sets: 3,
        repZone: '10-12',
        restSeconds: 75,
        method: 'Normal',
        observations: 'Base firme e amplitude até 90 graus.',
        extraBlocks: [],
      },
    ];

    const quickSplit: WorkoutSplit = {
      id: `split-q-${Date.now()}`,
      name: 'Treino A - Adaptação Funcional',
      weekDays: [1, 3, 5],
      exercises: quickExercises,
    };

    const quickProgram: WorkoutProgram = {
      id: `prog-quick-${Date.now()}`,
      clientId: client.id,
      name: `Treino de Adaptação Geral - ${client.name}`,
      goal: 'Adaptação e Condicionamento',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-12-31',
      splits: [quickSplit],
      weekDays: [1, 3, 5],
      exercises: quickExercises,
      createdAt: new Date().toISOString().split('T')[0],
    };

    // Save and immediately start on execution screen
    const allWorkouts = storage.getWorkouts();
    const updated = [quickProgram, ...allWorkouts];
    storage.saveWorkouts(updated);
    cloudSync.syncWorkout(quickProgram);
    onSelectWorkout(quickProgram);
    setSelectedProgram(quickProgram);
    handleStartSplitExecution(quickProgram, quickSplit);
  };

  const isSessionStarted = !!session?.isStarted;
  const isSessionPaused = !!session?.isPaused;
  const hasActiveSession = !!session;

  // Session elapsed timer ticker - only starts when isStarted is true and not paused
  useEffect(() => {
    if (!hasActiveSession || !isSessionStarted || isSessionPaused) return;

    const interval = setInterval(() => {
      setSession((prev) => {
        if (!prev || !prev.isStarted || prev.isPaused) return prev;
        const updated = {
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
        };
        storage.saveActiveSession(updated);
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasActiveSession, isSessionStarted, isSessionPaused, setSession]);

  // Toggle set check status
  const handleToggleSetCheck = (exIndex: number, setIndex: number) => {
    if (!session) return;

    const currentEx = session.exercises[exIndex];
    const currentSet = currentEx.sets[setIndex];
    const willBeCompleted = !currentSet.completed;

    const updatedExercises = [...session.exercises];
    const updatedSets = [...currentEx.sets];

    updatedSets[setIndex] = {
      ...currentSet,
      completed: willBeCompleted,
      completedAt: willBeCompleted ? new Date().toISOString() : undefined,
    };

    updatedExercises[exIndex] = {
      ...currentEx,
      sets: updatedSets,
    };

    const updatedSession = {
      ...session,
      exercises: updatedExercises,
    };

    setSession(updatedSession);
    storage.saveActiveSession(updatedSession);

    if (willBeCompleted) {
      sounds.playSetCompletedSound();

      // Automatically trigger integrated countdown timer
      const restTime = currentEx.restSeconds || 60;
      setTimerSeconds(restTime);
      setTimerExerciseName(currentEx.exerciseName);
      setTimerSetNumber(currentSet.setNumber);
      setTimerOpen(true);

      // Record exercise history immediately to LocalStorage se houver carga válida
      if (currentSet.weightKg != null && currentSet.weightKg > 0) {
        storage.recordExerciseHistory(
          currentEx.exerciseName,
          currentSet.weightKg,
          currentSet.completedReps,
          updatedSets.filter((s) => s.completed).length,
          session.clientId
        );
      }
    }
  };

  // Weight adjustment (+ and - with huge touch buttons for gym floor)
  const adjustWeight = (
    exIndex: number,
    setIndex: number,
    delta: number,
    applyToSubsequent = false
  ) => {
    if (!session) return;
    sounds.playTickSound();

    const currentEx = session.exercises[exIndex];
    const updatedSets = [...currentEx.sets];
    const currentWeight = updatedSets[setIndex].weightKg ?? 0;
    const newWeight = Math.max(0, parseFloat((currentWeight + delta).toFixed(1)));

    updatedSets[setIndex] = {
      ...updatedSets[setIndex],
      weightKg: newWeight,
    };

    if (applyToSubsequent) {
      for (let i = setIndex + 1; i < updatedSets.length; i++) {
        if (!updatedSets[i].completed) {
          updatedSets[i].weightKg = newWeight;
        }
      }
    }

    const updatedExercises = [...session.exercises];
    updatedExercises[exIndex] = {
      ...currentEx,
      sets: updatedSets,
    };

    const updatedSession = {
      ...session,
      exercises: updatedExercises,
    };

    setSession(updatedSession);
    storage.saveActiveSession(updatedSession);
  };

  // Direct weight input change (allows null for empty / sem numeração)
  const setWeightDirect = (exIndex: number, setIndex: number, value: number | null) => {
    if (!session) return;
    const currentEx = session.exercises[exIndex];
    const updatedSets = [...currentEx.sets];
    updatedSets[setIndex] = {
      ...updatedSets[setIndex],
      weightKg: value != null ? Math.max(0, value) : null,
    };

    const updatedExercises = [...session.exercises];
    updatedExercises[exIndex] = {
      ...currentEx,
      sets: updatedSets,
    };

    const updatedSession = {
      ...session,
      exercises: updatedExercises,
    };

    setSession(updatedSession);
    storage.saveActiveSession(updatedSession);
  };

  // Helper to copy weight of set 1 to all subsequent sets of the exercise
  const handleCopyFirstSetWeightToAll = (exIndex: number) => {
    if (!session) return;
    const ex = session.exercises[exIndex];
    if (!ex || ex.sets.length <= 1) return;
    const firstWeight = ex.sets[0].weightKg;
    if (firstWeight == null) return;

    sounds.playTickSound();
    const updatedSets = ex.sets.map((s, idx) =>
      idx === 0 ? s : { ...s, weightKg: firstWeight }
    );
    const updatedExercises = [...session.exercises];
    updatedExercises[exIndex] = { ...ex, sets: updatedSets };
    const updatedSession = { ...session, exercises: updatedExercises };
    setSession(updatedSession);
    storage.saveActiveSession(updatedSession);
  };

  // Reps adjustment (+ and - touch)
  const adjustReps = (exIndex: number, setIndex: number, delta: number) => {
    if (!session) return;
    sounds.playTickSound();

    const currentEx = session.exercises[exIndex];
    const updatedSets = [...currentEx.sets];
    const newReps = Math.max(1, updatedSets[setIndex].completedReps + delta);

    updatedSets[setIndex] = {
      ...updatedSets[setIndex],
      completedReps: newReps,
    };

    const updatedExercises = [...session.exercises];
    updatedExercises[exIndex] = {
      ...currentEx,
      sets: updatedSets,
    };

    const updatedSession = {
      ...session,
      exercises: updatedExercises,
    };

    setSession(updatedSession);
    storage.saveActiveSession(updatedSession);
  };

  // Toggle subsérie check status
  const handleToggleSubSetCheck = (
    exIndex: number,
    setIndex: number,
    subIndex: number
  ) => {
    if (!session) return;
    const currentEx = session.exercises[exIndex];
    const currentSet = currentEx?.sets[setIndex];
    if (!currentSet || !currentSet.subSets || !currentSet.subSets[subIndex]) return;

    const sub = currentSet.subSets[subIndex];
    const willBeCompleted = !sub.completed;

    if (willBeCompleted) {
      sounds.playSetCompletedSound();
    } else {
      sounds.playTickSound();
    }

    const updatedSubSets = currentSet.subSets.map((s, idx) =>
      idx === subIndex ? { ...s, completed: willBeCompleted } : s
    );

    const updatedSets = currentEx.sets.map((s, idx) =>
      idx === setIndex ? { ...s, subSets: updatedSubSets } : s
    );

    const updatedExercises = session.exercises.map((ex, idx) =>
      idx === exIndex ? { ...ex, sets: updatedSets } : ex
    );

    const updatedSession = { ...session, exercises: updatedExercises };
    setSession(updatedSession);
    storage.saveActiveSession(updatedSession);
  };

  // Adjust subsérie reps
  const handleAdjustSubSetReps = (
    exIndex: number,
    setIndex: number,
    subIndex: number,
    delta: number
  ) => {
    if (!session) return;
    sounds.playTickSound();

    const currentEx = session.exercises[exIndex];
    const currentSet = currentEx?.sets[setIndex];
    if (!currentSet || !currentSet.subSets || !currentSet.subSets[subIndex]) return;

    const updatedSubSets = currentSet.subSets.map((s, idx) =>
      idx === subIndex
        ? { ...s, completedReps: Math.max(1, s.completedReps + delta) }
        : s
    );

    const updatedSets = currentEx.sets.map((s, idx) =>
      idx === setIndex ? { ...s, subSets: updatedSubSets } : s
    );

    const updatedExercises = session.exercises.map((ex, idx) =>
      idx === exIndex ? { ...ex, sets: updatedSets } : ex
    );

    const updatedSession = { ...session, exercises: updatedExercises };
    setSession(updatedSession);
    storage.saveActiveSession(updatedSession);
  };

  // Adjust subsérie weight
  const handleAdjustSubSetWeight = (
    exIndex: number,
    setIndex: number,
    subIndex: number,
    delta: number
  ) => {
    if (!session) return;
    sounds.playTickSound();

    const currentEx = session.exercises[exIndex];
    const currentSet = currentEx?.sets[setIndex];
    if (!currentSet || !currentSet.subSets || !currentSet.subSets[subIndex]) return;

    const updatedSubSets = currentSet.subSets.map((s, idx) =>
      idx === subIndex
        ? { ...s, weightKg: Math.max(0, parseFloat(((s.weightKg || 0) + delta).toFixed(1))) }
        : s
    );

    const updatedSets = currentEx.sets.map((s, idx) =>
      idx === setIndex ? { ...s, subSets: updatedSubSets } : s
    );

    const updatedExercises = session.exercises.map((ex, idx) =>
      idx === exIndex ? { ...ex, sets: updatedSets } : ex
    );

    const updatedSession = { ...session, exercises: updatedExercises };
    setSession(updatedSession);
    storage.saveActiveSession(updatedSession);
  };

  // Direct subsérie weight change (allows null for empty / sem numeração)
  const handleSetSubSetWeightDirect = (
    exIndex: number,
    setIndex: number,
    subIndex: number,
    val: number | null
  ) => {
    if (!session) return;
    const currentEx = session.exercises[exIndex];
    const currentSet = currentEx?.sets[setIndex];
    if (!currentSet || !currentSet.subSets || !currentSet.subSets[subIndex]) return;

    const updatedSubSets = currentSet.subSets.map((s, idx) =>
      idx === subIndex
        ? { ...s, weightKg: val != null ? Math.max(0, val) : null }
        : s
    );

    const updatedSets = currentEx.sets.map((s, idx) =>
      idx === setIndex ? { ...s, subSets: updatedSubSets } : s
    );

    const updatedExercises = session.exercises.map((ex, idx) =>
      idx === exIndex ? { ...ex, sets: updatedSets } : ex
    );

    const updatedSession = { ...session, exercises: updatedExercises };
    setSession(updatedSession);
    storage.saveActiveSession(updatedSession);
  };

  // Workout Notes & Feedback Handler
  const handleUpdateTrainerNotes = (notes: string) => {
    if (!session) return;
    const updated: ActiveWorkoutSession = {
      ...session,
      trainerNotes: notes,
    };
    setSession(updated);
    storage.saveActiveSession(updated);
  };

  // Start Workout Session (starts timer)
  const handleStartWorkout = () => {
    if (!session) return;
    sounds.playTickSound();
    const updated: ActiveWorkoutSession = {
      ...session,
      isStarted: true,
      isPaused: false,
      startTime: new Date().toISOString(),
    };
    setSession(updated);
    storage.saveActiveSession(updated);
  };

  // Finish Workout Session
  const handleFinishWorkout = () => {
    if (!session) return;

    let totalVolumeKg = 0;
    let completedSetsCount = 0;
    let totalSetsCount = 0;

    session.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        totalSetsCount++;
        if (s.completed) {
          completedSetsCount++;
          if (s.weightKg != null && s.weightKg > 0) {
            totalVolumeKg += s.weightKg * s.completedReps;
          }
          if (s.subSets && s.subSets.length > 0) {
            s.subSets.forEach((sub) => {
              if (sub.completed && sub.weightKg != null && sub.weightKg > 0) {
                totalVolumeKg += sub.weightKg * sub.completedReps;
              }
            });
          }
        }
      });
    });

    const mins = Math.floor(session.elapsedSeconds / 60);
    const secs = session.elapsedSeconds % 60;
    const durationStr = `${mins}m ${secs}s`;

    const now = new Date();
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()}`;
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    let cleanProgramName = session.programName || 'Programa de Treino';
    let splitName = 'Treino Realizado';

    if (session.programName.includes('•')) {
      const parts = session.programName.split('•');
      cleanProgramName = parts[0].trim();
      splitName = parts[1].trim();
    } else if (activeWorkout?.splits && activeWorkout.splits.length > 0) {
      splitName = activeWorkout.splits[0].name;
      cleanProgramName = activeWorkout.name;
    }

    const completedExercises: CompletedExerciseRecord[] = session.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      name: ex.exerciseName,
      muscleGroup: ex.muscleGroup,
      method: ex.method,
      observations: ex.observations,
      sets: ex.sets.map((s) => ({
        setNumber: s.setNumber,
        completedReps: s.completedReps,
        weightKg: s.weightKg,
        repZone: s.repZone,
        completed: s.completed,
        method: s.method,
        pse: s.pse ?? null,
        subSets: (s.subSets || []).map((sub) => ({
          subSetNumber: sub.subSetNumber,
          completedReps: sub.completedReps,
          weightKg: sub.weightKg,
          repZone: sub.repZone,
          completed: sub.completed,
          note: sub.note,
        })),
      })),
    }));

    const newRecord: CompletedWorkoutRecord = {
      id: `hist-${crypto.randomUUID()}`,
      clientId: session.clientId,
      clientName: session.clientName,
      programId: session.programId,
      programName: cleanProgramName,
      splitName: splitName,
      date: dateFormatted,
      time: timeFormatted,
      completedAt: now.toISOString(),
      durationSeconds: session.elapsedSeconds,
      durationFormatted: durationStr,
      totalVolumeKg,
      exercises: completedExercises,
      trainerNotes: session.trainerNotes || '',
    };

    storage.saveCompletedWorkout(newRecord);
    cloudSync.syncCompletedWorkout(newRecord);

    const dateIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    setWorkoutSummary({
      totalVolumeKg,
      completedSets: completedSetsCount,
      totalSets: totalSetsCount,
      durationStr,
      trainerNotes: session.trainerNotes || '',
      clientId: session.clientId,
      clientName: session.clientName,
      workoutName: splitName || cleanProgramName,
      dateFormatted,
      dateIso,
      timeFormatted,
    });
    setRegisterInAgendaConfirmed(true);

    setIsFinishedModalOpen(true);

    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#38bdf8', '#fbbf24', '#ffffff'],
      });
    } catch {}

    clearActiveSession();
  };

  // Confirmação final do treino realizado e atualização do status na agenda
  const handleConfirmFinishWorkout = () => {
    if (!workoutSummary) {
      setIsFinishedModalOpen(false);
      return;
    }

    if (registerInAgendaConfirmed) {
      // 1. Invocar callback fornecido pelo container principal (app/page.tsx)
      if (onConfirmWorkoutCompletedInAgenda) {
        onConfirmWorkoutCompletedInAgenda(
          workoutSummary.clientId,
          workoutSummary.clientName,
          workoutSummary.workoutName,
          workoutSummary.dateIso,
          workoutSummary.timeFormatted,
          workoutSummary.trainerNotes
        );
      } else if (onRegisterWorkoutInAgenda) {
        onRegisterWorkoutInAgenda(
          workoutSummary.clientId,
          workoutSummary.clientName,
          workoutSummary.workoutName,
          workoutSummary.dateIso
        );
      }

      // 2. Garantia de persistência direta local e nuvem
      try {
        const currentEvents = storage.getCalendarEvents();
        const existingIdx = currentEvents.findIndex(
          (e) => e.clientId === workoutSummary.clientId && e.date === workoutSummary.dateIso
        );

        let updatedEvents: CalendarEvent[];
        if (existingIdx >= 0) {
          const ex = currentEvents[existingIdx];
          const updated: CalendarEvent = {
            ...ex,
            status: 'realizado',
            title: ex.title || workoutSummary.workoutName,
            notes: workoutSummary.trainerNotes
              ? `${ex.notes ? ex.notes + ' • ' : ''}${workoutSummary.trainerNotes}`
              : ex.notes,
          };
          updatedEvents = [...currentEvents];
          updatedEvents[existingIdx] = updated;
          cloudSync.syncCalendarEvent(updated);
        } else {
          // Verificar se há evento recorrente do aluno para o dia da semana
          const [y, m, d] = workoutSummary.dateIso.split('-').map(Number);
          const dayOfWeek = new Date(y, m - 1, d).getDay();
          const recEvt = currentEvents.find(
            (e) => e.clientId === workoutSummary.clientId && e.recurringDays?.includes(dayOfWeek)
          );

          const startH = workoutSummary.timeFormatted || '07:00';
          const endHourNum = (parseInt(startH.split(':')[0], 10) + 1) % 24;
          const endH = `${String(endHourNum).padStart(2, '0')}:${startH.split(':')[1] || '00'}`;

          const newEvt: CalendarEvent = {
            id: `evt-${Date.now()}`,
            clientId: workoutSummary.clientId,
            clientName: workoutSummary.clientName,
            title: recEvt?.title || workoutSummary.workoutName || 'Treino Realizado',
            date: workoutSummary.dateIso,
            startTime: recEvt?.startTime || startH,
            endTime: recEvt?.endTime || endH,
            status: 'realizado',
            notes: workoutSummary.trainerNotes || 'Treino finalizado na Execução',
          };
          updatedEvents = [newEvt, ...currentEvents];
          cloudSync.syncCalendarEvent(newEvt);
        }

        storage.saveCalendarEvents(updatedEvents);

        // Disparar evento global para re-renderizar a Agenda
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('ironcoach:calendar-updated', {
              detail: { clientId: workoutSummary.clientId, date: workoutSummary.dateIso },
            })
          );
        }
      } catch (err) {
        console.error('Erro ao atualizar status na agenda:', err);
      }
    }

    setIsFinishedModalOpen(false);
    setCurrentStep('programas');
    if (onFinishWorkout) onFinishWorkout();
  };

  // Current selected client details
  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0];
  const studentWorkouts = workouts.filter((w) => w.clientId === selectedClientId);

  const calculateIMC = (w: number, h: number) => {
    if (!w || !h) return null;
    const hM = h / 100;
    return (w / (hM * hM)).toFixed(1);
  };

  const studentIMC = selectedClient ? calculateIMC(selectedClient.weight, selectedClient.height) : null;

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const focusedExerciseIndex = session
    ? session.exercises.findIndex((e) => e.exerciseId === focusedExerciseId)
    : -1;
  const focusedExercise =
    session && focusedExerciseIndex >= 0 ? session.exercises[focusedExerciseIndex] : null;

  return (
    <div className={`space-y-4 ${timerOpen ? 'pb-48' : 'pb-28'}`}>
      {/* Rest Countdown Floating Overlay */}
      <RestCountdownTimer
        key={`${timerExerciseName}-${timerSetNumber}`}
        isOpen={timerOpen}
        initialSeconds={timerSeconds}
        exerciseName={timerExerciseName}
        setNumber={timerSetNumber}
        onClose={() => setTimerOpen(false)}
      />

      <AnimatePresence mode="wait">
        {/* ETAPA 0: SELEÇÃO DE ALUNO (OBRIGATÓRIA AO ENTRAR NA ABA SE SEM TREINO ATIVO) */}
        {currentStep === 'selecao-aluno' && (
          <motion.div
            key="step-selecao-aluno"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Banner se houver treino ativo */}
            {session && session.isStarted && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-950 border border-emerald-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                    <Flame className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-300 block">
                      Treino em Andamento: {session.programName}
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono">
                      Aluno: {session.clientName} • Tempo: {formatElapsed(session.elapsedSeconds)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('execucao')}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Retomar Treino Ativo</span>
                </button>
              </div>
            )}

            {/* Cabeçalho da Seleção de Aluno */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <User className="w-5 h-5" />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Selecione um Aluno para Iniciar
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Escolha o aluno abaixo para visualizar seus programas de treino e iniciar a sessão.
                  </p>
                </div>

                <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 self-start sm:self-auto">
                  {clients.length} aluno{clients.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Lista de Alunos */}
            {clients.length === 0 ? (
              <div className="p-8 sm:p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-4 my-2 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <User className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-white">
                    Nenhum aluno cadastrado no momento
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Para prescrever fichas e executar treinos em tempo real, cadastre seu primeiro aluno no sistema.
                  </p>
                </div>
                {onNavigateToClients && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onNavigateToClients}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 active:scale-95 transition cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Cadastrar Primeiro Aluno</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {clients.map((client) => {
                  const clientWorkouts = workouts.filter((w) => w.clientId === client.id);
                  const imcVal = calculateIMC(client.weight, client.height);

                  return (
                    <div
                      key={client.id}
                      onClick={() => handleSelectClient(client.id)}
                      className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/70 shadow-lg cursor-pointer transition-all duration-200 group active:scale-[0.99] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-base flex items-center justify-center shadow-md shrink-0">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm sm:text-base font-black text-white group-hover:text-emerald-300 transition truncate">
                              {client.name}
                            </h4>
                            <p className="text-xs text-slate-400 truncate">
                              Plano: <strong className="text-slate-200">{client.contractType}</strong>
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-[11px] font-bold text-emerald-400 shrink-0">
                          {clientWorkouts.length} programa{clientWorkouts.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80 text-[11px] text-slate-400 flex-wrap">
                        {client.weight > 0 && (
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                            Peso: <strong className="text-white">{client.weight} kg</strong>
                          </span>
                        )}
                        {client.height > 0 && (
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                            Altura: <strong className="text-white">{client.height} cm</strong>
                          </span>
                        )}
                        {imcVal && (
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                            IMC: <strong className="text-emerald-400">{imcVal}</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400 group-hover:text-emerald-300 font-semibold transition">
                          Selecionar Aluno ➔
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ETAPA 1: PROGRAMAS DE TREINO (LISTA VERTICAL COMPLETA) */}
        {currentStep === 'programas' && (
          <motion.div
            key="step-programas"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Top Bar com Botão Trocar Aluno */}
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl">
              <button
                type="button"
                onClick={() => setCurrentStep('selecao-aluno')}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 active:scale-95 transition cursor-pointer"
                title="Voltar para a seleção de alunos"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span>Trocar Aluno</span>
              </button>

              <div className="text-right min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block truncate">
                  Aluno Selecionado
                </span>
                <span className="text-xs sm:text-sm font-black text-white block truncate">
                  {selectedClient?.name || 'Aluno'}
                </span>
              </div>
            </div>



            {/* Banner de Treino em Andamento se houver sessão ativa iniciada */}
            {session && session.isStarted && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-950 border border-emerald-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                    <Flame className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-300 block">
                      Treino em Andamento: {session.programName}
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono">
                      Aluno: {session.clientName} • Tempo: {formatElapsed(session.elapsedSeconds)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep('execucao')}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Continuar Treino Ativo</span>
                </button>
              </div>
            )}

            {/* Cabeçalho da Lista Vertical de Programas */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">
                  Programas de Treino do Aluno ({studentWorkouts.length})
                </h3>
              </div>

              {onNavigateToCreateWorkout && (
                <button
                  type="button"
                  onClick={() => onNavigateToCreateWorkout(selectedClientId)}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 active:scale-95 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 transition"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  <span>Prescrever Novo</span>
                </button>
              )}
            </div>

            {/* Se o aluno não tiver programas prescritos */}
            {studentWorkouts.length === 0 ? (
              <div className="p-8 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-4 my-2">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                  <Dumbbell className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-black text-white">
                    Nenhum Programa Prescrito para {selectedClient?.name || 'este Aluno'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Prescreva um programa na aba &ldquo;Criar Treino&rdquo; ou inicie com um protocolo rápido de adaptação muscular com 1 toque.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleCreateQuickStarterWorkout}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Gerar Treino de Adaptação Imediato</span>
                  </button>

                  {onNavigateToCreateWorkout && (
                    <button
                      onClick={() => onNavigateToCreateWorkout(selectedClientId)}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 active:scale-95 transition flex items-center justify-center gap-2"
                    >
                      <FilePlus className="w-4 h-4 text-cyan-400" />
                      <span>Montar Ficha Completa na Seção &ldquo;Criar Treino&rdquo;</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* CARDS VERTICAIS DOS PROGRAMAS DE TREINO */
              <div className="space-y-3.5">
                {studentWorkouts.map((prog) => {
                  const splits =
                    prog.splits && prog.splits.length > 0
                      ? prog.splits
                      : [
                          {
                            id: prog.id,
                            name: prog.name,
                            weekDays: prog.weekDays || [],
                            exercises: prog.exercises || [],
                          },
                        ];
                  const splitsCount = splits.length;
                  const totalExercises = splits.reduce(
                    (sum, s) => sum + (s.exercises?.length || 0),
                    0
                  );

                  return (
                    <div
                      key={prog.id}
                      onClick={() => handleOpenProgramSplits(prog)}
                      className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/60 shadow-lg hover:shadow-emerald-950/20 cursor-pointer transition-all duration-200 group active:scale-[0.99] space-y-3.5"
                    >
                      {/* Top Row: Nome do programa e contagem de divisões */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                            <h3 className="text-base sm:text-lg font-black text-white group-hover:text-emerald-300 transition">
                              {prog.name}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-400 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>
                              Objetivo:{' '}
                              <strong className="text-slate-200">
                                {prog.goal || 'Hipertrofia e Condicionamento'}
                              </strong>
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-bold text-slate-200">
                            {splitsCount} {splitsCount === 1 ? 'Treino' : 'Divisões (Splits)'}
                          </span>
                        </div>
                      </div>

                      {/* Informações Obrigatórias: Dias dos Treinos e Vigência */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20">
                            <CalendarIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Dias dos Treinos
                            </span>
                            <span className="font-bold text-white truncate block">
                              {formatProgramDays(prog)}
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Vigência do Programa
                            </span>
                            <span className="font-bold text-slate-200 truncate block">
                              {formatVigencia(prog.startDate, prog.endDate)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer do Card com splits prévias e botão de ação */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-1 gap-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {splits.map((s, idx) => (
                            <span
                              key={s.id || idx}
                              className="px-2 py-0.5 rounded-lg bg-slate-800/60 border border-slate-700/40 text-[11px] font-semibold text-slate-300"
                            >
                              {s.name}
                            </span>
                          ))}
                          <span className="text-[11px] text-slate-400">
                            • {totalExercises} exercício{totalExercises === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 group-hover:from-emerald-500 group-hover:to-teal-500 text-white font-bold text-xs shadow-md shrink-0 transition">
                          <span>Ver Treinos deste Programa</span>
                          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ETAPA 2: SELEÇÃO DO TREINO A SER EXECUTADO */}
        {currentStep === 'selecao-treino' && (
          <motion.div
            key="step-selecao-treino"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Top Bar com Botão Voltar aos Programas */}
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl">
              <button
                type="button"
                onClick={() => setCurrentStep('programas')}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 active:scale-95 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span>Voltar aos Programas</span>
              </button>

              <div className="text-right min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block truncate">
                  Aluno: {selectedClient?.name}
                </span>
                <span className="text-xs sm:text-sm font-black text-white block truncate">
                  {selectedProgram?.name || 'Programa de Treino'}
                </span>
              </div>
            </div>

            {/* Card Resumo do Programa Selecionado */}
            {selectedProgram && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">
                      Objetivo:{' '}
                      <strong className="text-white">
                        {selectedProgram.goal || 'Hipertrofia e Condicionamento'}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>
                      Vigência:{' '}
                      <strong className="text-slate-200">
                        {formatVigencia(selectedProgram.startDate, selectedProgram.endDate)}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Título da Seleção do Treino */}
            <div className="px-1 space-y-0.5">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Qual treino será executado hoje?</span>
              </h3>
              <p className="text-xs text-slate-400">
                Selecione a divisão/split para abrir o treino pronto com o cronômetro aguardando o início.
              </p>
            </div>

            {/* Lista de Splits / Treinos Disponíveis */}
            {(() => {
              if (!selectedProgram) {
                return (
                  <div className="p-6 text-center rounded-2xl bg-slate-900 border border-slate-800">
                    <p className="text-xs text-slate-400">Nenhum programa selecionado.</p>
                  </div>
                );
              }

              const splitsToDisplay: WorkoutSplit[] =
                selectedProgram.splits && selectedProgram.splits.length > 0
                  ? selectedProgram.splits
                  : [
                      {
                        id: selectedProgram.id,
                        name: selectedProgram.name,
                        weekDays: selectedProgram.weekDays || [],
                        exercises: selectedProgram.exercises || [],
                      },
                    ];

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {splitsToDisplay.map((split) => {
                    const splitDays = (split.weekDays || [])
                      .map((d) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d])
                      .join(', ');
                    const exCount = split.exercises?.length || 0;

                    return (
                      <div
                        key={split.id}
                        onClick={() =>
                          handleStartSplitExecution(selectedProgram, split as WorkoutSplit)
                        }
                        className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 hover:border-cyan-500/70 shadow-lg cursor-pointer transition-all duration-200 group active:scale-[0.99] space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                              <h4 className="text-base sm:text-lg font-black text-white group-hover:text-cyan-300 transition">
                                {split.name}
                              </h4>
                            </div>
                            <p className="text-xs text-cyan-400 font-semibold flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5" />
                              <span>Dias recomendados: {splitDays || 'Dias flexíveis'}</span>
                            </p>
                          </div>

                          <span className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-bold text-slate-200">
                            {exCount} exercício{exCount === 1 ? '' : 's'}
                          </span>
                        </div>

                        {/* Preview de exercícios do split */}
                        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Exercícios previstos neste treino:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {split.exercises?.slice(0, 5).map((ex, i) => (
                              <span
                                key={ex.id || i}
                                className="px-2 py-0.5 rounded-md bg-slate-900 text-[11px] text-slate-300 border border-slate-800"
                              >
                                {ex.name}
                              </span>
                            ))}
                            {exCount > 5 && (
                              <span className="text-[11px] text-slate-500 font-semibold self-center">
                                +{exCount - 5} outros
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-1 gap-2">
                          <span className="text-[11px] text-slate-400 font-medium">
                            Toque para carregar o treino pronto com cronômetro.
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartSplitExecution(selectedProgram, split as WorkoutSplit);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-2 group-hover:scale-105 transition cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-slate-950" />
                            <span>Selecionar este Treino</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* ETAPA 3: TELA DE EXECUÇÃO PRONTA (OCULTA ATÉ ESCOLHA DO TREINO) */}
        {currentStep === 'execucao' && (
          <motion.div
            key="step-execucao"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Top Bar de Execução com Botão Voltar ao Topo */}
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl">
              <button
                type="button"
                onClick={() => setCurrentStep('selecao-treino')}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 active:scale-95 transition cursor-pointer"
                title="Voltar para a seleção de treinos deste programa"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span>Voltar aos Treinos</span>
              </button>

              <div className="text-center min-w-0 flex-1 px-2">
                <span className="text-sm sm:text-base font-black text-white block truncate">
                  {session ? getWorkoutDisplayName(session.programName) : 'Treino Preparado'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep('programas')}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700/60 active:scale-95 transition hidden sm:flex items-center gap-1.5 cursor-pointer"
                title="Ver lista de programas do aluno"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Programas</span>
              </button>
            </div>

            {!session ? (
              <div className="p-8 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <p className="text-xs text-slate-400">Nenhum treino carregado na sessão.</p>
                <button
                  type="button"
                  onClick={() => setCurrentStep('programas')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                >
                  Ver Programas do Aluno
                </button>
              </div>
            ) : focusedExercise ? (
              <ExerciseDedicatedPageView
                session={session}
                focusedExercise={focusedExercise}
                focusedExerciseIndex={focusedExerciseIndex}
                onSelectExercise={(id) => setFocusedExerciseId(id)}
                onBackToList={() => setFocusedExerciseId(null)}
                onToggleSetCheck={handleToggleSetCheck}
                onAdjustReps={adjustReps}
                onSetWeightDirect={setWeightDirect}
                onAdjustWeight={adjustWeight}
                onOpenPseModal={handleOpenPseModal}
                onOpenSeriesHistory={handleOpenSeriesHistory}
                onToggleSubSetCheck={handleToggleSubSetCheck}
                onAdjustSubSetReps={handleAdjustSubSetReps}
                onSetSubSetWeightDirect={handleSetSubSetWeightDirect}
                onTriggerRestTimer={(secs, name, setNum) => {
                  setTimerSeconds(secs);
                  setTimerExerciseName(name);
                  setTimerSetNumber(setNum);
                  setTimerOpen(true);
                }}
                onFinishAndAdvance={handleFinishAndAdvanceExercise}
                onFinishWorkout={handleFinishWorkout}
                onCopyFirstSetWeightToAll={handleCopyFirstSetWeightToAll}
                isSessionStarted={isSessionStarted}
                isSessionPaused={isSessionPaused}
                onStartWorkout={handleStartWorkout}
                onTogglePause={() => {
                  const updated = { ...session, isPaused: !session.isPaused };
                  setSession(updated);
                  storage.saveActiveSession(updated);
                }}
                elapsedSeconds={session.elapsedSeconds}
                formatElapsed={formatElapsed}
              />
            ) : (
              <div className="space-y-4">

                {/* Active Workout Progress Bar (Clean & Focused) */}
                {(() => {
            const totalCompletedSets = session.exercises.reduce(
              (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
              0
            );
            const totalSets = session.exercises.reduce(
              (sum, ex) => sum + ex.sets.length,
              0
            );
            const progressPercent = totalSets > 0 ? Math.round((totalCompletedSets / totalSets) * 100) : 0;

            return (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Progresso do Treino</span>
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-emerald-400">
                        {totalCompletedSets}
                      </span>
                      <span className="text-sm text-slate-400 font-bold">/ {totalSets} séries</span>
                      <span className="text-xs text-slate-500 font-semibold">
                        ({progressPercent}% concluído)
                      </span>
                    </div>
                  </div>

                  {/* Botão de Iniciar Treino ou Indicador de Tempo */}
                  {!session.isStarted ? (
                    <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs font-bold text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>00:00</span>
                        <span className="text-[10px] text-slate-500 font-sans font-normal">(Aguardando)</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleStartWorkout}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs shadow-lg shadow-emerald-950/50 transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                        title="Clique para iniciar o treino e começar a contagem do tempo"
                      >
                        <Play className="w-4 h-4 fill-slate-950" />
                        <span>Iniciar Treino</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...session, isPaused: !session.isPaused };
                          setSession(updated);
                          storage.saveActiveSession(updated);
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs active:scale-95 touch-manipulation cursor-pointer"
                        title={session.isPaused ? 'Retomar Treino' : 'Pausar Cronômetro'}
                      >
                        {session.isPaused ? (
                          <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                        ) : (
                          <Pause className="w-4 h-4 text-amber-400 fill-amber-400" />
                        )}
                      </button>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/40 font-mono text-xs font-bold text-emerald-400">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{formatElapsed(session.elapsedSeconds)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* OPÇÃO DE VISUALIZAÇÃO DA EXECUÇÃO: PÁGINA DEDICADA VS LISTA EM ACORDEÃO */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <LayoutList className="w-4 h-4 text-emerald-400" />
                  <span>Opção de Visualização na Execução</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {exerciseViewMode === 'pagina' ? 'Página Dedicada Ativa' : 'Acordeão Ativo'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {exerciseViewMode === 'pagina'
                  ? 'Ao selecionar o exercício, uma nova página é aberta com todas as informações e controles ampliados.'
                  : 'Os exercícios são expandidos diretamente nesta lista vertical em formato de acordeão.'}
              </p>
            </div>

            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 shrink-0 self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => handleSetExerciseViewMode('pagina')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  exerciseViewMode === 'pagina'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Abrir o exercício selecionado em uma página dedicada com todas as informações"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Página Dedicada</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetExerciseViewMode('lista')}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  exerciseViewMode === 'lista'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Expandir exercícios diretamente na lista em formato de acordeão"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Lista em Acordeão</span>
              </button>
            </div>
          </div>

          {/* HEADER DA LISTA DE EXERCÍCIOS: INDICAÇÃO E BOTÕES EXPANDIR/RECOLHER */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black text-slate-200 uppercase tracking-wider">
                Exercícios do Treino ({session.exercises.length})
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                • Toque no exercício para expandir e registrar suas séries
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExpandAllExercises}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-300 hover:text-white transition active:scale-95"
                title="Expandir todos os exercícios"
              >
                Expandir Todos
              </button>
              <button
                type="button"
                onClick={handleCollapseAllExercises}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-300 hover:text-white transition active:scale-95"
                title="Recolher todos os exercícios"
              >
                Recolher Todos
              </button>
            </div>
          </div>

          {/* EXERCISE LIST - EXPANDABLE CARDS (INICIALMENTE RECOLHIDOS) */}
          <div className="space-y-3">
            {session.exercises.map((ex, exIndex) => {
              const isExpanded = !!expandedExerciseIds[ex.exerciseId];
              const completedInThisEx = ex.sets.filter((s) => s.completed).length;
              const isAllSetsCompleted =
                ex.sets.length > 0 && completedInThisEx === ex.sets.length;

              return (
                <div
                  key={ex.exerciseId}
                  className={`rounded-2xl border transition-all duration-200 shadow-md overflow-hidden ${
                    isExpanded
                      ? 'bg-slate-900 border-cyan-500/60 ring-1 ring-cyan-500/30 shadow-cyan-950/20'
                      : isAllSetsCompleted
                      ? 'bg-slate-900/80 border-emerald-500/50 hover:border-emerald-400/70'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* RECOLHIDO: EXIBE APENAS O NOME DO EXERCÍCIO COM INDICADOR DE EXPANSÃO / ABRIR PÁGINA */}
                  {!isExpanded ? (
                    <div
                      onClick={() => handleSelectExercise(ex.exerciseId)}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/50 transition group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center flex-shrink-0 border transition ${
                            isAllSetsCompleted
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700 group-hover:border-slate-600'
                          }`}
                        >
                          {exIndex + 1}
                        </span>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-sm sm:text-base text-white truncate group-hover:text-cyan-300 transition">
                              {ex.exerciseName}
                            </h4>
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold text-[10px] border border-slate-700">
                              {ex.muscleGroup}
                            </span>
                            {ex.combinationGroupId && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/40 flex items-center gap-1">
                                <Link2 className="w-3 h-3 text-purple-400" />
                                <span>
                                  {ex.combinationLabel || 'Combinado'} ({ex.combinationOrder || 1}º)
                                </span>
                              </span>
                            )}
                            {ex.method && ex.method !== 'Normal' && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-extrabold text-[10px] border border-amber-500/30">
                                {ex.method}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-xs font-mono font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                            isAllSetsCompleted
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {isAllSetsCompleted && (
                            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                          )}
                          <span>
                            {completedInThisEx}/{ex.sets.length} séries
                          </span>
                        </span>

                        {exerciseViewMode === 'pagina' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFocusedExerciseId(ex.exerciseId);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95 transition cursor-pointer"
                            title="Abrir página dedicada com todas as informações deste exercício"
                          >
                            <span>Executar</span>
                            <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFocusedExerciseId(ex.exerciseId);
                              }}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700 text-xs transition active:scale-95 cursor-pointer"
                              title="Abrir este exercício em página dedicada com todas as informações"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleExerciseExpand(ex.exerciseId);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700 active:scale-95 transition shadow-sm cursor-pointer"
                            >
                              <span>Expandir</span>
                              <ChevronDown className="w-4 h-4 text-cyan-400" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* EXPANDIDO: VISUALIZAÇÃO COMPLETA DO EXERCÍCIO E SUAS SÉRIES */
                    <div className="p-4 space-y-3.5">
                      {/* Card Header: Exercise Name, Muscle Group, Method, Observations & Collapse button */}
                      <div className="space-y-2 border-b border-slate-800/80 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 font-black text-xs flex items-center justify-center border border-emerald-500/20">
                                {exIndex + 1}
                              </span>
                              <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                                <span>{ex.exerciseName}</span>
                              </h3>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                                {ex.muscleGroup}
                              </span>
                              {ex.combinationGroupId && (
                                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40 flex items-center gap-1">
                                  <Link2 className="w-3 h-3 text-purple-400" />
                                  <span>
                                    {ex.combinationLabel || 'Combinado'} ({ex.combinationOrder || 1}º em sequência contínua)
                                  </span>
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/30">
                                {ex.method}
                              </span>
                              <span className="text-slate-400 font-mono text-[11px]">
                                Descanso: {ex.restSeconds}s
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`text-xs font-mono font-bold px-2 py-1 rounded-xl ${
                                isAllSetsCompleted
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {completedInThisEx}/{ex.sets.length} séries
                            </span>

                            <button
                              type="button"
                              onClick={() => setFocusedExerciseId(ex.exerciseId)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                              title="Abrir este exercício em uma página dedicada com todas as informações"
                            >
                              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="hidden sm:inline">Página Completa</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleExerciseExpand(ex.exerciseId)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                              title="Recolher exercício"
                            >
                              <ChevronUp className="w-4 h-4 text-cyan-400" />
                              <span>Recolher</span>
                            </button>
                          </div>
                        </div>

                        {ex.observations && (
                          <p className="text-xs text-slate-400 italic bg-slate-950/50 p-2 rounded-xl border border-slate-800/60">
                            &ldquo;{ex.observations}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* LISTA DE SÉRIES COM COLUNAS NÍTIDAS E BOTÕES GIGANTES */}
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-12 gap-1.5 text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider items-center">
                          <span className="col-span-2 text-center">Série</span>
                          <span className="col-span-3 text-center">Reps (Alvo)</span>
                          <span className="col-span-3 text-center">Carga (KG)</span>
                          <span className="col-span-2 text-center text-amber-400">PSE</span>
                          <span className="col-span-2 text-center">Check</span>
                        </div>

                        {ex.sets.map((set, setIndex) => {
                          const hasSubsets = set.subSets && set.subSets.length > 0;
                          const pseInfo = getPseInfo(set.pse);

                          return (
                            <div key={set.setNumber} className="space-y-1.5">
                              {/* Linha da Série Principal */}
                              <div
                                className={`grid grid-cols-12 gap-1.5 items-center p-2 rounded-xl transition-all duration-150 ${
                                  set.completed
                                    ? 'bg-emerald-950/30 border border-emerald-500/40 shadow-sm'
                                    : 'bg-slate-950/70 border border-slate-800/80 hover:border-slate-700'
                                }`}
                              >
                                {/* Col 1: Set Number + Ícone de Evolução da Série */}
                                 <div className="col-span-2 flex flex-col items-center justify-center">
                                  <div className="w-full sm:w-[69px] flex items-center justify-center gap-1 sm:gap-0">
                                    <span
                                      className={`w-[22px] h-7 sm:w-6 sm:h-6 rounded-lg font-black text-[10px] sm:text-[11px] flex items-center justify-center shrink-0 ${
                                        set.completed
                                          ? 'bg-emerald-500 text-slate-950'
                                          : 'bg-slate-800 text-slate-200'
                                      }`}
                                      title={`Série ${set.setNumber}`}
                                    >
                                      {set.setNumber}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenSeriesHistory(
                                          ex.exerciseName,
                                          set.setNumber,
                                          ex.sets.length
                                        )
                                      }
                                      className="w-[22px] h-7 sm:w-6 sm:h-6 sm:ml-3 px-0 shrink-0 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 flex items-center justify-center transition active:scale-90"
                                      title={`Ver página de evolução da Série #${set.setNumber}`}
                                    >
                                      <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </button>
                                  </div>
                                  {set.extraVariation ? (
                                    <span
                                      className="text-[9px] font-bold text-amber-400 block mt-0.5 truncate max-w-[65px]"
                                      title={set.extraVariation}
                                    >
                                      {set.extraVariation.split(' • ')[0]}
                                    </span>
                                  ) : set.method && set.method !== 'Normal' ? (
                                    <span
                                      className="text-[9px] font-bold text-amber-400 block mt-0.5 truncate max-w-[65px]"
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
                                    onClick={() => adjustReps(exIndex, setIndex, -1)}
                                    className="w-7 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-sm flex items-center justify-center active:scale-90 transition touch-manipulation"
                                    title="-1 repetição"
                                  >
                                    -
                                  </button>
                                  <div className="text-center min-w-[34px]">
                                    <span className="text-sm font-black text-white font-mono block">
                                      {set.completedReps}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-semibold block">
                                      {set.repZone}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => adjustReps(exIndex, setIndex, +1)}
                                    className="w-7 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-sm flex items-center justify-center active:scale-90 transition touch-manipulation"
                                    title="+1 repetição"
                                  >
                                    +
                                  </button>
                                </div>

                                {/* Col 3: Carga (KG) */}
                                <div className="col-span-3 flex items-center justify-center">
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
                                          setWeightDirect(exIndex, setIndex, null);
                                        } else {
                                          const parsed = parseFloat(raw);
                                          setWeightDirect(
                                            exIndex,
                                            setIndex,
                                            isNaN(parsed) ? null : Math.max(0, parsed)
                                          );
                                        }
                                      }}
                                      className="h-[38px] w-[50px] mx-0 text-center p-0 font-mono font-black text-sm sm:text-base text-emerald-400 bg-slate-900 border border-slate-700/80 rounded-xl focus:outline-none focus:border-emerald-500 shadow-inner placeholder:text-slate-600"
                                    />
                                  </div>
                                </div>

                                {/* Col 4: PSE (0 a 10) com Cores de Intensidade */}
                                <div className="col-span-2 flex items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenPseModal(
                                        exIndex,
                                        setIndex,
                                        set.pse,
                                        ex.exerciseName,
                                        set.setNumber
                                      )
                                    }
                                    className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all duration-150 active:scale-90 touch-manipulation border shadow-sm group ${
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

                                {/* Col 5: Botão de Check List Lateral */}
                                <div className="col-span-2 flex justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSetCheck(exIndex, setIndex)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all duration-150 active:scale-90 touch-manipulation ${
                                      set.completed
                                        ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400 shadow-emerald-500/40'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                                    }`}
                                    title={set.completed ? 'Desmarcar série' : 'Concluir série e iniciar descanso'}
                                  >
                                    <Check
                                      className={`w-5 h-5 stroke-[3] transition-transform ${
                                        set.completed ? 'scale-110' : 'opacity-40'
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>

                              {/* Subséries Vinculadas ao Método Avançado */}
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
                                      {/* Col 1: Subsérie label */}
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

                                      {/* Col 2: Reps Stepper */}
                                      <div className="col-span-3 flex items-center justify-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleAdjustSubSetReps(exIndex, setIndex, subIdx, -1)
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
                                            handleAdjustSubSetReps(exIndex, setIndex, subIdx, +1)
                                          }
                                          className="w-6 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs flex items-center justify-center active:scale-90"
                                        >
                                          +
                                        </button>
                                      </div>

                                      {/* Col 3: Carga (kg) */}
                                      <div className="col-span-3 flex items-center justify-center">
                                        <div className="relative flex justify-center text-center">
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            pattern="[0-9]*[.,]?[0-9]*"
                                            placeholder="—"
                                            value={sub.weightKg != null && !isNaN(Number(sub.weightKg)) ? sub.weightKg : ''}
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
                                                handleSetSubSetWeightDirect(exIndex, setIndex, subIdx, null);
                                              } else {
                                                const parsed = parseFloat(raw);
                                                handleSetSubSetWeightDirect(
                                                  exIndex,
                                                  setIndex,
                                                  subIdx,
                                                  isNaN(parsed) ? null : Math.max(0, parsed)
                                                );
                                              }
                                            }}
                                            className="h-[34px] w-[50px] mx-0 text-center p-0 font-mono font-black text-xs text-purple-300 bg-slate-900 border border-slate-700/80 rounded-xl focus:outline-none focus:border-purple-500 shadow-inner placeholder:text-slate-600"
                                          />
                                        </div>
                                      </div>

                                      {/* Col 4: PSE Placeholder na subsérie */}
                                      <div className="col-span-2 flex items-center justify-center">
                                        <span className="text-slate-700 text-xs font-mono font-bold">—</span>
                                      </div>

                                      {/* Col 5: Check subsérie */}
                                      <div className="col-span-2 flex justify-center">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleToggleSubSetCheck(exIndex, setIndex, subIdx)
                                          }
                                          className={`w-9 h-9 rounded-xl flex items-center justify-center shadow transition-all active:scale-90 ${
                                            sub.completed
                                              ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                                              : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                                          }`}
                                          title={
                                            sub.completed
                                              ? 'Desmarcar subsérie'
                                              : 'Concluir subsérie'
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

                      {/* Footer do Exercício Expandido com botão de recolher */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <span className="text-[11px] text-slate-400">
                          {isAllSetsCompleted
                            ? '✓ Todas as séries deste exercício concluídas'
                            : `Faltam ${ex.sets.length - completedInThisEx} série(s) para concluir`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleFinishAndCollapseExercise(exIndex)}
                          className="text-xs font-bold text-white flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 shadow-md shadow-emerald-950/40 transition active:scale-95"
                          title="Concluir exercício, gravar séries no histórico de evolução e recolher"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Concluir e Recolher</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* CAMPO DE NOTAS DO TREINO & FEEDBACK TÉCNICO DO TREINADOR */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <PenLine className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-extrabold text-white">
                      Notas do Treino & Feedback Técnico
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Salvo em tempo real
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Registre correções biomecânicas, postura, amplitude e feedbacks específicos para o aluno.
                  </p>
                </div>
              </div>

              {session.trainerNotes && (
                <button
                  type="button"
                  onClick={() => handleUpdateTrainerNotes('')}
                  className="text-[11px] text-slate-400 hover:text-rose-400 self-start sm:self-center flex items-center gap-1 transition"
                  title="Limpar notas"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar</span>
                </button>
              )}
            </div>

            {/* Textarea de Notas do Treinador */}
            <div className="space-y-1">
              <textarea
                value={session.trainerNotes || ''}
                onChange={(e) => handleUpdateTrainerNotes(e.target.value)}
                placeholder="Ex: No supino, fechar pegada em 2cm para proteger o ombro. No agachamento, manteve profundidade perfeita. Aluno sentiu bom estímulo no quadríceps..."
                rows={3}
                className="w-full p-3 text-xs sm:text-sm text-white bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 placeholder:text-slate-500 transition resize-y min-h-[80px]"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500 px-1">
                <span>Ficará arquivado permanentemente no histórico de treinos do aluno.</span>
                <span>{(session.trainerNotes || '').length} caracteres</span>
              </div>
            </div>
          </div>

          {/* BOTÃO DE FINALIZAR TREINO (APARECE APÓS O ÚLTIMO EXERCÍCIO) */}
          {(() => {
            const totalCompletedSets = session.exercises.reduce(
              (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
              0
            );
            const totalSets = session.exercises.reduce(
              (sum, ex) => sum + ex.sets.length,
              0
            );
            const allCompleted = totalSets > 0 && totalCompletedSets === totalSets;

            return (
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </span>
                      <h4 className="text-base font-extrabold text-white">
                        Finalizar Treino
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      {allCompleted
                        ? '🎉 Parabéns! Todas as séries programadas foram concluídas.'
                        : `${totalCompletedSets} de ${totalSets} séries concluídas. Clique no botão ao lado para concluir a sessão.`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleFinishWorkout}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-sm shadow-lg shadow-emerald-950/60 transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation flex-shrink-0"
                  >
                    <CheckCircle2 className="w-5 h-5 fill-slate-950 text-emerald-400" />
                    <span>Finalizar Treino</span>
                  </button>
                </div>
              </div>
            );
          })()}
              </div>
            )}
        </motion.div>
      )}
    </AnimatePresence>

      {/* WORKOUT FINISHED CELEBRATION MODAL */}
      {isFinishedModalOpen && workoutSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-emerald-500/50 p-6 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border-2 border-emerald-400 animate-bounce">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">Treino Concluído!</h3>
              <p className="text-xs text-slate-300">
                Excelente trabalho com o aluno <strong className="text-emerald-400">{session?.clientName || selectedClient?.name}</strong>!
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-2 text-center pt-2">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Tempo Total
                </span>
                <span className="text-base font-black text-white block mt-0.5 font-mono">
                  {workoutSummary.durationStr}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Séries Cumpridas
                </span>
                <span className="text-base font-black text-emerald-400 block mt-0.5">
                  {workoutSummary.completedSets} / {workoutSummary.totalSets}
                </span>
              </div>

              <div className="col-span-2 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-950 border border-emerald-500/30">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Tonelagem Total Levantada
                </span>
                <span className="text-2xl font-black text-white block mt-0.5">
                  {workoutSummary.totalVolumeKg.toLocaleString('pt-BR')} <span className="text-sm font-bold text-emerald-400">kg</span>
                </span>
              </div>

              {workoutSummary.trainerNotes && (
                <div className="col-span-2 p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-left space-y-1">
                  <span className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1">
                    <PenLine className="w-3 h-3" />
                    Feedback Técnico do Treinador Registrado:
                  </span>
                  <p className="text-xs text-slate-200 italic pl-1">
                    &ldquo;{workoutSummary.trainerNotes}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Confirmação de Treino Realizado na Agenda */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                      registerInAgendaConfirmed
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white leading-tight">
                      Confirmação na Agenda
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      Mudar status para <span className="text-emerald-400 font-bold">&quot;Realizado&quot;</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setRegisterInAgendaConfirmed(!registerInAgendaConfirmed)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    registerInAgendaConfirmed ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={registerInAgendaConfirmed}
                  title="Alternar confirmação de status na agenda"
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      registerInAgendaConfirmed ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {registerInAgendaConfirmed ? (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 font-semibold animate-in fade-in duration-150">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    Agenda: <strong className="text-white">{workoutSummary.clientName}</strong> em <strong className="text-white">{workoutSummary.dateFormatted}</strong> ✓
                  </span>
                </div>
              ) : (
                <div className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                  O status do compromisso não será alterado na agenda.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfirmFinishWorkout}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-950/50 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Concluir e Salvar no Histórico</span>
            </button>
          </div>
        </div>
      )}

      {/* 1 - PÁGINA / MODAL DE EVOLUÇÃO POR SÉRIE (Requisitos 1, 1.1, 1.2, 1.3, 1.4) */}
      {seriesHistoryModal && seriesHistoryModal.isOpen && (
        <SeriesHistoryModal
          isOpen={seriesHistoryModal.isOpen}
          onClose={() => setSeriesHistoryModal(null)}
          exerciseName={seriesHistoryModal.exerciseName}
          setNumber={seriesHistoryModal.setNumber}
          totalSets={seriesHistoryModal.totalSets}
          clientId={session?.clientId}
          onSelectSetNumber={(newNum) => {
            setSeriesHistoryModal((prev) =>
              prev ? { ...prev, setNumber: newNum } : null
            );
          }}
        />
      )}

      {/* 2 - PÁGINA / MODAL DE SELEÇÃO DE PSE (0 a 10) */}
      {pseModalConfig && pseModalConfig.isOpen && (
        <PsePickerModal
          isOpen={pseModalConfig.isOpen}
          onClose={() => setPseModalConfig(null)}
          initialValue={pseModalConfig.initialValue}
          exerciseName={pseModalConfig.exerciseName}
          setNumber={pseModalConfig.setNumber}
          onSelect={handleSelectPse}
        />
      )}

      {/* Toast Feedback ao clicar em Concluir e Recolher */}
      {exerciseFinishedToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/95 border border-emerald-500/60 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span>{exerciseFinishedToast}</span>
        </div>
      )}
    </div>
  );
};
