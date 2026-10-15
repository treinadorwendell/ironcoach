'use client';

import React, { useState, useMemo, useSyncExternalStore } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { storage } from '@/lib/storage';
import {
  TrendingUp,
  Dumbbell,
  Trophy,
  Calendar,
  Layers,
  Check,
  Activity,
  BarChart2,
  X,
  Clock,
  ArrowLeft,
  Filter,
} from 'lucide-react';

export interface SeriesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  setNumber: number;
  totalSets?: number;
  clientId?: string;
  onSelectSetNumber?: (setNum: number) => void;
}

interface SelectedMetricsState {
  weight: boolean;
  reps: boolean;
  volume: boolean;
  pse: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    name: string;
    value: number;
    color: string;
    payload: {
      date: string;
      weightKg: number;
      reps: number;
      volumeKg: number;
      setNumber: number;
      pse?: number | null;
    };
  }>;
  selectedMetrics?: SelectedMetricsState;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  selectedMetrics,
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const showWeight = selectedMetrics?.weight ?? true;
    const showReps = selectedMetrics?.reps ?? true;
    const showVolume = selectedMetrics?.volume ?? true;
    const showPse = selectedMetrics?.pse ?? true;

    return (
      <div className="p-3.5 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[210px]">
        <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] border-b border-slate-800 pb-1.5">
          <span className="flex items-center gap-1.5 font-bold text-white">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            {data.date}
          </span>
          <span className="text-[10px] text-emerald-400 font-bold">
            Série #{data.setNumber}
          </span>
        </div>

        <div className="space-y-1.5">
          {showWeight && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Carga:
              </span>
              <span className="text-sm font-black text-emerald-400 font-mono">
                {data.weightKg} kg
              </span>
            </div>
          )}

          {showReps && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Repetições:
              </span>
              <span className="text-sm font-black text-rose-400 font-mono">
                {data.reps} reps
              </span>
            </div>
          )}

          {showVolume && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-blue-400 font-semibold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                Volume da Série:
              </span>
              <span className="text-sm font-black text-blue-400 font-mono">
                {data.volumeKg.toLocaleString('pt-BR')} kg
              </span>
            </div>
          )}

          {showPse && data.pse != null && (
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
              <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                PSE (Esforço):
              </span>
              <span className="text-sm font-black text-amber-400 font-mono">
                {data.pse} / 10
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const SeriesHistoryModal: React.FC<SeriesHistoryModalProps> = ({
  isOpen,
  onClose,
  exerciseName,
  setNumber,
  totalSets = 1,
  clientId,
  onSelectSetNumber,
}) => {
  const [prevSetProp, setPrevSetProp] = useState(setNumber);
  const [activeSetNumber, setActiveSetNumber] = useState(setNumber);

  if (prevSetProp !== setNumber) {
    setPrevSetProp(setNumber);
    setActiveSetNumber(setNumber);
  }

  // Multi-selection filter: Carga (Verde), Repetições (Vermelho), Volume (Azul), PSE (Âmbar)
  const [selectedMetrics, setSelectedMetrics] = useState<SelectedMetricsState>({
    weight: true,
    reps: true,
    volume: true,
    pse: true,
  });

  const storeKey = useSyncExternalStore(
    (callback) => {
      window.addEventListener('ironcoach:data-synced', callback);
      window.addEventListener('storage', callback);
      return () => {
        window.removeEventListener('ironcoach:data-synced', callback);
        window.removeEventListener('storage', callback);
      };
    },
    () => {
      if (typeof window === 'undefined') return '';
      return (
        (localStorage.getItem('ironcoach_completed_workouts_v1') || '') +
        (localStorage.getItem('ironcoach_exercise_finished_snapshots_v1') || '')
      );
    },
    () => ''
  );

  // Query historical data strictly for this specific series from finished exercises ("Concluir e Recolher")
  const seriesData = useMemo(() => {
    if (!isOpen || !exerciseName) return [];
    void storeKey;
    return storage.getSeriesHistory(exerciseName, activeSetNumber, clientId);
  }, [isOpen, exerciseName, activeSetNumber, clientId, storeKey]);

  const hasHistory = seriesData.length > 0;

  if (!isOpen) return null;

  const toggleMetric = (key: keyof SelectedMetricsState) => {
    const activeCount = Object.values(selectedMetrics).filter(Boolean).length;
    if (selectedMetrics[key] && activeCount <= 1) {
      return; // Keep at least one active
    }
    setSelectedMetrics((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectSet = (num: number) => {
    setActiveSetNumber(num);
    if (onSelectSetNumber) {
      onSelectSetNumber(num);
    }
  };

  // KPIs
  const weights = seriesData.map((d) => d.weightKg);
  const repsArr = seriesData.map((d) => d.reps);
  const volumes = seriesData.map((d) => d.volumeKg);

  const minWeight = weights.length ? Math.min(...weights) : 0;
  const maxWeight = weights.length ? Math.max(...weights) : 0;
  const lastWeight = weights.length ? weights[weights.length - 1] : 0;
  const firstWeight = weights.length ? weights[0] : 0;
  const diffKg = Number((lastWeight - firstWeight).toFixed(1));
  const percentGain = firstWeight > 0 ? ((diffKg / firstWeight) * 100).toFixed(1) : '0';

  const lastReps = repsArr.length ? repsArr[repsArr.length - 1] : 0;
  const maxReps = repsArr.length ? Math.max(...repsArr) : 0;
  const lastVol = volumes.length ? volumes[volumes.length - 1] : 0;
  const maxVolume = volumes.length ? Math.max(...volumes) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-5 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col sm:rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header da Página de Evolução da Série */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition active:scale-95 text-xs font-bold shrink-0 sm:hidden"
              title="Voltar ao treino"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  Evolução da Série #{activeSetNumber}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30 shrink-0">
                  {exerciseName}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate sm:whitespace-normal">
                Histórico gerado ao clicar em &ldquo;Concluir e Recolher&rdquo;
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95"
              title="Fechar página"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Seletor de Séries do Exercício */}
        {totalSets > 1 && (
          <div className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 shrink-0 overflow-x-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Séries:
            </span>
            {Array.from({ length: totalSets }).map((_, idx) => {
              const num = idx + 1;
              const isCurrent = num === activeSetNumber;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleSelectSet(num)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition active:scale-95 shrink-0 ${
                    isCurrent
                      ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  Série #{num}
                </button>
              );
            })}
          </div>
        )}

        {/* Conteúdo com Rolagem */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 1.4: Caso não tenha histórico não deve exibir nada (nenhum gráfico de mentira) */}
          {!hasHistory ? (
            <div className="p-8 text-center rounded-2xl bg-slate-950/70 border border-dashed border-slate-800 space-y-3 my-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">
                  Nenhum histórico registrado para a Série #{activeSetNumber}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Este exercício ainda não possui séries registradas ao clicar no botão &ldquo;Concluir e Recolher&rdquo;.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 max-w-md mx-auto text-left space-y-1">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Como gerar este gráfico:
                </span>
                <p>1. Ajuste a carga e realize as repetições desta série na sala.</p>
                <p>2. Ao finalizar o exercício, clique no botão <strong className="text-white">&ldquo;Concluir e Recolher&rdquo;</strong>.</p>
                <p>3. Os dados desta série serão gravados e a curva de evolução aparecerá aqui automaticamente.</p>
              </div>
            </div>
          ) : (
            <>
              {/* 1.2: Filtros de Métrica: Carga, Repetições, Volume e PSE */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                    <Filter className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Filtrar no Gráfico:</span>
                  </span>

                  {/* Filtro: Carga (kg) - Verde */}
                  <button
                    type="button"
                    onClick={() => toggleMetric('weight')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                      selectedMetrics.weight
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500 shadow-sm'
                        : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Carga (kg)</span>
                    {selectedMetrics.weight && <Check className="w-3 h-3 text-emerald-400" />}
                  </button>

                  {/* Filtro: Repetições - Vermelho/Rosa */}
                  <button
                    type="button"
                    onClick={() => toggleMetric('reps')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                      selectedMetrics.reps
                        ? 'bg-rose-950 text-rose-300 border border-rose-500 shadow-sm'
                        : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>Repetições</span>
                    {selectedMetrics.reps && <Check className="w-3 h-3 text-rose-400" />}
                  </button>

                  {/* Filtro: Volume - Azul */}
                  <button
                    type="button"
                    onClick={() => toggleMetric('volume')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                      selectedMetrics.volume
                        ? 'bg-blue-950 text-blue-300 border border-blue-500 shadow-sm'
                        : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>Volume (kg)</span>
                    {selectedMetrics.volume && <Check className="w-3 h-3 text-blue-400" />}
                  </button>

                  {/* Filtro: PSE (0 a 10) - Âmbar */}
                  <button
                    type="button"
                    onClick={() => toggleMetric('pse')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                      selectedMetrics.pse
                        ? 'bg-amber-950 text-amber-300 border border-amber-500 shadow-sm'
                        : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>PSE (0-10)</span>
                    {selectedMetrics.pse && <Check className="w-3 h-3 text-amber-400" />}
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 font-mono">
                  {seriesData.length} treino(s) registrado(s)
                </span>
              </div>

              {/* 1.1: KPIs com informações de Carga, Repetições e Volume POR CADA SÉRIE */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                {/* Carga */}
                <div
                  className={`p-3 rounded-2xl border transition ${
                    selectedMetrics.weight
                      ? 'bg-slate-950 border-emerald-500/40 ring-1 ring-emerald-500/20'
                      : 'bg-slate-950/50 border-slate-800 opacity-60'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Última Carga
                  </span>
                  <span className="text-base sm:text-lg font-black text-white font-mono mt-0.5 block">
                    {lastWeight} <span className="text-xs text-emerald-400">kg</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold block ${
                      diffKg >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {diffKg >= 0 ? `+${diffKg} kg` : `${diffKg} kg`} ({percentGain}%)
                  </span>
                </div>

                {/* Repetições */}
                <div
                  className={`p-3 rounded-2xl border transition ${
                    selectedMetrics.reps
                      ? 'bg-slate-950 border-rose-500/40 ring-1 ring-rose-500/20'
                      : 'bg-slate-950/50 border-slate-800 opacity-60'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Últimas Reps
                  </span>
                  <span className="text-base sm:text-lg font-black text-rose-400 font-mono mt-0.5 block">
                    {lastReps} <span className="text-xs text-slate-300">reps</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    Pico: {maxReps} reps
                  </span>
                </div>

                {/* Volume da Série */}
                <div
                  className={`p-3 rounded-2xl border transition ${
                    selectedMetrics.volume
                      ? 'bg-slate-950 border-blue-500/40 ring-1 ring-blue-500/20'
                      : 'bg-slate-950/50 border-slate-800 opacity-60'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Volume da Série
                  </span>
                  <span className="text-base sm:text-lg font-black text-blue-400 font-mono mt-0.5 block">
                    {lastVol.toLocaleString('pt-BR')}{' '}
                    <span className="text-xs text-slate-400 font-bold">kg</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    Pico: {maxVolume.toLocaleString('pt-BR')} kg
                  </span>
                </div>

                {/* Recorde */}
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    Recorde Série #{activeSetNumber}
                  </span>
                  <span className="text-base sm:text-lg font-black text-amber-400 font-mono mt-0.5 block">
                    {maxWeight} <span className="text-xs font-bold text-slate-400">kg</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    Carga máxima registrada
                  </span>
                </div>
              </div>

              {/* Gráfico Recharts por Série */}
              <div className="p-3 sm:p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Curva Histórica da Série #{activeSetNumber}</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Registros de &ldquo;Concluir e Recolher&rdquo;
                  </span>
                </div>

                <div className="w-full h-64 sm:h-72 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={seriesData}
                      margin={{
                        top: 10,
                        right: selectedMetrics.reps ? 16 : 8,
                        left: -10,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

                      <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                        tickLine={false}
                        axisLine={{ stroke: '#334155' }}
                      />

                      {/* Eixo Y da Carga (kg) - Esquerda */}
                      {selectedMetrics.weight && (
                        <YAxis
                          yAxisId="weight"
                          orientation="left"
                          stroke="#10b981"
                          domain={[Math.max(0, minWeight - 5), maxWeight + 5]}
                          tick={{ fill: '#10b981', fontSize: 10, fontFamily: 'monospace' }}
                          tickLine={false}
                          axisLine={{ stroke: '#064e3b' }}
                          unit="kg"
                        />
                      )}

                      {/* Eixo Y de Repetições - Direita */}
                      {selectedMetrics.reps && (
                        <YAxis
                          yAxisId="reps"
                          orientation="right"
                          stroke="#ef4444"
                          domain={[0, Math.ceil(maxReps * 1.25)]}
                          tick={{ fill: '#ef4444', fontSize: 10, fontFamily: 'monospace' }}
                          tickLine={false}
                          axisLine={{ stroke: '#7f1d1d' }}
                          unit="r"
                        />
                      )}

                      {/* Eixo Y de Volume da Série */}
                      {selectedMetrics.volume && (
                        <YAxis
                          yAxisId="volume"
                          orientation={selectedMetrics.weight ? 'right' : 'left'}
                          stroke="#3b82f6"
                          domain={[0, Math.ceil(maxVolume * 1.15)]}
                          tick={{ fill: '#3b82f6', fontSize: 10, fontFamily: 'monospace' }}
                          tickLine={false}
                          axisLine={{ stroke: '#1e3a8a' }}
                          tickFormatter={(val) => `${(val / 1000).toFixed(1)}k`}
                        />
                      )}

                      {/* Eixo Y de PSE (0 a 10) */}
                      {selectedMetrics.pse && (
                        <YAxis
                          yAxisId="pse"
                          orientation={selectedMetrics.reps || selectedMetrics.volume ? 'left' : 'right'}
                          stroke="#f59e0b"
                          domain={[0, 10]}
                          ticks={[0, 2, 4, 6, 8, 10]}
                          tick={{ fill: '#f59e0b', fontSize: 10, fontFamily: 'monospace' }}
                          tickLine={false}
                          axisLine={{ stroke: '#78350f' }}
                        />
                      )}

                      <Tooltip content={<CustomChartTooltip selectedMetrics={selectedMetrics} />} />

                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 'bold' }}
                      />

                      {/* Linha 1: Carga (kg) - Verde */}
                      {selectedMetrics.weight && (
                        <Line
                          yAxisId="weight"
                          type="monotone"
                          dataKey="weightKg"
                          name="Carga (kg)"
                          stroke="#10b981"
                          strokeWidth={3.5}
                          dot={{
                            r: 5,
                            fill: '#022c22',
                            stroke: '#10b981',
                            strokeWidth: 2.5,
                          }}
                          activeDot={{
                            r: 7,
                            fill: '#10b981',
                            stroke: '#ffffff',
                            strokeWidth: 2,
                          }}
                        />
                      )}

                      {/* Linha 2: Repetições - Vermelho/Rosa */}
                      {selectedMetrics.reps && (
                        <Line
                          yAxisId="reps"
                          type="monotone"
                          dataKey="reps"
                          name="Repetições"
                          stroke="#ef4444"
                          strokeWidth={3}
                          dot={{
                            r: 5,
                            fill: '#450a0a',
                            stroke: '#ef4444',
                            strokeWidth: 2.5,
                          }}
                          activeDot={{
                            r: 7,
                            fill: '#ef4444',
                            stroke: '#ffffff',
                            strokeWidth: 2,
                          }}
                        />
                      )}

                      {/* Linha 3: Volume da Série (kg total) - Azul */}
                      {selectedMetrics.volume && (
                        <Line
                          yAxisId="volume"
                          type="monotone"
                          dataKey="volumeKg"
                          name="Volume da Série"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          strokeDasharray={selectedMetrics.weight && selectedMetrics.reps ? '4 4' : undefined}
                          dot={{
                            r: 5,
                            fill: '#1e3a8a',
                            stroke: '#3b82f6',
                            strokeWidth: 2.5,
                          }}
                          activeDot={{
                            r: 7,
                            fill: '#3b82f6',
                            stroke: '#ffffff',
                            strokeWidth: 2,
                          }}
                        />
                      )}

                      {/* Linha 4: PSE (0 a 10) - Âmbar */}
                      {selectedMetrics.pse && (
                        <Line
                          yAxisId="pse"
                          type="monotone"
                          dataKey="pse"
                          name="PSE (0-10)"
                          stroke="#f59e0b"
                          strokeWidth={3}
                          connectNulls={true}
                          dot={{
                            r: 5,
                            fill: '#451a03',
                            stroke: '#f59e0b',
                            strokeWidth: 2.5,
                          }}
                          activeDot={{
                            r: 7,
                            fill: '#f59e0b',
                            stroke: '#ffffff',
                            strokeWidth: 2,
                          }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tabela de Histórico da Série */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Registros Históricos da Série #{activeSetNumber} ({seriesData.length})
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {seriesData.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1"
                    >
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {item.date}
                      </span>

                      <div className="flex items-center justify-center gap-2 text-xs font-black">
                        <span className="text-emerald-400 font-mono">{item.weightKg} kg</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-rose-400 font-mono">{item.reps} reps</span>
                      </div>

                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono text-blue-400 font-semibold">
                          Vol: {item.volumeKg.toLocaleString('pt-BR')} kg
                        </span>
                        {item.pse != null && (
                          <span className="text-[10px] font-bold font-mono text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.2 rounded-md">
                            PSE {item.pse}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Rodapé da Modal */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Série #{activeSetNumber} de {exerciseName}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs transition active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Treino</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Also export as ExerciseHistoryChart for backwards compatibility
export const ExerciseHistoryChart = SeriesHistoryModal;
