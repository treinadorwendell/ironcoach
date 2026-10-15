'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { CalendarEvent, Client, CompletedWorkoutRecord } from '@/types';
import {
  FileText,
  Printer,
  Download,
  X,
  Calendar,
  Filter,
  DollarSign,
  CheckCircle2,
  RotateCcw,
  XCircle,
  User,
  Dumbbell,
  Clock,
  Sparkles,
  Layers,
  ChevronDown,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AgendaReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  clients: Client[];
  completedWorkouts?: CompletedWorkoutRecord[];
}

export const AgendaReportModal: React.FC<AgendaReportModalProps> = ({
  isOpen,
  onClose,
  events,
  clients,
  completedWorkouts = [],
}) => {
  // Helpers para datas padrão (início do mês atual até final do mês ou data corrente)
  const getInitialDates = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return {
      todayStr: `${y}-${m}-${d}`,
      firstDayOfMonth: `${y}-${m}-01`,
      lastDayOfMonth: new Date(y, today.getMonth() + 1, 0).toISOString().split('T')[0],
    };
  };

  const initialDates = getInitialDates();

  // Estados de Filtro
  const [startDate, setStartDate] = useState<string>(initialDates.firstDayOfMonth);
  const [endDate, setEndDate] = useState<string>(initialDates.lastDayOfMonth);
  const [selectedClientId, setSelectedClientId] = useState<string>('todos');
  const [includedStatuses, setIncludedStatuses] = useState<Record<string, boolean>>({
    realizado: true,
    reagendado: true,
    falta: true,
    confirmado: false, // O usuário solicitou Realizadas, Reagendadas e Faltas
  });

  // Ajustes de Valores Financeiros por Aluno no Relatório (Personalização em tempo real)
  // Permite ao treinador ajustar o valor da sessão avulsa ou contrato diretamente na tela
  const [customValues, setCustomValues] = useState<Record<string, number>>({});
  const [showValueAdjustments, setShowValueAdjustments] = useState(false);

  const getClientValue = useCallback((client: Client): number => {
    if (customValues[client.id] !== undefined) {
      return customValues[client.id];
    }
    return client.contractValue || (client.contractType === 'Avulsa' ? 80 : 350);
  }, [customValues]);

  const handleUpdateCustomValue = (clientId: string, val: number) => {
    setCustomValues((prev) => ({
      ...prev,
      [clientId]: Math.max(0, val),
    }));
  };

  // Predefinições rápidas de período
  const applyPreset = (preset: 'hoje' | 'semana' | 'mes' | 'tudo') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');

    if (preset === 'hoje') {
      const today = `${y}-${m}-${d}`;
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'semana') {
      const dayOfWeek = now.getDay(); // 0 Dom .. 6 Sab
      const first = new Date(now);
      first.setDate(now.getDate() - dayOfWeek);
      const last = new Date(first);
      last.setDate(first.getDate() + 6);
      setStartDate(first.toISOString().split('T')[0]);
      setEndDate(last.toISOString().split('T')[0]);
    } else if (preset === 'mes') {
      setStartDate(`${y}-${m}-01`);
      setEndDate(new Date(y, now.getMonth() + 1, 0).toISOString().split('T')[0]);
    } else if (preset === 'tudo') {
      setStartDate('2026-01-01');
      setEndDate('2026-12-31');
    }
  };

  // Filtragem dos eventos
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // Filtro por data
      if (startDate && evt.date < startDate) return false;
      if (endDate && evt.date > endDate) return false;

      // Filtro por Aluno
      if (selectedClientId !== 'todos' && evt.clientId !== selectedClientId) {
        return false;
      }

      // Filtro por Status
      const statusKey = evt.status || 'confirmado';
      if (!includedStatuses[statusKey]) return false;

      return true;
    }).sort((a, b) => {
      // Ordenação cronológica por data e hora
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  }, [events, startDate, endDate, selectedClientId, includedStatuses]);

  // Cruzamento do evento com histórico de treino executado
  const getWorkoutDetailsForEvent = (event: CalendarEvent) => {
    // 1. Tentar encontrar CompletedWorkoutRecord que coincida com o aluno e data
    // Formato da data no record: "DD/MM/YYYY"
    const [y, m, d] = event.date.split('-');
    const formattedDate = `${d}/${m}/${y}`;

    const matchingWorkout = completedWorkouts.find(
      (w) => w.clientId === event.clientId && (w.date === formattedDate || w.completedAt?.startsWith(event.date))
    );

    if (matchingWorkout) {
      const exCount = matchingWorkout.exercises?.length || 0;
      const totalSets = matchingWorkout.exercises?.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0) || 0;
      return {
        title: matchingWorkout.splitName || matchingWorkout.programName || event.title,
        duration: matchingWorkout.durationFormatted,
        volumeKg: matchingWorkout.totalVolumeKg,
        summary: `${exCount} exercícios • ${totalSets} séries cumpridas`,
        isFromExecution: true,
      };
    }

    // Se não encontrou execução gravada, usa o título e notas do agendamento
    return {
      title: event.title || 'Treino Personalizado',
      duration: undefined,
      volumeKg: undefined,
      summary: event.notes || 'Sem observações adicionais',
      isFromExecution: false,
    };
  };

  // Cálculos Financeiros por Plano do Cliente (Mensal, Semanal e Avulsa)
  const financialSummary = useMemo(() => {
    let avulsasCount = 0;
    let avulsasTotalValue = 0;
    const avulsasDetails: Array<{ clientName: string; date: string; value: number }> = [];

    // Conjuntos de alunos únicos que tiveram aulas no período
    const clientesComAulas = new Set<string>();
    filteredEvents.forEach((evt) => {
      if (evt.clientId) clientesComAulas.add(evt.clientId);
    });

    // Separar clientes por plano
    let alunosMensalCount = 0;
    let totalMensalValue = 0;
    let alunosSemanalCount = 0;
    let totalSemanalValue = 0;

    // 1. Para aulas AVULSAS: somar o valor por cada aula realizada no período (requisito do usuário: somar o valor das avulsas)
    filteredEvents.forEach((evt) => {
      const client = clients.find((c) => c.id === evt.clientId);
      const contract = client?.contractType || 'Avulsa';

      // Se for contrato Avulso e status for 'realizado'
      if (contract === 'Avulsa') {
        if (evt.status === 'realizado') {
          avulsasCount++;
          const val = client ? getClientValue(client) : 80;
          avulsasTotalValue += val;
          avulsasDetails.push({
            clientName: evt.clientName || client?.name || 'Aluno',
            date: evt.date,
            value: val,
          });
        }
      }
    });

    // 2. Para Planos Mensais e Semanais: calcular com base nos alunos com plano ativo ou que tiveram atividade
    const clientesFiltrados = selectedClientId === 'todos'
      ? clients.filter((c) => clientesComAulas.has(c.id) || c.contractType !== 'Avulsa')
      : clients.filter((c) => c.id === selectedClientId);

    clientesFiltrados.forEach((client) => {
      const val = getClientValue(client);
      if (client.contractType === 'Mensal') {
        alunosMensalCount++;
        totalMensalValue += val;
      } else if (client.contractType === 'Semanal') {
        alunosSemanalCount++;
        totalSemanalValue += val;
      }
    });

    const totalGeral = avulsasTotalValue + totalMensalValue + totalSemanalValue;

    // Contadores de status de aulas
    const totalAulas = filteredEvents.length;
    const realizadas = filteredEvents.filter((e) => e.status === 'realizado').length;
    const reagendadas = filteredEvents.filter((e) => e.status === 'reagendado').length;
    const faltas = filteredEvents.filter((e) => e.status === 'falta').length;

    return {
      avulsasCount,
      avulsasTotalValue,
      avulsasDetails,
      alunosMensalCount,
      totalMensalValue,
      alunosSemanalCount,
      totalSemanalValue,
      totalGeral,
      totalAulas,
      realizadas,
      reagendadas,
      faltas,
    };
  }, [filteredEvents, clients, selectedClientId, getClientValue]);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Exportação direta e garantida em arquivo PDF nativo (A4 Vetorial com tabelas e resumo financeiro)
  const handleExportPdf = () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const primaryPurple: [number, number, number] = [124, 58, 237];
      const darkSlate: [number, number, number] = [15, 23, 42];
      const textMuted: [number, number, number] = [100, 116, 139];

      // Header Banner
      doc.setFillColor(...primaryPurple);
      doc.rect(0, 0, 210, 22, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text('IRONCOACH - RELATÓRIO DE AULAS & FINANCEIRO', 14, 14);

      // Metadata Info
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...textMuted);
      const generatedAt = new Date().toLocaleString('pt-BR');
      doc.text(`Gerado em: ${generatedAt}`, 14, 29);
      doc.text(
        `Período: ${startDate.split('-').reverse().join('/')} até ${endDate.split('-').reverse().join('/')}`,
        14,
        34
      );

      const alunoNome =
        selectedClientId === 'todos'
          ? 'Todos os Alunos'
          : clients.find((c) => c.id === selectedClientId)?.name || 'Aluno Selecionado';
      doc.text(`Filtro Aluno: ${alunoNome}`, 14, 39);

      // Card Resumo Financeiro & Métricas
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 43, 182, 32, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...darkSlate);
      doc.text('RESUMO GERAL DO PERÍODO', 18, 50);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`• Total de Aulas no Período: ${financialSummary.totalAulas}`, 18, 56);
      doc.text(`• Aulas Realizadas: ${financialSummary.realizadas}`, 18, 61);
      doc.text(`• Reagendadas: ${financialSummary.reagendadas}   |   • Faltas: ${financialSummary.faltas}`, 18, 66);

      doc.text(
        `• Avulsas (${financialSummary.avulsasCount} realizadas): R$ ${financialSummary.avulsasTotalValue.toFixed(2)}`,
        105,
        56
      );
      doc.text(
        `• Planos Mensais/Semanais: R$ ${(financialSummary.totalMensalValue + financialSummary.totalSemanalValue).toFixed(2)}`,
        105,
        61
      );

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.setFontSize(9);
      doc.text(`TOTAL FATURADO ESTIMADO: R$ ${financialSummary.totalGeral.toFixed(2)}`, 105, 68);

      // Tabela de Aulas
      const tableData = filteredEvents.map((evt) => {
        const client = clients.find((c) => c.id === evt.clientId);
        const workoutDetails = getWorkoutDetailsForEvent(evt);
        const statusLabel =
          evt.status === 'realizado'
            ? 'Realizado'
            : evt.status === 'reagendado'
            ? 'Reagendado'
            : evt.status === 'falta'
            ? 'Falta'
            : 'Agendado';

        const clientPlan = client ? `${client.contractType || 'Avulsa'}` : 'Avulsa';
        const clientVal = client ? `R$ ${getClientValue(client).toFixed(2)}` : 'R$ 80,00';

        const workoutDesc = workoutDetails.isFromExecution
          ? `${workoutDetails.title}\n(${workoutDetails.summary}${workoutDetails.duration ? ` • ${workoutDetails.duration}` : ''})`
          : `${workoutDetails.title}${evt.notes ? `\nObs: ${evt.notes}` : ''}`;

        return [
          `${evt.date.split('-').reverse().join('/')}\n${evt.startTime} - ${evt.endTime}`,
          evt.clientName || client?.name || 'Aluno',
          statusLabel,
          workoutDesc,
          `${clientPlan}\n${clientVal}`,
        ];
      });

      autoTable(doc, {
        startY: 79,
        head: [['Data / Hora', 'Aluno', 'Status', 'Descrição do Treino', 'Plano & Valor']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: primaryPurple,
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 26 },
          1: { cellWidth: 32, fontStyle: 'bold' },
          2: { cellWidth: 22 },
          3: { cellWidth: 72 },
          4: { cellWidth: 30 },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 2) {
            const val = data.cell.raw;
            if (val === 'Realizado') {
              data.cell.styles.textColor = [5, 150, 105];
              data.cell.styles.fontStyle = 'bold';
            } else if (val === 'Reagendado') {
              data.cell.styles.textColor = [217, 119, 6];
              data.cell.styles.fontStyle = 'bold';
            } else if (val === 'Falta') {
              data.cell.styles.textColor = [225, 29, 72];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
      });

      const fileName = `Relatorio_Aulas_Financeiro_${startDate}_a_${endDate}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Função para impressão limpa
  const handlePrintDocument = () => {
    try {
      window.print();
    } catch {
      handleExportPdf();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container Principal do Modal de Relatório */}
      <div className="w-full max-w-5xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:bg-white print:text-black print:rounded-none">
        
        {/* CABEÇALHO DO MODAL */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 print:border-b-2 print:border-black print:pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg print:hidden">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white print:text-black">
                  Relatório de Aulas & Financeiro
                </h2>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/30 print:hidden">
                  Agenda Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
                Período:{' '}
                <strong className="text-slate-200 print:text-black">
                  {startDate.split('-').reverse().join('/')} até {endDate.split('-').reverse().join('/')}
                </strong>{' '}
                • {filteredEvents.length} registros encontrados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handleExportPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950/50 active:scale-95 transition disabled:opacity-50"
              title="Baixar arquivo PDF nativo no computador ou celular"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Baixar PDF'}</span>
            </button>
            <button
              onClick={handlePrintDocument}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 active:scale-95 transition"
              title="Imprimir relatório"
            >
              <Printer className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95"
              title="Fechar Relatório"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CORPO DO RELATÓRIO COM ROLAGEM */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 print:overflow-visible print:p-0">
          
          {/* SEÇÃO 1: FILTROS DINÂMICOS (Oculto na Impressão/PDF) */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 print:hidden">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-purple-400" />
                Filtros do Relatório
              </span>

              {/* Botões rápidos de período */}
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'hoje', label: 'Hoje' },
                    { id: 'semana', label: 'Esta Semana' },
                    { id: 'mes', label: 'Este Mês' },
                    { id: 'tudo', label: 'Todos' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-800 transition active:scale-95"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Data Inicial */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Data Inicial
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              {/* Data Final */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Data Final
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              {/* Seleção de Aluno */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Filtrar por Aluno
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="todos">Todos os Alunos ({clients.length})</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.contractType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Checkboxes de Status (Realizadas, Reagendadas, Faltas) */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400">Incluir no Relatório:</span>
              
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={includedStatuses.realizado}
                  onChange={(e) =>
                    setIncludedStatuses((prev) => ({ ...prev, realizado: e.target.checked }))
                  }
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Realizadas ({events.filter((e) => e.status === 'realizado').length})
                </span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={includedStatuses.reagendado}
                  onChange={(e) =>
                    setIncludedStatuses((prev) => ({ ...prev, reagendado: e.target.checked }))
                  }
                  className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span className="flex items-center gap-1 text-amber-400">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reagendadas ({events.filter((e) => e.status === 'reagendado').length})
                </span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={includedStatuses.falta}
                  onChange={(e) =>
                    setIncludedStatuses((prev) => ({ ...prev, falta: e.target.checked }))
                  }
                  className="rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span className="flex items-center gap-1 text-rose-400">
                  <XCircle className="w-3.5 h-3.5" />
                  Faltas ({events.filter((e) => e.status === 'falta').length})
                </span>
              </label>

              <button
                type="button"
                onClick={() => setShowValueAdjustments(!showValueAdjustments)}
                className="ml-auto text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <span>Ajustar Valores dos Planos</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showValueAdjustments ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Painel Expansível de Ajuste de Valores por Aluno */}
            {showValueAdjustments && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-purple-500/30 space-y-2 animate-in fade-in duration-150">
                <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-purple-400" />
                  Valores dos Alunos (Obtidos do cadastro • Ajuste se necessário para este cálculo):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {clients.map((c) => (
                    <div
                      key={c.id}
                      className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <span className="text-xs font-bold text-white block truncate">{c.name}</span>
                        <span className="text-[10px] text-slate-400">Plano: {c.contractType}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs font-mono text-emerald-400">R$</span>
                        <input
                          type="number"
                          value={getClientValue(c)}
                          onChange={(e) => handleUpdateCustomValue(c.id, parseFloat(e.target.value) || 0)}
                          className="w-16 px-1.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-white text-right focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SEÇÃO 2: RESUMO FINANCEIRO E DE AULAS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 print:text-black">
                <DollarSign className="w-4 h-4 text-emerald-400 print:text-black" />
                Resumo Financeiro & Desempenho
              </h3>
              <span className="text-xs text-slate-400 print:text-slate-600">
                {financialSummary.realizadas} aulas realizadas com sucesso
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Card 1: Aulas Avulsas (Soma do valor conforme solicitado pelo usuário) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 print:bg-white print:border print:border-black">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide block print:text-black">
                  Aulas Avulsas
                </span>
                <span className="text-xl sm:text-2xl font-black text-white font-mono block mt-1 print:text-black">
                  R$ {financialSummary.avulsasTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block print:text-slate-700">
                  {financialSummary.avulsasCount} {financialSummary.avulsasCount === 1 ? 'aula avulsa' : 'aulas avulsas'} somadas
                </span>
              </div>

              {/* Card 2: Planos Semanais */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/30 print:bg-white print:border print:border-black">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide block print:text-black">
                  Planos Semanais
                </span>
                <span className="text-xl sm:text-2xl font-black text-white font-mono block mt-1 print:text-black">
                  R$ {financialSummary.totalSemanalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block print:text-slate-700">
                  {financialSummary.alunosSemanalCount} alunos com plano semanal
                </span>
              </div>

              {/* Card 3: Planos Mensais */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/30 print:bg-white print:border print:border-black">
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wide block print:text-black">
                  Planos Mensais
                </span>
                <span className="text-xl sm:text-2xl font-black text-white font-mono block mt-1 print:text-black">
                  R$ {financialSummary.totalMensalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block print:text-slate-700">
                  {financialSummary.alunosMensalCount} alunos com plano mensal
                </span>
              </div>

              {/* Card 4: Faturamento Total Consolidado */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 print:bg-white print:border print:border-black">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide block print:text-black">
                  Receita Consolidada
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono block mt-1 print:text-black">
                  R$ {financialSummary.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block print:text-slate-700">
                  Total de avulsas + planos
                </span>
              </div>
            </div>

            {/* Fita de Status das Aulas */}
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="py-2 px-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-center gap-2 print:border-black">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 print:text-black" />
                <span className="text-xs font-bold text-emerald-300 print:text-black">
                  {financialSummary.realizadas} Realizadas
                </span>
              </div>

              <div className="py-2 px-3 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-center justify-center gap-2 print:border-black">
                <RotateCcw className="w-3.5 h-3.5 text-amber-400 print:text-black" />
                <span className="text-xs font-bold text-amber-300 print:text-black">
                  {financialSummary.reagendadas} Reagendadas
                </span>
              </div>

              <div className="py-2 px-3 rounded-xl bg-rose-950/20 border border-rose-500/20 flex items-center justify-center gap-2 print:border-black">
                <XCircle className="w-3.5 h-3.5 text-rose-400 print:text-black" />
                <span className="text-xs font-bold text-rose-300 print:text-black">
                  {financialSummary.faltas} Faltas
                </span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: TABELA DETALHADA DAS AULAS (LEDGER) */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 print:text-black">
              <Layers className="w-4 h-4 text-purple-400 print:text-black" />
              Detalhamento das Aulas ({filteredEvents.length})
            </h3>

            {filteredEvents.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/50 border border-slate-800 text-center space-y-2">
                <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-300">Nenhum registro encontrado no período selecionado.</p>
                <p className="text-[11px] text-slate-500">Tente ajustar as datas inicial e final ou os filtros de status.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/90 print:border print:border-black print:rounded-none">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider print:bg-slate-200 print:text-black print:border-black">
                      <th className="p-3">Data & Horário</th>
                      <th className="p-3">Aluno</th>
                      <th className="p-3">Plano</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Treino Realizado / Descrição</th>
                      <th className="p-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 print:divide-black">
                    {filteredEvents.map((evt) => {
                      const client = clients.find((c) => c.id === evt.clientId);
                      const workoutDetails = getWorkoutDetailsForEvent(evt);
                      const contract = client?.contractType || 'Avulsa';
                      const value = client ? getClientValue(client) : 80;

                      // Badge de status
                      const statusMap = {
                        realizado: {
                          label: 'Realizada',
                          cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 print:text-black',
                          icon: CheckCircle2,
                        },
                        reagendado: {
                          label: 'Reagendada',
                          cls: 'bg-amber-500/10 text-amber-400 border border-amber-500/30 print:text-black',
                          icon: RotateCcw,
                        },
                        falta: {
                          label: 'Falta',
                          cls: 'bg-rose-500/10 text-rose-400 border border-rose-500/30 print:text-black',
                          icon: XCircle,
                        },
                        confirmado: {
                          label: 'Agendada',
                          cls: 'bg-purple-500/10 text-purple-400 border border-purple-500/30 print:text-black',
                          icon: Calendar,
                        },
                        cancelado: {
                          label: 'Cancelada',
                          cls: 'bg-slate-800 text-slate-400 border border-slate-700 print:text-black',
                          icon: X,
                        },
                      };

                      const currentStatus = statusMap[evt.status] || statusMap.confirmado;
                      const StatusIcon = currentStatus.icon;

                      return (
                        <tr
                          key={evt.id}
                          className="hover:bg-slate-900/50 transition-colors print:hover:bg-transparent"
                        >
                          {/* Data e Horário */}
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-mono font-bold text-white block print:text-black">
                              {evt.date.split('-').reverse().join('/')}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5 print:text-slate-600">
                              <Clock className="w-3 h-3 text-purple-400 print:hidden" />
                              {evt.startTime} - {evt.endTime}
                            </span>
                          </td>

                          {/* Aluno */}
                          <td className="p-3">
                            <span className="font-bold text-white block print:text-black">
                              {evt.clientName}
                            </span>
                          </td>

                          {/* Plano do Aluno */}
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              contract === 'Avulsa'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : contract === 'Semanal'
                                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                                : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                            } print:border-black print:text-black`}>
                              {contract}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="p-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${currentStatus.cls}`}>
                              <StatusIcon className="w-3 h-3" />
                              <span>{currentStatus.label}</span>
                            </span>
                            {evt.status === 'reagendado' && evt.rescheduledDate && (
                              <span className="block text-[10px] text-amber-300 mt-1 font-mono">
                                ↺ Nova data: {evt.rescheduledDate.split('-').reverse().join('/')} {evt.rescheduledTime ? `às ${evt.rescheduledTime}` : ''}
                              </span>
                            )}
                          </td>

                          {/* Descrição do Treino Realizado */}
                          <td className="p-3 max-w-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <Dumbbell className="w-3.5 h-3.5 text-cyan-400 shrink-0 print:hidden" />
                                <span className="font-semibold text-slate-200 truncate block print:text-black">
                                  {workoutDetails.title}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 block print:text-slate-600">
                                {workoutDetails.summary}
                              </span>
                              {workoutDetails.volumeKg && workoutDetails.volumeKg > 0 && (
                                <span className="text-[10px] font-mono text-emerald-400 block print:text-black">
                                  Volume: {workoutDetails.volumeKg.toLocaleString('pt-BR')} kg {workoutDetails.duration ? `• ${workoutDetails.duration}` : ''}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Valor Financeiro */}
                          <td className="p-3 text-right font-mono font-bold whitespace-nowrap">
                            {contract === 'Avulsa' ? (
                              <div>
                                <span className="text-emerald-400 print:text-black">
                                  R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-[9px] text-slate-400 block font-sans">
                                  {evt.status === 'realizado' ? 'faturado' : 'não faturado'}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-slate-300 print:text-black">
                                  R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-[9px] text-slate-400 block font-sans">
                                  {contract === 'Semanal' ? 'por semana' : 'por mês'}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RODAPÉ DO RELATÓRIO PARA IMPRESSÃO / PDF */}
          <div className="hidden print:block pt-6 border-t-2 border-black text-center text-xs text-black space-y-1">
            <p className="font-bold">IRON COACH PWA - Sistema Profissional de Gestão de Treinamento & Agenda</p>
            <p>Relatório gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </div>

        {/* RODAPÉ DO MODAL (Botões de Ação) */}
        <div className="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-950/80 rounded-b-3xl print:hidden">
          <div className="text-xs text-slate-400">
            Exportação compatível com PDF (formato A4) e impressoras térmicas/padrão.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition active:scale-95"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handlePrintDocument}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95 transition"
            >
              <Printer className="w-4 h-4 text-purple-400" />
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950/50 active:scale-95 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Gerando...' : 'Baixar Relatório (PDF)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
