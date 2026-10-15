'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, CompletedWorkoutRecord } from '@/types';
import { storage } from '@/lib/storage';
import { cloudSync } from '@/lib/firebase';
import {
  ArrowLeft,
  History,
  Search,
  Calendar,
  Clock,
  Dumbbell,
  Flame,
  User,
  Filter,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Printer,
  Sparkles,
  FileText,
  Activity,
  Award,
  Layers,
  X,
  Play,
  RotateCcw,
  Weight,
  Ruler,
  Mail,
  DollarSign,
} from 'lucide-react';

// Pure helper functions declared outside component render
const calculateAge = (bDate?: string): number | null => {
  if (!bDate || bDate.length < 10) return null;
  const parts = bDate.split('/');
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const y = parseInt(parts[2], 10);
  const birth = new Date(y, m, d);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const mDiff = today.getMonth() - birth.getMonth();
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

const calculateIMC = (w?: number, h?: number): string | null => {
  if (!w || !h) return null;
  const hM = h / 100;
  return (w / (hM * hM)).toFixed(1);
};

interface WorkoutHistoryPageProps {
  clients: Client[];
  initialClientId?: string | null;
  onBack: () => void;
  onStartWorkoutForClient?: (client: Client) => void;
}

export const WorkoutHistoryPage: React.FC<WorkoutHistoryPageProps> = ({
  clients,
  initialClientId,
  onBack,
  onStartWorkoutForClient,
}) => {
  const [workouts, setWorkouts] = useState<CompletedWorkoutRecord[]>(() => {
    if (typeof window !== 'undefined') {
      return storage.getCompletedWorkouts();
    }
    return [];
  });

  // Identify the target client profile strictly (exclusively bound to this profile)
  const currentClient = useMemo(() => {
    if (initialClientId) {
      return clients.find((c) => c.id === initialClientId) || clients[0];
    }
    return clients[0];
  }, [clients, initialClientId]);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d' | 'this_month'>('all');
  const [workoutToDelete, setWorkoutToDelete] = useState<CompletedWorkoutRecord | null>(null);

  // Expanded workouts set (default first workout expanded if available)
  const [expandedWorkoutIds, setExpandedWorkoutIds] = useState<Set<string>>(() => {
    const list = typeof window !== 'undefined' ? storage.getCompletedWorkouts() : [];
    return list.length > 0 ? new Set([list[0].id]) : new Set();
  });

  useEffect(() => {
    const handleStorage = () => {
      setWorkouts(storage.getCompletedWorkouts());
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('ironcoach:data-synced', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('ironcoach:data-synced', handleStorage);
    };
  }, []);

  const toggleWorkoutExpand = (id: string) => {
    setExpandedWorkoutIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedWorkoutIds(new Set(workouts.map((w) => w.id)));
  };

  const handleCollapseAll = () => {
    setExpandedWorkoutIds(new Set());
  };

  const handleDeleteWorkout = (workoutId: string) => {
    const updated = storage.deleteCompletedWorkout(workoutId);
    cloudSync.removeCompletedWorkout(workoutId);
    setWorkouts(updated);
    setWorkoutToDelete(null);
  };

  // Filtered Workouts - EXCLUSIVELY scoped to current client profile
  const filteredWorkouts = useMemo(() => {
    if (!currentClient) return [];
    return workouts.filter((w) => {
      // Strictly scoped to this client's profile
      if (w.clientId !== currentClient.id) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesProgram = w.programName.toLowerCase().includes(query);
        const matchesSplit = w.splitName.toLowerCase().includes(query);
        const matchesExercise = w.exercises.some((e) =>
          e.name.toLowerCase().includes(query)
        );
        const matchesNotes = (w.trainerNotes || '').toLowerCase().includes(query);

        if (
          !matchesProgram &&
          !matchesSplit &&
          !matchesExercise &&
          !matchesNotes
        ) {
          return false;
        }
      }

      // Date filter
      if (dateFilter !== 'all' && w.completedAt) {
        const workoutDate = new Date(w.completedAt);
        const now = new Date();
        if (dateFilter === '7d') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (workoutDate < sevenDaysAgo) return false;
        } else if (dateFilter === '30d') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          if (workoutDate < thirtyDaysAgo) return false;
        } else if (dateFilter === 'this_month') {
          if (
            workoutDate.getMonth() !== now.getMonth() ||
            workoutDate.getFullYear() !== now.getFullYear()
          ) {
            return false;
          }
        }
      }

      return true;
    });
  }, [workouts, currentClient, searchTerm, dateFilter]);

  // Overall Statistics for this client's filtered set
  const stats = useMemo(() => {
    const totalSessions = filteredWorkouts.length;
    const totalVolumeKg = filteredWorkouts.reduce(
      (sum, w) => sum + (w.totalVolumeKg || 0),
      0
    );
    const totalDurationSeconds = filteredWorkouts.reduce(
      (sum, w) => sum + (w.durationSeconds || 0),
      0
    );
    const totalCompletedSets = filteredWorkouts.reduce(
      (sum, w) =>
        sum +
        w.exercises.reduce(
          (exSum, ex) => exSum + ex.sets.filter((s) => s.completed).length,
          0
        ),
      0
    );

    const hours = Math.floor(totalDurationSeconds / 3600);
    const mins = Math.floor((totalDurationSeconds % 3600) / 60);
    const formattedDuration =
      hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

    return {
      totalSessions,
      totalVolumeKg,
      formattedDuration,
      totalCompletedSets,
    };
  }, [filteredWorkouts]);

  const clientAge = currentClient ? calculateAge(currentClient.birthDate) : '';
  const clientIMC = currentClient ? calculateIMC(currentClient.weight, currentClient.height) : null;

  return (
    <div className="space-y-4 pb-28 animate-in fade-in duration-200">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white border border-slate-700 transition flex-shrink-0 group shadow-md"
            title="Voltar para a Lista de Alunos"
          >
            <ArrowLeft className="w-5 h-5 text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-xs font-bold hidden xs:inline">Voltar</span>
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>
                  Histórico do Perfil{currentClient ? ` • ${currentClient.name}` : ''}
                </span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-[11px] border border-amber-500/30">
                {filteredWorkouts.length} {filteredWorkouts.length === 1 ? 'sessão' : 'sessões'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentClient
                ? `Histórico exclusivo de treinos, cargas e métricas de ${currentClient.name}.`
                : 'Histórico exclusivo de treinos deste perfil.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition active:scale-95 shadow-sm"
            title="Imprimir relatório do histórico de treinos"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-400" />
            <span>Imprimir</span>
          </button>

          {currentClient && onStartWorkoutForClient && (
            <button
              type="button"
              onClick={() => onStartWorkoutForClient(currentClient)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Novo Treino</span>
            </button>
          )}
        </div>
      </div>

      {/* Student Profile Identity Card */}
      {currentClient && (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-md flex-shrink-0 ${
                  currentClient.gender === 'Feminino'
                    ? 'bg-gradient-to-tr from-pink-600 to-rose-500'
                    : 'bg-gradient-to-tr from-blue-600 to-cyan-500'
                }`}
              >
                {currentClient.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-white tracking-tight">
                    {currentClient.name}
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      currentClient.gender === 'Feminino'
                        ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {currentClient.gender}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Histórico Vinculado ao Perfil
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {currentClient.birthDate} {clientAge ? `(${clientAge} anos)` : ''}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {currentClient.email}
                  </span>
                </div>
              </div>
            </div>

            {onStartWorkoutForClient && (
              <button
                type="button"
                onClick={() => onStartWorkoutForClient(currentClient)}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 active:scale-95 transition"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Iniciar Treino com {currentClient.name.split(' ')[0]}</span>
              </button>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
              <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Weight className="w-3 h-3 text-cyan-400" /> Peso Corporal
              </span>
              <span className="text-xs font-bold text-white mt-0.5 block">
                {currentClient.weight} kg
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
              <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Ruler className="w-3 h-3 text-cyan-400" /> Altura
              </span>
              <span className="text-xs font-bold text-white mt-0.5 block">
                {currentClient.height} cm
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
              <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" /> IMC
              </span>
              <span className="text-xs font-bold text-emerald-400 mt-0.5 block">
                {clientIMC || '--'}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
              <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <DollarSign className="w-3 h-3 text-amber-400" /> Plano
              </span>
              <span className="text-xs font-bold text-amber-300 mt-0.5 block truncate">
                {currentClient.contractType} (R$ {currentClient.contractValue})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Performance Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Treinos Realizados</span>
          </span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{stats.totalSessions}</span>
            <span className="text-xs text-slate-400 font-semibold">sessões</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5 text-cyan-400" />
            <span>Volume Total (Cargas)</span>
          </span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-cyan-300">
              {stats.totalVolumeKg.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-400 font-semibold">kg levantados</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tempo em Treino</span>
          </span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400">
              {stats.formattedDuration}
            </span>
            <span className="text-xs text-slate-400 font-semibold">acumulados</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-md">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Séries Concluídas</span>
          </span>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-purple-300">
              {stats.totalCompletedSets}
            </span>
            <span className="text-xs text-slate-400 font-semibold">séries</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar (Exclusivo para este perfil) */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Search by Query */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>Buscar Exercício / Treino de {currentClient?.name}:</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Ex: Supino, Peitoral, Treino A..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Date Period Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Filtrar Período:</span>
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'all' | '7d' | '30d' | 'this_month')}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-amber-400 transition"
            >
              <option value="all">Todo o Histórico deste Aluno</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="this_month">Este Mês</option>
            </select>
          </div>
        </div>

        {/* Toolbar helper buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          <span className="text-slate-400">
            Exibindo <strong>{filteredWorkouts.length}</strong> {filteredWorkouts.length === 1 ? 'sessão registrada' : 'sessões registradas'} de {currentClient?.name}
          </span>

          <div className="flex items-center gap-2">
            {(searchTerm || dateFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setDateFilter('all');
                }}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpar Filtros</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExpandAll}
              className="text-[11px] font-semibold text-slate-400 hover:text-cyan-400 transition"
            >
              Expandir Todos
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="text-[11px] font-semibold text-slate-400 hover:text-cyan-400 transition"
            >
              Recolher Todos
            </button>
          </div>
        </div>
      </div>

      {/* List of Completed Workout Sessions */}
      <div className="space-y-3">
        {filteredWorkouts.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <History className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">
              Nenhum treino registrado no perfil de {currentClient?.name || 'este aluno'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {currentClient?.name || 'Este aluno'} ainda não possui sessões registradas com os filtros atuais. Conclua uma sessão na aba de Execução para registrar o histórico exclusivo deste perfil.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              {(searchTerm || dateFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setDateFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
                >
                  Limpar Filtros de Busca
                </button>
              )}

              {currentClient && onStartWorkoutForClient && (
                <button
                  type="button"
                  onClick={() => onStartWorkoutForClient(currentClient)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950/40 flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Iniciar Treino com {currentClient.name.split(' ')[0]}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredWorkouts.map((workout) => {
            const isExpanded = expandedWorkoutIds.has(workout.id);
            const totalSets = workout.exercises.reduce(
              (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
              0
            );

            return (
              <div
                key={workout.id}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-lg transition-all overflow-hidden"
              >
                {/* Workout Card Header */}
                <div
                  onClick={() => toggleWorkoutExpand(workout.id)}
                  className="p-4 cursor-pointer hover:bg-slate-800/40 transition select-none flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-black text-sm flex-shrink-0">
                      <Flame className="w-5 h-5 text-amber-400" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm sm:text-base text-white">
                          {workout.clientName}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-xs font-bold text-amber-400">
                          {workout.splitName || workout.programName}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {workout.date} {workout.time ? `às ${workout.time}` : ''}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-semibold text-emerald-400">
                          <Clock className="w-3.5 h-3.5 text-emerald-500" />
                          {workout.durationFormatted || `${Math.round((workout.durationSeconds || 0) / 60)} min`}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-semibold text-cyan-300">
                          <Dumbbell className="w-3.5 h-3.5 text-cyan-500" />
                          {workout.totalVolumeKg?.toLocaleString('pt-BR') || 0} kg
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-purple-300">
                          {totalSets} séries concluídas
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Expand Toggle */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWorkoutToDelete(workout);
                      }}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Excluir este registro de treino"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1 text-xs font-bold">
                      <span className="hidden sm:inline">
                        {isExpanded ? 'Recolher' : 'Ver Detalhes'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-amber-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Workout Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-800 bg-slate-950/70 p-4 space-y-4"
                    >
                      {/* Program Details Tag */}
                      <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-cyan-400" />
                          <span>Programa: <strong className="text-white">{workout.programName}</strong></span>
                        </div>
                        <div>
                          <span>Divisão: <strong className="text-amber-400">{workout.splitName}</strong></span>
                        </div>
                      </div>

                      {/* Trainer Technical Notes & Biomechanical Feedback */}
                      {workout.trainerNotes && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Anotações Técnicas do Treinador:</span>
                          </div>
                          <p className="text-xs text-slate-200 italic leading-relaxed">
                            &ldquo;{workout.trainerNotes}&rdquo;
                          </p>
                        </div>
                      )}

                      {/* Exercises Performed Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
                          <span className="flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-cyan-400" />
                            <span>Exercícios Realizados ({workout.exercises.length}):</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2.5">
                          {workout.exercises.map((ex, exIdx) => {
                            const completedSetsCount = ex.sets.filter((s) => s.completed).length;

                            return (
                              <div
                                key={ex.exerciseId || `${workout.id}-ex-${exIdx}`}
                                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 space-y-2.5"
                              >
                                {/* Exercise Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-800 pb-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
                                      {exIdx + 1}
                                    </span>
                                    <h4 className="text-sm font-bold text-white">
                                      {ex.name}
                                    </h4>
                                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                                      {ex.muscleGroup}
                                    </span>
                                    {ex.method && ex.method !== 'Normal' && (
                                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-extrabold border border-purple-500/30">
                                        {ex.method}
                                      </span>
                                    )}
                                  </div>

                                  <span className="text-[11px] font-semibold text-emerald-400">
                                    {completedSetsCount} de {ex.sets.length} séries finalizadas
                                  </span>
                                </div>

                                {ex.observations && (
                                  <p className="text-[11px] text-slate-400 italic">
                                    Obs: &ldquo;{ex.observations}&rdquo;
                                  </p>
                                )}

                                {/* Sets Grid / Table */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                  {ex.sets.map((set) => (
                                    <div
                                      key={set.setNumber}
                                      className={`p-2 rounded-lg border text-center transition ${
                                        set.completed
                                          ? 'bg-slate-950 border-emerald-500/40 text-slate-200'
                                          : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-slate-800/80 mb-1">
                                        <span className="font-bold">Série #{set.setNumber}</span>
                                        {set.completed && (
                                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        )}
                                      </div>

                                      <div className="flex items-baseline justify-center gap-1">
                                        <span className="text-sm font-black text-cyan-300">
                                          {set.weightKg}
                                        </span>
                                        <span className="text-[10px] text-slate-400">kg</span>
                                        <span className="text-slate-600">×</span>
                                        <span className="text-sm font-black text-white">
                                          {set.completedReps}
                                        </span>
                                        <span className="text-[10px] text-slate-400">reps</span>
                                      </div>

                                      {set.pse != null && (
                                        <div className="mt-1">
                                          <span className="inline-block text-[9px] font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                                            PSE: {set.pse}/10
                                          </span>
                                        </div>
                                      )}

                                      {/* Subsets if Drop-set or Rest-Pause */}
                                      {set.subSets && set.subSets.length > 0 && (
                                        <div className="mt-1 pt-1 border-t border-slate-800/60 space-y-0.5">
                                          {set.subSets.map((sub, sIdx) => (
                                            <div
                                              key={sIdx}
                                              className="text-[9px] text-purple-300 font-bold truncate"
                                              title={sub.note}
                                            >
                                              Drop: {sub.weightKg}kg × {sub.completedReps}r
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal to Delete Workout */}
      {workoutToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Registro de Treino?</h3>
                <p className="text-xs text-slate-400">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
              Deseja realmente remover o treino de <strong>{workoutToDelete.clientName}</strong> realizado em <strong>{workoutToDelete.date}</strong> ({workoutToDelete.splitName})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWorkoutToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteWorkout(workoutToDelete.id)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-md shadow-rose-950/50"
              >
                Sim, Excluir Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
