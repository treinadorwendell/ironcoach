'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CalendarEvent, Client, AgendaViewMode, CalendarEventStatus } from '@/types';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Play,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  User,
  Repeat,
  RotateCcw,
  XCircle,
  AlertCircle,
  CalendarClock,
  Check,
  Filter,
  FileText,
} from 'lucide-react';
import { AgendaReportModal } from '@/components/AgendaReportModal';
import { storage } from '@/lib/storage';
import { CompletedWorkoutRecord } from '@/types';

interface AgendaSectionProps {
  events: CalendarEvent[];
  clients: Client[];
  completedWorkouts?: CompletedWorkoutRecord[];
  onAddEvent: (event: CalendarEvent) => void;
  onUpdateEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onStartWorkoutForClient: (client: Client) => void;
}

const DAYS_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

// Retorna a data atual no formato YYYY-MM-DD de acordo com o fuso local
export const getTodayDateStr = (): string => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const AgendaSection: React.FC<AgendaSectionProps> = ({
  events,
  clients,
  completedWorkouts,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onStartWorkoutForClient,
}) => {
  const [viewMode, setViewMode] = useState<AgendaViewMode>('dia');
  const [isViewModeMenuOpen, setIsViewModeMenuOpen] = useState(false);
  const viewModeMenuRef = useRef<HTMLDivElement>(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown de seleção de visualização ou status ao clicar fora
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (viewModeMenuRef.current && !viewModeMenuRef.current.contains(e.target as Node)) {
        setIsViewModeMenuOpen(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setIsStatusMenuOpen(false);
      }
    };
    if (isViewModeMenuOpen || isStatusMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isViewModeMenuOpen, isStatusMenuOpen]);

  // Sempre inicializa com o dia atual de acordo com a data de hoje
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);

  // Status Filter State
  const [statusFilter, setStatusFilter] = useState<'todos' | CalendarEventStatus>('todos');

  // Form State
  const [selectedClientId, setSelectedClientId] = useState<string>(
    clients[0]?.id || ''
  );
  const [eventTitle, setEventTitle] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('08:00');
  const [eventDate, setEventDate] = useState<string>(getTodayDateStr);
  const [recurringDays, setRecurringDays] = useState<number[]>([]); // Inicializado vazio para evitar duplicações automáticas
  const [eventNotes, setEventNotes] = useState('');
  const [eventStatus, setEventStatus] = useState<CalendarEventStatus>('confirmado');
  const [rescheduledDate, setRescheduledDate] = useState('');
  const [rescheduledTime, setRescheduledTime] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // Validação de chave única (clientId + date): impede a criação de múltiplos agendamentos no mesmo dia para o mesmo aluno
  const duplicateConflict = useMemo(() => {
    if (!selectedClientId || !eventDate || !isModalOpen) return null;
    return events.find(
      (e) => e.clientId === selectedClientId && e.date === eventDate && e.id !== editingEvent?.id
    );
  }, [selectedClientId, eventDate, events, editingEvent, isModalOpen]);

  // Quick 1-tap Status Change Handler
  const handleQuickStatusChange = (event: CalendarEvent, newStatus: CalendarEventStatus) => {
    const updated: CalendarEvent = {
      ...event,
      status: newStatus,
    };
    onUpdateEvent(updated);
  };

  const openNewModal = (defaultDate?: string, defaultHour?: string) => {
    setEditingEvent(null);
    setSelectedClientId(clients[0]?.id || '');
    setEventTitle('Sessão de Personal Training');
    setStartTime(defaultHour || '07:00');
    setEndTime('08:00');
    setEventDate(defaultDate || selectedDate);
    setRecurringDays([]);
    setEventNotes('');
    setEventStatus('confirmado');
    setRescheduledDate('');
    setRescheduledTime('');
    setDuplicateError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setSelectedClientId(event.clientId);
    setEventTitle(event.title);
    setStartTime(event.startTime);
    setEndTime(event.endTime);
    setEventDate(event.date);
    setRecurringDays(event.recurringDays || []);
    setEventNotes(event.notes || '');
    setEventStatus(event.status || 'confirmado');
    setRescheduledDate(event.rescheduledDate || '');
    setRescheduledTime(event.rescheduledTime || '');
    setDuplicateError(null);
    setIsModalOpen(true);
  };

  const toggleRecurringDay = (dayIndex: number) => {
    if (recurringDays.includes(dayIndex)) {
      setRecurringDays(recurringDays.filter((d) => d !== dayIndex));
    } else {
      setRecurringDays([...recurringDays, dayIndex].sort());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Verificação de chave única (clientId + date)
    if (duplicateConflict) {
      setDuplicateError(
        `Já existe um agendamento cadastrado para este aluno nesta data (${eventDate.split('-').reverse().join('/')}) às ${duplicateConflict.startTime}. Não é permitido duplicar agendamentos no mesmo dia.`
      );
      return;
    }

    const client = clients.find((c) => c.id === selectedClientId);
    const clientName = client ? client.name : 'Aluno';

    if (editingEvent) {
      const updated: CalendarEvent = {
        ...editingEvent,
        clientId: selectedClientId,
        clientName,
        title: eventTitle.trim() || `Treino com ${clientName}`,
        date: eventDate,
        startTime,
        endTime,
        recurringDays,
        notes: eventNotes.trim(),
        status: eventStatus,
        rescheduledDate: eventStatus === 'reagendado' ? rescheduledDate : undefined,
        rescheduledTime: eventStatus === 'reagendado' ? rescheduledTime : undefined,
      };
      onUpdateEvent(updated);
    } else {
      const newEvt: CalendarEvent = {
        id: `evt-${Date.now()}`,
        clientId: selectedClientId,
        clientName,
        title: eventTitle.trim() || `Treino com ${clientName}`,
        date: eventDate,
        startTime,
        endTime,
        recurringDays,
        notes: eventNotes.trim(),
        status: eventStatus,
        rescheduledDate: eventStatus === 'reagendado' ? rescheduledDate : undefined,
        rescheduledTime: eventStatus === 'reagendado' ? rescheduledTime : undefined,
      };
      onAddEvent(newEvt);
    }
    setDuplicateError(null);
    setIsModalOpen(false);
  };

  // Date navigation helpers que tratam corretamente os limites de mês e ano
  const handlePrevDate = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    if (viewMode === 'dia') {
      const cur = new Date(y, m - 1, d);
      cur.setDate(cur.getDate() - 1);
      const newY = cur.getFullYear();
      const newM = String(cur.getMonth() + 1).padStart(2, '0');
      const newD = String(cur.getDate()).padStart(2, '0');
      setSelectedDate(`${newY}-${newM}-${newD}`);
    } else if (viewMode === 'semana') {
      const cur = new Date(y, m - 1, d);
      cur.setDate(cur.getDate() - 7);
      const newY = cur.getFullYear();
      const newM = String(cur.getMonth() + 1).padStart(2, '0');
      const newD = String(cur.getDate()).padStart(2, '0');
      setSelectedDate(`${newY}-${newM}-${newD}`);
    } else if (viewMode === 'mes') {
      const prevDate = new Date(y, m - 2, 1);
      const newY = prevDate.getFullYear();
      const newM = String(prevDate.getMonth() + 1).padStart(2, '0');
      setSelectedDate(`${newY}-${newM}-01`);
    } else if (viewMode === 'ano') {
      const newY = y - 1;
      const newM = String(m).padStart(2, '0');
      setSelectedDate(`${newY}-${newM}-01`);
    }
  };

  const handleNextDate = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    if (viewMode === 'dia') {
      const cur = new Date(y, m - 1, d);
      cur.setDate(cur.getDate() + 1);
      const newY = cur.getFullYear();
      const newM = String(cur.getMonth() + 1).padStart(2, '0');
      const newD = String(cur.getDate()).padStart(2, '0');
      setSelectedDate(`${newY}-${newM}-${newD}`);
    } else if (viewMode === 'semana') {
      const cur = new Date(y, m - 1, d);
      cur.setDate(cur.getDate() + 7);
      const newY = cur.getFullYear();
      const newM = String(cur.getMonth() + 1).padStart(2, '0');
      const newD = String(cur.getDate()).padStart(2, '0');
      setSelectedDate(`${newY}-${newM}-${newD}`);
    } else if (viewMode === 'mes') {
      const nextDate = new Date(y, m, 1);
      const newY = nextDate.getFullYear();
      const newM = String(nextDate.getMonth() + 1).padStart(2, '0');
      setSelectedDate(`${newY}-${newM}-01`);
    } else if (viewMode === 'ano') {
      const newY = y + 1;
      const newM = String(m).padStart(2, '0');
      setSelectedDate(`${newY}-${newM}-01`);
    }
  };

  const handleToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  // Format date display
  const [selYear, selMonth, selDay] = selectedDate.split('-').map(Number);
  const currentDateObj = new Date(selYear, selMonth - 1, selDay);
  const formattedDayStr = `${
    DAYS_NAMES[currentDateObj.getDay()]
  }, ${currentDateObj.getDate()} de ${MONTHS_NAMES[currentDateObj.getMonth()]} de ${currentDateObj.getFullYear()}`;

  // Filter events by status if requested
  const filteredEvents = events.filter((e) => {
    if (statusFilter === 'todos') return true;
    if (statusFilter === 'confirmado') return !e.status || e.status === 'confirmado';
    return e.status === statusFilter;
  });

  // Filter events for the current date (single date or matching recurring day strictly if defined)
  const currentDayOfWeek = currentDateObj.getDay();
  const dayEvents = useMemo(() => {
    const directEvents = filteredEvents.filter((e) => e.date === selectedDate);
    const clientsWithDirect = new Set(directEvents.map((e) => e.clientId));

    const recurringEvents = filteredEvents.filter((e) => {
      if (e.date === selectedDate) return false;
      const isRecurring =
        e.recurringDays &&
        e.recurringDays.length > 0 &&
        e.recurringDays.includes(currentDayOfWeek);
      return isRecurring && !clientsWithDirect.has(e.clientId);
    });

    return [...directEvents, ...recurringEvents];
  }, [filteredEvents, selectedDate, currentDayOfWeek]);

  // Cálculo dinâmico dos 7 dias da semana atual para a visualização 'semana'
  const currentWeekDays = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const cur = new Date(y, m - 1, d);
    const dayOfWeek = cur.getDay(); // 0 = Dom .. 6 = Sab
    const startOfWeek = new Date(cur);
    startOfWeek.setDate(cur.getDate() - dayOfWeek);

    return Array.from({ length: 7 }).map((_, idx) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + idx);
      const yearStr = dayDate.getFullYear();
      const monthStr = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dayDate.getDate()).padStart(2, '0');
      const dateKey = `${yearStr}-${monthStr}-${dayStr}`;

      return {
        idx,
        dayName: DAYS_NAMES[idx],
        dateStr: dateKey,
        dayNum: dayDate.getDate(),
        monthShort: MONTHS_NAMES[dayDate.getMonth()].slice(0, 3),
        isToday: dateKey === selectedDate,
      };
    });
  }, [selectedDate]);

  // Grade dinâmica de dias do mês com cálculo preciso dos dias da semana de acordo com o mês
  const monthData = useMemo(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    const year = y;
    const monthIndex = m - 1; // 0..11

    const firstDayOfWeek = new Date(year, monthIndex, 1).getDay(); // 0 = Dom..6 = Sab
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

    // Dias do mês anterior para preencher a primeira semana
    const prevMonthCells: Array<{ dayNum: number; dateKey: string; isCurrentMonth: boolean }> = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevDate = new Date(year, monthIndex - 1, dNum);
      const prevY = prevDate.getFullYear();
      const prevM = String(prevDate.getMonth() + 1).padStart(2, '0');
      const prevD = String(dNum).padStart(2, '0');
      prevMonthCells.push({
        dayNum: dNum,
        dateKey: `${prevY}-${prevM}-${prevD}`,
        isCurrentMonth: false,
      });
    }

    // Dias do mês atual
    const currentMonthCells: Array<{ dayNum: number; dateKey: string; isCurrentMonth: boolean }> = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      currentMonthCells.push({
        dayNum: d,
        dateKey,
        isCurrentMonth: true,
      });
    }

    // Dias do próximo mês para completar semanas de 7 dias
    const totalCells = prevMonthCells.length + currentMonthCells.length;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    const nextMonthCells: Array<{ dayNum: number; dateKey: string; isCurrentMonth: boolean }> = [];
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, monthIndex + 1, d);
      const nextY = nextDate.getFullYear();
      const nextM = String(nextDate.getMonth() + 1).padStart(2, '0');
      const nextD = String(d).padStart(2, '0');
      nextMonthCells.push({
        dayNum: d,
        dateKey: `${nextY}-${nextM}-${nextD}`,
        isCurrentMonth: false,
      });
    }

    return {
      year,
      monthIndex,
      monthName: MONTHS_NAMES[monthIndex],
      cells: [...prevMonthCells, ...currentMonthCells, ...nextMonthCells],
    };
  }, [selectedDate]);

  return (
    <div className="space-y-4 pb-24">
      {/* Top Google Agenda Style Navigation Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3">
        {/* View Switcher: Dia | Semana | Mês | Ano | Programação */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
          {/* Botão seletor de modo de visualização (Dia, Semana, Mês, Ano, Programação) */}
          <div ref={viewModeMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsViewModeMenuOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs shadow-md border transition-all active:scale-95 cursor-pointer ${
                isViewModeMenuOpen
                  ? 'bg-purple-600 text-white border-purple-500 shadow-purple-950/50'
                  : 'bg-slate-950 hover:bg-slate-850 text-slate-100 hover:text-white border-slate-700/80 hover:border-purple-500/50'
              }`}
              aria-expanded={isViewModeMenuOpen}
              aria-haspopup="true"
              title="Alternar modo de visualização da agenda"
            >
              <CalendarIcon className={`w-3.5 h-3.5 ${isViewModeMenuOpen ? 'text-white' : 'text-purple-400'}`} />
              <span className="font-extrabold tracking-tight">
                {viewMode === 'dia'
                  ? 'Dia'
                  : viewMode === 'semana'
                  ? 'Semana'
                  : viewMode === 'mes'
                  ? 'Mês'
                  : viewMode === 'ano'
                  ? 'Ano'
                  : 'Programação'}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isViewModeMenuOpen ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>

            {/* Menu Dropdown com as opções */}
            {isViewModeMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-2 w-44 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-50 p-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1">
                  Visualização
                </div>
                {(
                  [
                    { id: 'dia', label: 'Dia' },
                    { id: 'semana', label: 'Semana' },
                    { id: 'mes', label: 'Mês' },
                    { id: 'ano', label: 'Ano' },
                    { id: 'programacao', label: 'Programação' },
                  ] as const
                ).map((tab) => {
                  const isSelected = viewMode === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setViewMode(tab.id);
                        setIsViewModeMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition active:scale-[0.98] cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700/80 shadow-md active:scale-95 transition"
              title="Abrir Relatório de Aulas e Financeiro"
            >
              <FileText className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">Relatório & Financeiro</span>
              <span className="sm:hidden">Relatório</span>
            </button>

            <button
              onClick={() => openNewModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-950/50 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Compromisso</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>

        {/* Date Navigator & Quick Jump */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 active:scale-95"
            >
              Hoje
            </button>
            <div className="flex items-center gap-0.5 bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60">
              <button
                onClick={handlePrevDate}
                className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextDate}
                className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-sm font-bold text-white capitalize hidden sm:block">
              {viewMode === 'mes'
                ? `${monthData.monthName} de ${monthData.year}`
                : viewMode === 'ano'
                ? `Ano ${monthData.year}`
                : viewMode === 'semana'
                ? `Semana (${currentWeekDays[0]?.dayNum} ${currentWeekDays[0]?.monthShort} a ${currentWeekDays[6]?.dayNum} ${currentWeekDays[6]?.monthShort})`
                : formattedDayStr}
            </h2>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
          />
        </div>
        <h2 className="text-xs font-bold text-slate-300 capitalize sm:hidden">
          {viewMode === 'mes'
            ? `${monthData.monthName} de ${monthData.year}`
            : viewMode === 'ano'
            ? `Ano ${monthData.year}`
            : viewMode === 'semana'
            ? `Semana (${currentWeekDays[0].dayNum} ${currentWeekDays[0].monthShort} a ${currentWeekDays[6].dayNum} ${currentWeekDays[6].monthShort})`
            : formattedDayStr}
        </h2>

        {/* Attendance Status Filter & Counters Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-purple-400" />
            <span>Status da Agenda:</span>
          </span>

          {/* Touch-Friendly Status Selector Dropdown */}
          <div ref={statusMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsStatusMenuOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs shadow-md border transition-all active:scale-95 cursor-pointer ${
                isStatusMenuOpen
                  ? 'bg-purple-600 text-white border-purple-500 shadow-purple-950/50'
                  : 'bg-slate-950 hover:bg-slate-850 text-slate-100 hover:text-white border-slate-700/80 hover:border-purple-500/50'
              }`}
              aria-expanded={isStatusMenuOpen}
              aria-haspopup="true"
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    statusFilter === 'realizado'
                      ? '#10b981'
                      : statusFilter === 'reagendado'
                      ? '#f59e0b'
                      : statusFilter === 'falta'
                      ? '#ef4444'
                      : statusFilter === 'confirmado'
                      ? '#a855f7'
                      : '#94a3b8',
                }}
              />
              <span className="font-extrabold tracking-tight">
                {statusFilter === 'todos'
                  ? `Todos (${events.length})`
                  : statusFilter === 'realizado'
                  ? `Realizado (${events.filter((e) => e.status === 'realizado').length})`
                  : statusFilter === 'reagendado'
                  ? `Reagendado (${events.filter((e) => e.status === 'reagendado').length})`
                  : statusFilter === 'falta'
                  ? `Falta (${events.filter((e) => e.status === 'falta').length})`
                  : `Agendado (${
                      events.filter((e) => !e.status || e.status === 'confirmado').length
                    })`}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isStatusMenuOpen ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>

            {/* Dropdown Options with Auto-Close */}
            {isStatusMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-50 p-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 space-y-0.5"
              >
                <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1">
                  Filtrar por Status
                </div>
                {[
                  { id: 'todos', label: 'Todos', count: events.length, color: '#94a3b8' },
                  {
                    id: 'realizado',
                    label: 'Realizado',
                    count: events.filter((e) => e.status === 'realizado').length,
                    color: '#10b981',
                  },
                  {
                    id: 'reagendado',
                    label: 'Reagendado',
                    count: events.filter((e) => e.status === 'reagendado').length,
                    color: '#f59e0b',
                  },
                  {
                    id: 'falta',
                    label: 'Falta',
                    count: events.filter((e) => e.status === 'falta').length,
                    color: '#ef4444',
                  },
                  {
                    id: 'confirmado',
                    label: 'Agendado',
                    count: events.filter((e) => !e.status || e.status === 'confirmado').length,
                    color: '#a855f7',
                  },
                ].map((item) => {
                  const isSelected = statusFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setStatusFilter(item.id as any);
                        setIsStatusMenuOpen(false); // Fechamento automático após escolher
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition active:scale-[0.98] cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                            isSelected ? 'bg-purple-950/80 text-white' : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          {item.count}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VIEW: DIA (Hour-by-hour schedule grid) */}
      {viewMode === 'dia' && (
        <div className="space-y-2">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 mb-2 border-b border-slate-800 font-semibold">
              <span>Horário da Grade</span>
              <span>
                {dayEvents.length} {dayEvents.length === 1 ? 'aula agendada' : 'aulas agendadas'}
              </span>
            </div>

            {/* Hourly Slots from 06:00 to 21:00 */}
            <div className="space-y-2">
              {[
                '06:00',
                '07:00',
                '08:00',
                '09:00',
                '10:00',
                '11:00',
                '14:00',
                '15:00',
                '16:00',
                '17:00',
                '18:00',
                '19:00',
                '20:00',
              ].map((hour) => {
                const hourEvents = dayEvents.filter((ev) => ev.startTime.startsWith(hour.slice(0, 2)));

                return (
                  <div
                    key={hour}
                    className="flex items-start gap-2.5 min-h-[48px] group rounded-xl p-1.5 hover:bg-slate-800/40 transition"
                  >
                    {/* Time Label */}
                    <span className="w-14 text-xs font-mono text-slate-500 pt-1 flex-shrink-0">
                      {hour}
                    </span>

                    {/* Event Blocks or Empty Slot */}
                    <div className="flex-1">
                      {hourEvents.length === 0 ? (
                        <button
                          onClick={() => openNewModal(selectedDate, hour)}
                          className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-800 hover:border-purple-500/50 hover:bg-purple-950/10 text-left text-xs text-slate-600 hover:text-purple-300 transition flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5 opacity-60" />
                          <span>Horário Livre (Toque para agendar)</span>
                        </button>
                      ) : (
                        <div className="space-y-2">
                          {hourEvents.map((evt) => {
                            const client = clients.find((c) => c.id === evt.clientId);
                            const isRealizado = evt.status === 'realizado';
                            const isReagendado = evt.status === 'reagendado';
                            const isFalta = evt.status === 'falta';

                            const cardBgBorder = isRealizado
                              ? 'bg-gradient-to-r from-emerald-950/40 to-slate-900 border-emerald-600/50'
                              : isReagendado
                              ? 'bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-600/50'
                              : isFalta
                              ? 'bg-gradient-to-r from-rose-950/40 to-slate-900 border-rose-600/50'
                              : 'bg-gradient-to-r from-purple-950/60 to-slate-900 border-purple-800/50';

                            return (
                              <div
                                key={evt.id}
                                className={`p-3 rounded-xl border shadow-md space-y-2.5 transition ${cardBgBorder}`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-sm text-white">
                                        {evt.clientName}
                                      </span>

                                      {/* Status Badge */}
                                      {isRealizado && (
                                        <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                          <CheckCircle2 className="w-3 h-3" />
                                          Realizado
                                        </span>
                                      )}
                                      {isReagendado && (
                                        <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                          <RotateCcw className="w-3 h-3" />
                                          Reagendado
                                        </span>
                                      )}
                                      {isFalta && (
                                        <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                          <XCircle className="w-3 h-3" />
                                          Falta
                                        </span>
                                      )}
                                      {(!evt.status || evt.status === 'confirmado') && (
                                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                          <CalendarIcon className="w-2.5 h-2.5" />
                                          Agendado
                                        </span>
                                      )}

                                      {evt.recurringDays && evt.recurringDays.length > 0 && (
                                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                          <Repeat className="w-2.5 h-2.5" />
                                          Recorrente
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                                      <span className="flex items-center gap-1 text-purple-300 font-mono font-semibold">
                                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                                        {evt.startTime} - {evt.endTime}
                                      </span>
                                      <span>•</span>
                                      <span className="font-medium text-slate-300">{evt.title}</span>
                                    </div>

                                    {/* Informações de Reagendamento */}
                                    {isReagendado && (evt.rescheduledDate || evt.rescheduledTime) && (
                                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-500/30">
                                        <CalendarClock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                        <span>
                                          Novo horário agendado: {evt.rescheduledDate ? evt.rescheduledDate : ''}{' '}
                                          {evt.rescheduledTime ? `às ${evt.rescheduledTime}` : ''}
                                        </span>
                                      </div>
                                    )}

                                    {evt.notes && (
                                      <p className="text-[11px] text-slate-400 italic">
                                        &ldquo;{evt.notes}&rdquo;
                                      </p>
                                    )}
                                  </div>

                                  {/* Options on Card: Iniciar Treino, Editar, Excluir */}
                                  <div className="flex items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 self-end sm:self-center">
                                    {client && (
                                      <button
                                        onClick={() => onStartWorkoutForClient(client)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md active:scale-95 transition"
                                        title="Iniciar Treino Imediatamente"
                                      >
                                        <Play className="w-3.5 h-3.5 fill-white" />
                                        <span>Treinar</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => openEditModal(evt)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95"
                                      title="Editar Compromisso"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEventToDelete(evt)}
                                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 active:scale-95"
                                      title="Excluir Compromisso"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Barra Rápida de Alteração de Status da Aula (1 Toque) */}
                                <div className="flex items-center gap-1 flex-wrap pt-2 border-t border-slate-800/70">
                                  <span className="text-[10px] font-bold text-slate-400 mr-1">
                                    Alterar Status:
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => handleQuickStatusChange(evt, 'realizado')}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition flex items-center gap-1 active:scale-95 ${
                                      isRealizado
                                        ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                                        : 'bg-slate-900/90 hover:bg-emerald-950/50 text-slate-300 hover:text-emerald-300 border border-slate-800'
                                    }`}
                                    title="Marcar aula como Realizada"
                                  >
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    <span>Realizado</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleQuickStatusChange(evt, 'reagendado')}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition flex items-center gap-1 active:scale-95 ${
                                      isReagendado
                                        ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400'
                                        : 'bg-slate-900/90 hover:bg-amber-950/50 text-slate-300 hover:text-amber-300 border border-slate-800'
                                    }`}
                                    title="Marcar aula como Reagendada"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    <span>Reagendado</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleQuickStatusChange(evt, 'falta')}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition flex items-center gap-1 active:scale-95 ${
                                      isFalta
                                        ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400'
                                        : 'bg-slate-900/90 hover:bg-rose-950/50 text-slate-300 hover:text-rose-300 border border-slate-800'
                                    }`}
                                    title="Marcar falta do aluno"
                                  >
                                    <XCircle className="w-2.5 h-2.5" />
                                    <span>Falta</span>
                                  </button>

                                  {evt.status !== 'confirmado' && (
                                    <button
                                      type="button"
                                      onClick={() => handleQuickStatusChange(evt, 'confirmado')}
                                      className="px-2 py-0.5 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-white bg-slate-900/90 hover:bg-purple-950/50 border border-slate-800 transition active:scale-95 ml-auto"
                                      title="Redefinir para Agendado"
                                    >
                                      <span>↺ Agendado</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: SEMANA (Weekly Columns) */}
      {/* VIEW: SEMANA (Weekly Columns com datas reais e alinhadas) */}
      {viewMode === 'semana' && (
        <div className="grid grid-cols-7 gap-1.5 overflow-x-auto pb-2">
          {currentWeekDays.map((day) => {
            const dayEvts = filteredEvents.filter((e) => e.date === day.dateStr);
            const clientsWithDirect = new Set(dayEvts.map((e) => e.clientId));
            const recurringEvts = filteredEvents.filter((e) => {
              if (e.date === day.dateStr) return false;
              const isRecurring =
                e.recurringDays &&
                e.recurringDays.length > 0 &&
                e.recurringDays.includes(day.idx);
              return isRecurring && !clientsWithDirect.has(e.clientId);
            });
            const allDayEvts = [...dayEvts, ...recurringEvts];

            return (
              <div
                key={day.dateStr}
                className={`min-w-[110px] p-2.5 rounded-xl border space-y-2 flex flex-col transition ${
                  day.isToday
                    ? 'bg-purple-950/25 border-purple-500/50 ring-1 ring-purple-500/40'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="text-center pb-2 border-b border-slate-800">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-xs font-bold text-white uppercase">{day.dayName}</span>
                    <span className={`text-xs font-black font-mono ${day.isToday ? 'text-purple-300' : 'text-slate-300'}`}>
                      {day.dayNum}
                    </span>
                  </div>
                  <span className="block text-[10px] text-slate-400 font-medium mt-0.5">
                    {day.monthShort} • {allDayEvts.length} {allDayEvts.length === 1 ? 'aula' : 'aulas'}
                  </span>
                </div>

                <div className="space-y-1.5 flex-1">
                  {allDayEvts.map((evt) => {
                    const isRealizado = evt.status === 'realizado';
                    const isReagendado = evt.status === 'reagendado';
                    const isFalta = evt.status === 'falta';

                    const weekCardClass = isRealizado
                      ? 'bg-emerald-950/40 border-emerald-600/50 hover:border-emerald-400'
                      : isReagendado
                      ? 'bg-amber-950/40 border-amber-600/50 hover:border-amber-400'
                      : isFalta
                      ? 'bg-rose-950/40 border-rose-600/50 hover:border-rose-400'
                      : 'bg-purple-950/60 border-purple-800/40 hover:border-purple-400';

                    return (
                      <div
                        key={evt.id}
                        onClick={() => openEditModal(evt)}
                        className={`p-2 rounded-lg border text-[11px] cursor-pointer transition space-y-1 ${weekCardClass}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-purple-300 block text-[10px] font-bold">
                            {evt.startTime}
                          </span>
                          {isRealizado && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400" title="Realizado" />
                          )}
                          {isReagendado && (
                            <span className="w-2 h-2 rounded-full bg-amber-400" title="Reagendado" />
                          )}
                          {isFalta && (
                            <span className="w-2 h-2 rounded-full bg-rose-400" title="Falta" />
                          )}
                          {(!evt.status || evt.status === 'confirmado') && (
                            <span className="w-2 h-2 rounded-full bg-purple-400" title="Agendado" />
                          )}
                        </div>
                        <strong className="text-white block truncate">{evt.clientName}</strong>
                        {isRealizado && (
                          <span className="text-[9px] font-extrabold text-emerald-400 block">✓ Realizado</span>
                        )}
                        {isReagendado && (
                          <span className="text-[9px] font-extrabold text-amber-400 block">↺ Reagendado</span>
                        )}
                        {isFalta && (
                          <span className="text-[9px] font-extrabold text-rose-400 block">✕ Falta</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => openNewModal(day.dateStr)}
                  className="w-full py-1 text-[11px] text-slate-400 hover:text-white bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 active:scale-95 transition"
                >
                  + Add
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: MÊS (Month Grid Dinâmica e Alinhada com os Dias da Semana) */}
      {viewMode === 'mes' && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-white pb-2 border-b border-slate-800">
            <span className="font-black text-base tracking-wide">
              {monthData.monthName} {monthData.year}
            </span>
            <span className="text-xs text-purple-400 font-semibold bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
              {events.filter((e) => e.date.startsWith(`${monthData.year}-${String(monthData.monthIndex + 1).padStart(2, '0')}`)).length} agendamentos no mês
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400">
            {DAYS_NAMES.map((d) => (
              <div key={d} className="py-1 uppercase text-[11px] tracking-wider">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {monthData.cells.map((cell) => {
              const dayEvts = events.filter((e) => e.date === cell.dateKey);
              const count = dayEvts.length;
              const isSelected = selectedDate === cell.dateKey;
              const hasRealizado = dayEvts.some((e) => e.status === 'realizado');
              const hasReagendado = dayEvts.some((e) => e.status === 'reagendado');
              const hasFalta = dayEvts.some((e) => e.status === 'falta');
              const hasAgendado = dayEvts.some((e) => !e.status || e.status === 'confirmado');

              if (!cell.isCurrentMonth) {
                return (
                  <button
                    key={cell.dateKey}
                    onClick={() => {
                      setSelectedDate(cell.dateKey);
                      setViewMode('dia');
                    }}
                    className="p-1.5 rounded-xl text-center transition flex flex-col items-center justify-between min-h-[56px] bg-slate-950/20 text-slate-600 border border-slate-900/40 hover:bg-slate-900/60 hover:text-slate-400"
                    title={`Ver dia ${cell.dayNum}`}
                  >
                    <span className="text-[11px] font-mono">{cell.dayNum}</span>
                    {count > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={cell.dateKey}
                  onClick={() => {
                    setSelectedDate(cell.dateKey);
                    setViewMode('dia');
                  }}
                  className={`p-1.5 sm:p-2 rounded-xl text-center transition flex flex-col items-center justify-between min-h-[56px] relative group active:scale-95 ${
                    isSelected
                      ? 'bg-purple-600 text-white font-black ring-2 ring-purple-400 shadow-lg shadow-purple-950/60'
                      : 'bg-slate-950/70 hover:bg-slate-800 text-slate-200 border border-slate-800/90'
                  }`}
                  title={`${cell.dayNum} de ${monthData.monthName} - ${count} aula(s)`}
                >
                  <div className="w-full flex items-center justify-between">
                    <span className={`text-xs font-mono font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {cell.dayNum}
                    </span>
                    {count > 0 && (
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-purple-950 text-purple-300 border border-purple-800/60'}`}>
                        {count}
                      </span>
                    )}
                  </div>

                  {/* Badges de Status das aulas do dia */}
                  <div className="flex items-center gap-1 mt-1">
                    {hasRealizado && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Possui aula realizada" />
                    )}
                    {hasReagendado && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Possui aula reagendada" />
                    )}
                    {hasFalta && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title="Possui falta" />
                    )}
                    {hasAgendado && (
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" title="Possui aula agendada" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: ANO (Annual Overview Dinâmico) */}
      {viewMode === 'ano' && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {MONTHS_NAMES.map((m, idx) => {
            const yearStr = selectedDate.split('-')[0];
            const monthPrefix = `${yearStr}-${String(idx + 1).padStart(2, '0')}`;
            const monthEvts = events.filter((e) => e.date.startsWith(monthPrefix));

            return (
              <div
                key={m}
                onClick={() => {
                  const newM = String(idx + 1).padStart(2, '0');
                  setSelectedDate(`${yearStr}-${newM}-01`);
                  setViewMode('mes');
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500 hover:bg-slate-850 cursor-pointer text-center transition active:scale-95"
              >
                <h4 className="text-xs font-bold text-white">{m}</h4>
                <p className="text-[10px] text-slate-400 mt-1">{yearStr}</p>
                <span className="mt-2 inline-block px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-purple-300 font-semibold border border-slate-700/60">
                  {monthEvts.length} {monthEvts.length === 1 ? 'aula' : 'aulas'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: PROGRAMAÇÃO (Continuous list view) */}
      {viewMode === 'programacao' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
            <span>Lista Cronológica de Aulas</span>
            <span>
              {filteredEvents.length} de {events.length} compromissos
            </span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 text-xs">
              Nenhuma aula encontrada com o filtro selecionado.
            </div>
          ) : (
            filteredEvents.map((evt) => {
              const client = clients.find((c) => c.id === evt.clientId);
              const isRealizado = evt.status === 'realizado';
              const isReagendado = evt.status === 'reagendado';
              const isFalta = evt.status === 'falta';

              const cardBgBorder = isRealizado
                ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-600/50'
                : isReagendado
                ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-600/50'
                : isFalta
                ? 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border-rose-600/50'
                : 'bg-slate-900 border-slate-800';

              return (
                <div
                  key={evt.id}
                  className={`p-4 rounded-2xl border shadow-md space-y-3 transition ${cardBgBorder}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                          {evt.date} • {evt.startTime} - {evt.endTime}
                        </span>
                        <strong className="text-sm font-bold text-white">{evt.clientName}</strong>

                        {/* Status Badge */}
                        {isRealizado && (
                          <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle2 className="w-3 h-3" />
                            Realizado
                          </span>
                        )}
                        {isReagendado && (
                          <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <RotateCcw className="w-3 h-3" />
                            Reagendado
                          </span>
                        )}
                        {isFalta && (
                          <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            <XCircle className="w-3 h-3" />
                            Falta
                          </span>
                        )}
                        {(!evt.status || evt.status === 'confirmado') && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            <CalendarIcon className="w-2.5 h-2.5" />
                            Agendado
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300">{evt.title}</p>

                      {isReagendado && (evt.rescheduledDate || evt.rescheduledTime) && (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-500/30">
                          <CalendarClock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span>
                            Novo horário: {evt.rescheduledDate ? evt.rescheduledDate : ''}{' '}
                            {evt.rescheduledTime ? `às ${evt.rescheduledTime}` : ''}
                          </span>
                        </div>
                      )}

                      {evt.notes && (
                        <p className="text-[11px] text-slate-400 italic">
                          &ldquo;{evt.notes}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {client && (
                        <button
                          onClick={() => onStartWorkoutForClient(client)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 shadow-md"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Iniciar</span>
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(evt)}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEventToDelete(evt)}
                        className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 active:scale-95"
                        title="Excluir Compromisso"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Barra Rápida de Alteração de Status */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">
                      Status da Aula:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(evt, 'realizado')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition flex items-center gap-1 active:scale-95 ${
                        isRealizado
                          ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                          : 'bg-slate-900 hover:bg-emerald-950/50 text-slate-300 hover:text-emerald-300 border border-slate-800'
                      }`}
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>Realizado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(evt, 'reagendado')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition flex items-center gap-1 active:scale-95 ${
                        isReagendado
                          ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400'
                          : 'bg-slate-900 hover:bg-amber-950/50 text-slate-300 hover:text-amber-300 border border-slate-800'
                      }`}
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reagendado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(evt, 'falta')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition flex items-center gap-1 active:scale-95 ${
                        isFalta
                          ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400'
                          : 'bg-slate-900 hover:bg-rose-950/50 text-slate-300 hover:text-rose-300 border border-slate-800'
                      }`}
                    >
                      <XCircle className="w-2.5 h-2.5" />
                      <span>Falta</span>
                    </button>
                    {evt.status !== 'confirmado' && (
                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(evt, 'confirmado')}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition active:scale-95 ml-auto"
                      >
                        <span>↺ Agendado</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Event Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingEvent ? 'Editar Compromisso' : 'Agendar Novo Horário'}
                  </h3>
                  <p className="text-xs text-slate-400">Google Agenda Style para Personal Trainers</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              {/* Selecionar Cliente */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Selecionar Aluno *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    required
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.contractType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Título / Objetivo do Horário */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Título da Aula
                </label>
                <input
                  type="text"
                  placeholder="Ex: Treino A - Peitoral e Tríceps"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Data e Horário (Início/Fim) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Início *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Fim *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              {/* Alerta de chave única duplicada (mesmo aluno no mesmo dia) */}
              {duplicateConflict && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5 text-xs text-amber-200 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300">
                        ⚠️ Aluno já possui agendamento nesta data!
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold">
                        {duplicateConflict.startTime} - {duplicateConflict.endTime}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      O aluno <strong>{duplicateConflict.clientName}</strong> já está agendado em {eventDate.split('-').reverse().join('/')} ({duplicateConflict.title}). Para evitar agendamentos duplicados, edite o compromisso existente ou escolha outra data.
                    </p>
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(duplicateConflict)}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] transition active:scale-95 shadow-sm"
                      >
                        Abrir e Editar Agendamento Existente
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {duplicateError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 flex items-center gap-2 text-xs text-rose-200 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{duplicateError}</span>
                </div>
              )}

              {/* Dias da Semana Recorrentes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Repetir nos dias da semana (Recorrência)
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS_NAMES.map((name, idx) => {
                    const isSelected = recurringDays.includes(idx);
                    return (
                      <button
                        type="button"
                        key={name}
                        onClick={() => toggleRecurringDay(idx)}
                        className={`py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status da Aula (Realizado, Reagendado, Falta, Agendado) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Status da Aula *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    {
                      value: 'realizado',
                      label: 'Realizado',
                      icon: CheckCircle2,
                      activeClass: 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-md',
                      inactiveClass:
                        'bg-slate-950 text-slate-300 border border-slate-800 hover:border-emerald-500/50',
                    },
                    {
                      value: 'reagendado',
                      label: 'Reagendado',
                      icon: RotateCcw,
                      activeClass: 'bg-amber-600 text-white ring-2 ring-amber-400 shadow-md',
                      inactiveClass:
                        'bg-slate-950 text-slate-300 border border-slate-800 hover:border-amber-500/50',
                    },
                    {
                      value: 'falta',
                      label: 'Falta',
                      icon: XCircle,
                      activeClass: 'bg-rose-600 text-white ring-2 ring-rose-400 shadow-md',
                      inactiveClass:
                        'bg-slate-950 text-slate-300 border border-slate-800 hover:border-rose-500/50',
                    },
                    {
                      value: 'confirmado',
                      label: 'Agendado',
                      icon: CalendarIcon,
                      activeClass: 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-md',
                      inactiveClass:
                        'bg-slate-950 text-slate-300 border border-slate-800 hover:border-purple-500/50',
                    },
                  ].map((opt) => {
                    const isSelected = eventStatus === opt.value;
                    const IconComp = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEventStatus(opt.value as CalendarEventStatus)}
                        className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 ${
                          isSelected ? opt.activeClass : opt.inactiveClass
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Campos adicionais quando status for 'Reagendado' */}
                {eventStatus === 'reagendado' && (
                  <div className="mt-2.5 p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2 animate-in fade-in duration-150">
                    <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <CalendarClock className="w-3.5 h-3.5 text-amber-400" />
                      Novo Horário da Aula Reagendada (Opcional):
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Nova Data</label>
                        <input
                          type="date"
                          value={rescheduledDate}
                          onChange={(e) => setRescheduledDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Novo Horário</label>
                        <input
                          type="time"
                          value={rescheduledTime}
                          onChange={(e) => setRescheduledTime(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações da Sessão
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Focar no aquecimento de ombro..."
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                {editingEvent ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEventToDelete(editingEvent);
                      setIsModalOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-bold transition active:scale-95"
                    title="Excluir este agendamento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Agendamento</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={Boolean(duplicateConflict)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition ${
                      duplicateConflict
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/50 active:scale-95'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingEvent ? 'Atualizar Agendamento' : 'Confirmar Horário'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Event Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-rose-500/50 p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Excluir Compromisso</h3>
              <p className="text-xs text-slate-300">
                Tem certeza que deseja desmarcar o compromisso com{' '}
                <strong className="text-rose-400 font-bold">{eventToDelete.clientName}</strong>?
              </p>
              <p className="text-[11px] text-slate-400">
                {eventToDelete.title} às {eventToDelete.startTime}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEventToDelete(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs active:scale-95 transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  onDeleteEvent(eventToDelete.id);
                  setEventToDelete(null);
                }}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 active:scale-95 transition"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Relatório de Aulas e Financeiro Modal */}
      <AgendaReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        events={events}
        clients={clients}
        completedWorkouts={completedWorkouts || (typeof window !== 'undefined' ? storage.getCompletedWorkouts() : [])}
      />
    </div>
  );
};
