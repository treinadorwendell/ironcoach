'use client';

import React, { useState } from 'react';
import { CalendarEvent, Client, AgendaViewMode } from '@/types';
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
  CheckCircle2,
  User,
  Repeat,
} from 'lucide-react';

interface AgendaSectionProps {
  events: CalendarEvent[];
  clients: Client[];
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

export const AgendaSection: React.FC<AgendaSectionProps> = ({
  events,
  clients,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onStartWorkoutForClient,
}) => {
  const [viewMode, setViewMode] = useState<AgendaViewMode>('dia');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-02');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState<string>(
    clients[0]?.id || ''
  );
  const [eventTitle, setEventTitle] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('08:00');
  const [eventDate, setEventDate] = useState('2026-10-02');
  const [recurringDays, setRecurringDays] = useState<number[]>([1, 3, 5]); // Seg, Qua, Sex
  const [eventNotes, setEventNotes] = useState('');

  const openNewModal = (defaultDate?: string, defaultHour?: string) => {
    setEditingEvent(null);
    setSelectedClientId(clients[0]?.id || '');
    setEventTitle('Sessão de Personal Training');
    setStartTime(defaultHour || '07:00');
    setEndTime('08:00');
    setEventDate(defaultDate || selectedDate);
    setRecurringDays([]);
    setEventNotes('');
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
        status: 'confirmado',
      };
      onAddEvent(newEvt);
    }
    setIsModalOpen(false);
  };

  // Date navigation helpers
  const handlePrevDate = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    if (viewMode === 'dia') d.setDate(d.getDate() - 1);
    else if (viewMode === 'semana') d.setDate(d.getDate() - 7);
    else if (viewMode === 'mes') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'ano') d.setFullYear(d.getFullYear() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDate = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    if (viewMode === 'dia') d.setDate(d.getDate() + 1);
    else if (viewMode === 'semana') d.setDate(d.getDate() + 7);
    else if (viewMode === 'mes') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'ano') d.setFullYear(d.getFullYear() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate('2026-10-02');
  };

  // Format date display
  const currentDateObj = new Date(selectedDate + 'T12:00:00');
  const formattedDayStr = `${
    DAYS_NAMES[currentDateObj.getDay()]
  }, ${currentDateObj.getDate()} de ${MONTHS_NAMES[currentDateObj.getMonth()]} de ${currentDateObj.getFullYear()}`;

  // Filter events for the current date (single date or matching recurring day)
  const currentDayOfWeek = currentDateObj.getDay();
  const dayEvents = events.filter((e) => {
    const isDirectDate = e.date === selectedDate;
    const isRecurring = e.recurringDays && e.recurringDays.includes(currentDayOfWeek);
    return isDirectDate || isRecurring;
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Top Google Agenda Style Navigation Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3">
        {/* View Switcher: Dia | Semana | Mês | Ano | Programação */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            {(
              [
                { id: 'dia', label: 'Dia' },
                { id: 'semana', label: 'Semana' },
                { id: 'mes', label: 'Mês' },
                { id: 'ano', label: 'Ano' },
                { id: 'programacao', label: 'Programação' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 ${
                  viewMode === tab.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => openNewModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-950/50 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Compromisso</span>
            <span className="sm:hidden">Novo</span>
          </button>
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
              {formattedDayStr}
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
          {formattedDayStr}
        </h2>
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

                            return (
                              <div
                                key={evt.id}
                                className="p-3 rounded-xl bg-gradient-to-r from-purple-950/60 to-slate-900 border border-purple-800/50 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-white">
                                      {evt.clientName}
                                    </span>
                                    {evt.recurringDays && evt.recurringDays.length > 0 && (
                                      <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                        <Repeat className="w-2.5 h-2.5" />
                                        Recorrente
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 text-xs text-slate-400">
                                    <span className="flex items-center gap-1 text-purple-300 font-mono">
                                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                                      {evt.startTime} - {evt.endTime}
                                    </span>
                                    <span>•</span>
                                    <span>{evt.title}</span>
                                  </div>

                                  {evt.notes && (
                                    <p className="text-[11px] text-slate-400 italic">
                                      {evt.notes}
                                    </p>
                                  )}
                                </div>

                                {/* Options on Card: Iniciar Treino, Editar, Excluir */}
                                <div className="flex items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
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
      {viewMode === 'semana' && (
        <div className="grid grid-cols-7 gap-1.5 overflow-x-auto pb-2">
          {DAYS_NAMES.map((dayName, idx) => {
            const dayEvts = events.filter((e) => {
              if (e.recurringDays && e.recurringDays.includes(idx)) return true;
              const dateOfEvent = new Date(e.date + 'T12:00:00');
              return dateOfEvent.getDay() === idx;
            });

            return (
              <div
                key={dayName}
                className="min-w-[100px] p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 flex flex-col"
              >
                <div className="text-center pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-white uppercase">{dayName}</span>
                  <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                    {dayEvts.length} aulas
                  </span>
                </div>

                <div className="space-y-1.5 flex-1">
                  {dayEvts.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => openEditModal(evt)}
                      className="p-1.5 rounded-lg bg-purple-950/60 border border-purple-800/40 text-[11px] cursor-pointer hover:border-purple-400 transition"
                    >
                      <span className="font-mono text-purple-300 block text-[10px]">
                        {evt.startTime}
                      </span>
                      <strong className="text-white block truncate">{evt.clientName}</strong>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => openNewModal(selectedDate)}
                  className="w-full py-1 text-[11px] text-slate-400 hover:text-white bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700"
                >
                  + Add
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: MÊS (Month Grid) */}
      {viewMode === 'mes' && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="text-center font-bold text-base text-white">
            {MONTHS_NAMES[currentDateObj.getMonth()]} {currentDateObj.getFullYear()}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
            {DAYS_NAMES.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }).map((_, i) => {
              const dayNum = i + 1;
              const dateKey = `2026-10-${String(dayNum).padStart(2, '0')}`;
              const count = events.filter((e) => e.date === dateKey).length;
              const isSelected = selectedDate === dateKey;

              return (
                <button
                  key={dayNum}
                  onClick={() => {
                    setSelectedDate(dateKey);
                    setViewMode('dia');
                  }}
                  className={`p-2 rounded-xl text-center transition flex flex-col items-center justify-between min-h-[50px] ${
                    isSelected
                      ? 'bg-purple-600 text-white font-bold ring-2 ring-purple-400'
                      : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span className="text-xs">{dayNum}</span>
                  {count > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: ANO (Annual Overview) */}
      {viewMode === 'ano' && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {MONTHS_NAMES.map((m, idx) => (
            <div
              key={m}
              onClick={() => {
                const newD = new Date(selectedDate);
                newD.setMonth(idx);
                setSelectedDate(newD.toISOString().split('T')[0]);
                setViewMode('mes');
              }}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500 cursor-pointer text-center transition"
            >
              <h4 className="text-xs font-bold text-white">{m}</h4>
              <p className="text-[10px] text-slate-400 mt-1">2026</p>
              <span className="mt-2 inline-block px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-purple-300 font-semibold">
                {events.length} aulas
              </span>
            </div>
          ))}
        </div>
      )}

      {/* VIEW: PROGRAMAÇÃO (Continuous list view) */}
      {viewMode === 'programacao' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
            <span>Lista Cronológica de Aulas</span>
            <span>Total: {events.length} compromissos cadastrados</span>
          </div>

          {events.map((evt) => {
            const client = clients.find((c) => c.id === evt.clientId);

            return (
              <div
                key={evt.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                      {evt.date} • {evt.startTime}
                    </span>
                    <strong className="text-sm font-bold text-white">{evt.clientName}</strong>
                  </div>
                  <p className="text-xs text-slate-400">{evt.title}</p>
                </div>

                <div className="flex items-center gap-2">
                  {client && (
                    <button
                      onClick={() => onStartWorkoutForClient(client)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Iniciar</span>
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(evt)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteEvent(evt.id)}
                    className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
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
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950/50 active:scale-95 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingEvent ? 'Atualizar Agendamento' : 'Confirmar Horário'}</span>
                </button>
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
    </div>
  );
};
