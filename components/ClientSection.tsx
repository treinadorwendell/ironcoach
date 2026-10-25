'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Client,
  ContractType,
  ContractCategory,
  PresencialSubPlan,
  OnlineSubPlan,
  Gender,
  CompletedWorkoutRecord,
  TrainerProfile,
} from '@/types';
import { storage } from '@/lib/storage';
import { WorkoutHistoryPage } from './WorkoutHistoryPage';
import {
  UserPlus,
  Search,
  Mail,
  Calendar,
  Weight,
  Ruler,
  DollarSign,
  Play,
  FilePlus,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  History,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Dumbbell,
  Check,
  Layers,
  Phone,
  UserCheck,
  Globe,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react';

interface ClientSectionProps {
  clients: Client[];
  trainerProfile?: TrainerProfile | null;
  onOpenTrainerProfile?: () => void;
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onStartWorkoutForClient: (client: Client) => void;
  onCreateWorkoutForClient: (client: Client) => void;
}

export type DetailedPlanFilter =
  | 'Todos'
  | 'Presencial - Mensal'
  | 'Presencial - Semanal'
  | 'Presencial - Avulsa'
  | 'Online - Mensal'
  | 'Online - Trimestral'
  | 'Online - Semestral'
  | 'Online - Anual';

const PRESENCIAL_PLANS: { label: PresencialSubPlan; fullType: DetailedPlanFilter; defaultPrice: string }[] = [
  { label: 'Mensal', fullType: 'Presencial - Mensal', defaultPrice: '750' },
  { label: 'Semanal', fullType: 'Presencial - Semanal', defaultPrice: '220' },
  { label: 'Avulsa', fullType: 'Presencial - Avulsa', defaultPrice: '90' },
];

const ONLINE_PLANS: { label: OnlineSubPlan; fullType: DetailedPlanFilter; defaultPrice: string }[] = [
  { label: 'Mensal', fullType: 'Online - Mensal', defaultPrice: '350' },
  { label: 'Trimestral', fullType: 'Online - Trimestral', defaultPrice: '900' },
  { label: 'Semestral', fullType: 'Online - Semestral', defaultPrice: '1650' },
  { label: 'Anual', fullType: 'Online - Anual', defaultPrice: '3000' },
];

export function normalizeContractType(contractType?: ContractType): Exclude<DetailedPlanFilter, 'Todos'> {
  if (!contractType) return 'Presencial - Mensal';
  if (contractType === 'Mensal') return 'Presencial - Mensal';
  if (contractType === 'Semanal') return 'Presencial - Semanal';
  if (contractType === 'Avulsa') return 'Presencial - Avulsa';
  if (contractType === 'Online') return 'Online - Mensal';
  return contractType as Exclude<DetailedPlanFilter, 'Todos'>;
}

export function parseContractCategoryAndSub(contractType?: ContractType): {
  category: ContractCategory;
  subPlan: string;
  normalized: Exclude<DetailedPlanFilter, 'Todos'>;
} {
  const normalized = normalizeContractType(contractType);
  if (normalized.startsWith('Online - ')) {
    return {
      category: 'Online',
      subPlan: normalized.replace('Online - ', ''),
      normalized,
    };
  }
  return {
    category: 'Presencial',
    subPlan: normalized.replace('Presencial - ', ''),
    normalized,
  };
}

export function formatBirthDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

export const ClientSection: React.FC<ClientSectionProps> = ({
  clients,
  trainerProfile,
  onOpenTrainerProfile,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onStartWorkoutForClient,
  onCreateWorkoutForClient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [contractFilter, setContractFilter] = useState<DetailedPlanFilter>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // Selected Student Profile Page State
  const [selectedProfileClientId, setSelectedProfileClientId] = useState<string | null>(null);
  const [profileSubView, setProfileSubView] = useState<'menu' | 'informacoes' | 'historico'>('menu');

  // Completed workouts history state
  const [completedWorkouts, setCompletedWorkouts] = useState<CompletedWorkoutRecord[]>(() => {
    if (typeof window !== 'undefined') {
      return storage.getCompletedWorkouts();
    }
    return [];
  });

  // Plan Dropdown State (Mobile & Tablet)
  const [isPlanDropdownOpen, setIsPlanDropdownOpen] = useState(false);
  const planDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        planDropdownRef.current &&
        !planDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPlanDropdownOpen(false);
      }
    };
    if (isPlanDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isPlanDropdownOpen]);

  useEffect(() => {
    const handleStorage = () => {
      setCompletedWorkouts(storage.getCompletedWorkouts());
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('ironcoach:data-synced', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('ironcoach:data-synced', handleStorage);
    };
  }, []);

  // Contagem dinâmica de alunos por subplano
  const getPlanCount = (filter: DetailedPlanFilter) => {
    if (filter === 'Todos') return clients.length;
    return clients.filter((c) => normalizeContractType(c.contractType) === filter).length;
  };

  // Modal Form State (Quick Edit / New Client Registration)
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender>('Masculino');
  const [weight, setWeight] = useState<string>('75');
  const [height, setHeight] = useState<string>('175');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contractCategory, setContractCategory] = useState<ContractCategory>('Presencial');
  const [contractType, setContractType] = useState<ContractType>('Presencial - Mensal');
  const [contractValue, setContractValue] = useState<string>('750');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Student Profile -> Informações Form State
  const [infoWeight, setInfoWeight] = useState<string>('75');
  const [infoHeight, setInfoHeight] = useState<string>('175');
  const [infoBirthDate, setInfoBirthDate] = useState<string>('');
  const [infoCategory, setInfoCategory] = useState<ContractCategory>('Presencial');
  const [infoContractType, setInfoContractType] = useState<ContractType>('Presencial - Mensal');
  const [infoContractValue, setInfoContractValue] = useState<string>('750');
  const [infoNotes, setInfoNotes] = useState<string>('');
  const [infoSavedToast, setInfoSavedToast] = useState(false);
  const [infoError, setInfoError] = useState('');

  const selectedProfileClient = clients.find((c) => c.id === selectedProfileClientId) || null;

  // Populate Info form whenever opening a student's Informações view
  const openStudentProfile = (client: Client, initialView: 'menu' | 'informacoes' | 'historico' = 'menu') => {
    const parsed = parseContractCategoryAndSub(client.contractType);
    setSelectedProfileClientId(client.id);
    setProfileSubView(initialView);
    setInfoWeight(String(client.weight || 75));
    setInfoHeight(String(client.height || 175));
    setInfoBirthDate(client.birthDate || '');
    setInfoCategory(parsed.category);
    setInfoContractType(parsed.normalized);
    setInfoContractValue(String(client.contractValue ?? 750));
    setInfoNotes(client.notes || '');
    setInfoError('');
    setInfoSavedToast(false);
    setCompletedWorkouts(storage.getCompletedWorkouts());
  };

  const openNewClientModal = () => {
    setEditingClient(null);
    setName('');
    setBirthDate('');
    setGender('Masculino');
    setWeight('75');
    setHeight('175');
    setEmail('');
    setPhone('');
    setContractCategory('Presencial');
    setContractType('Presencial - Mensal');
    setContractValue('750');
    setNotes('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    const parsed = parseContractCategoryAndSub(client.contractType);
    setEditingClient(client);
    setName(client.name);
    setBirthDate(client.birthDate);
    setGender(client.gender);
    setWeight(String(client.weight));
    setHeight(String(client.height));
    setEmail(client.email);
    setPhone(client.phone || '');
    setContractCategory(parsed.category);
    setContractType(parsed.normalized);
    setContractValue(String(client.contractValue));
    setNotes(client.notes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSelectModalPlan = (fullType: DetailedPlanFilter, defaultPrice: string, cat: ContractCategory) => {
    setContractCategory(cat);
    setContractType(fullType as ContractType);
    if (!editingClient) {
      setContractValue(defaultPrice);
    }
  };

  const handleSelectInfoPlan = (fullType: DetailedPlanFilter, defaultPrice: string, cat: ContractCategory) => {
    setInfoCategory(cat);
    setInfoContractType(fullType as ContractType);
    if (!infoContractValue || infoContractValue === '0') {
      setInfoContractValue(defaultPrice);
    }
  };

  const calculateAge = (bDate: string) => {
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

  const handleSubmitModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Por favor, informe o nome completo do aluno.');
      return;
    }
    if (!birthDate.trim() || birthDate.trim().length < 8) {
      setFormError('Informe a data de nascimento no formato DIA/MÊS/ANO (DD/MM/AAAA).');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Informe um e-mail válido.');
      return;
    }

    const numWeight = parseFloat(weight) || 70;
    const numHeight = parseFloat(height) || 170;
    const numValue = parseFloat(contractValue) || 0;

    if (editingClient) {
      const updated: Client = {
        ...editingClient,
        name: name.trim(),
        birthDate: birthDate.trim(),
        gender,
        weight: numWeight,
        height: numHeight,
        email: email.trim(),
        contractType,
        contractValue: numValue,
        phone: phone.trim(),
        notes: notes.trim(),
      };
      onUpdateClient(updated);
    } else {
      const newClient: Client = {
        id: `client-${Date.now()}`,
        name: name.trim(),
        birthDate: birthDate.trim(),
        gender,
        weight: numWeight,
        height: numHeight,
        email: email.trim(),
        contractType,
        contractValue: numValue,
        phone: phone.trim(),
        notes: notes.trim(),
        createdAt: new Date().toISOString().split('T')[0],
      };
      onAddClient(newClient);
    }

    setIsModalOpen(false);
  };

  const handleSaveStudentInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileClient) return;

    if (!infoBirthDate.trim() || infoBirthDate.trim().length < 8) {
      setInfoError('Informe a data de nascimento em formato DIA/MÊS/ANO (ex: 15/08/1995).');
      return;
    }

    const numWeight = parseFloat(infoWeight);
    const numHeight = parseFloat(infoHeight);
    if (isNaN(numWeight) || numWeight <= 0) {
      setInfoError('Informe um peso válido em kg.');
      return;
    }
    if (isNaN(numHeight) || numHeight <= 0) {
      setInfoError('Informe uma altura válida em cm.');
      return;
    }

    setInfoError('');
    const updated: Client = {
      ...selectedProfileClient,
      weight: numWeight,
      height: numHeight,
      birthDate: infoBirthDate.trim(),
      contractType: infoContractType,
      contractValue: parseFloat(infoContractValue) || 0,
      notes: infoNotes.trim(),
    };

    onUpdateClient(updated);
    setInfoSavedToast(true);
    setTimeout(() => setInfoSavedToast(false), 3000);
  };

  // Filter clients
  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    const normalizedPlan = normalizeContractType(c.contractType);
    const matchesContract =
      contractFilter === 'Todos' || normalizedPlan === contractFilter;
    return matchesSearch && matchesContract;
  });

  // ============================================================================
  // PÁGINA DO PERFIL DO ALUNO (QUANDO UM ALUNO ESTÁ SELECIONADO)
  // ============================================================================
  if (selectedProfileClient) {
    // Sub-visão 1: Histórico de Treinos do Aluno
    if (profileSubView === 'historico') {
      return (
        <WorkoutHistoryPage
          clients={clients}
          initialClientId={selectedProfileClient.id}
          onBack={() => setProfileSubView('menu')}
          onStartWorkoutForClient={onStartWorkoutForClient}
        />
      );
    }

    const clientSessionsCount = completedWorkouts.filter(
      (w) => w.clientId === selectedProfileClient.id
    ).length;
    const parsedPlan = parseContractCategoryAndSub(selectedProfileClient.contractType);
    const studentAge = calculateAge(selectedProfileClient.birthDate);

    // Sub-visão 2: Página "Informações" (Editar Peso, Altura, Cm, Data de nascimento DIA/MÊS/ANO e Tipo de Plano Presencial/Online)
    if (profileSubView === 'informacoes') {
      return (
        <div className="space-y-5 pb-24 animate-in fade-in duration-200">
          {/* Topo de Navegação */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setProfileSubView('menu')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-bold transition active:scale-95 cursor-pointer touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>Voltar ao Perfil do Aluno</span>
            </button>

            <span className="text-xs font-bold text-slate-400 truncate">
              {selectedProfileClient.name}
            </span>
          </div>

          {/* Cabeçalho da Seção Informações */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight truncate">
                  Informações do Aluno
                </h2>
                <p className="text-xs text-slate-400">
                  Editar medidas corporais, data de nascimento e tipo de plano de {selectedProfileClient.name}
                </p>
              </div>
            </div>
          </div>

          {infoError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{infoError}</span>
            </div>
          )}

          {infoSavedToast && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Informações e plano do aluno atualizados com sucesso!</span>
            </div>
          )}

          <form onSubmit={handleSaveStudentInfo} className="space-y-5">
            {/* BLOCO 1: EDITAR CLIENTE (Peso, Altura cm, Data de Nascimento DIA/MÊS/ANO) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Editar Cliente</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Atualize peso, estatura em centímetros e data de nascimento em formato DIA/MÊS/ANO.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Peso */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Weight className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Peso (kg)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={infoWeight}
                      onChange={(e) => setInfoWeight(e.target.value)}
                      placeholder="75.0"
                      className="w-full px-3.5 py-3 pr-12 rounded-xl bg-slate-950 border border-slate-700/80 text-sm font-bold text-white tabular-nums focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      kg
                    </span>
                  </div>
                </div>

                {/* Altura (Cm) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Altura (Cm)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      required
                      value={infoHeight}
                      onChange={(e) => setInfoHeight(e.target.value)}
                      placeholder="175"
                      className="w-full px-3.5 py-3 pr-12 rounded-xl bg-slate-950 border border-slate-700/80 text-sm font-bold text-white tabular-nums focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      cm
                    </span>
                  </div>
                </div>

                {/* Data de Nascimento (DIA/MÊS/ANO) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Data de Nascimento</span>
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={10}
                    value={infoBirthDate}
                    onChange={(e) => setInfoBirthDate(formatBirthDateMask(e.target.value))}
                    placeholder="DD/MM/AAAA"
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700/80 text-sm font-bold text-white tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                  {calculateAge(infoBirthDate) !== null && (
                    <span className="text-[11px] text-emerald-400 block tabular-nums">
                      Idade: {calculateAge(infoBirthDate)} anos
                    </span>
                  )}
                </div>
              </div>

              {/* Observações Opcionais */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Observações / Restrições do Aluno
                </label>
                <textarea
                  rows={2}
                  value={infoNotes}
                  onChange={(e) => setInfoNotes(e.target.value)}
                  placeholder="Ex: Objetivo hipertrofia, atenção ao joelho direito..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* BLOCO 2: TIPO DE PLANO (Presencial: Mensal, Semanal, Avulsa | Online: Mensal, Trimestral, Semestral, Anual) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span>Tipo de Plano</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Escolha entre a modalidade Presencial ou Online e selecione a periodicidade do plano.
                </p>
              </div>

              {/* Abas de Modalidade: Presencial vs Online */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setInfoCategory('Presencial');
                    if (!infoContractType.startsWith('Presencial')) {
                      setInfoContractType('Presencial - Mensal');
                    }
                  }}
                  className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl border text-xs sm:text-sm font-extrabold transition active:scale-[0.99] cursor-pointer touch-manipulation ${
                    infoCategory === 'Presencial'
                      ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Presencial</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInfoCategory('Online');
                    if (!infoContractType.startsWith('Online')) {
                      setInfoContractType('Online - Mensal');
                    }
                  }}
                  className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl border text-xs sm:text-sm font-extrabold transition active:scale-[0.99] cursor-pointer touch-manipulation ${
                    infoCategory === 'Online'
                      ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/60 shadow-md ring-1 ring-cyan-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Online</span>
                </button>
              </div>

              {/* Opções de Subplanos conforme a Modalidade */}
              {infoCategory === 'Presencial' ? (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">
                    Planos Presenciais (Mensal, Semanal, Avulsa):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {PRESENCIAL_PLANS.map((plan) => {
                      const isSelected = normalizeContractType(infoContractType) === plan.fullType;
                      return (
                        <button
                          key={plan.fullType}
                          type="button"
                          onClick={() => handleSelectInfoPlan(plan.fullType, plan.defaultPrice, 'Presencial')}
                          className={`p-3.5 rounded-xl border text-left transition active:scale-[0.99] cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-extrabold block">
                              Presencial – {plan.label}
                            </span>
                            <span className={`text-[11px] block mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                              {plan.label === 'Avulsa' ? 'Cobrança por aula' : `Recorrência ${plan.label.toLowerCase()}`}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">
                    Planos Online (Mensal, Trimestral, Semestral, Anual):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {ONLINE_PLANS.map((plan) => {
                      const isSelected = normalizeContractType(infoContractType) === plan.fullType;
                      return (
                        <button
                          key={plan.fullType}
                          type="button"
                          onClick={() => handleSelectInfoPlan(plan.fullType, plan.defaultPrice, 'Online')}
                          className={`p-3.5 rounded-xl border text-left transition active:scale-[0.99] cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-cyan-600 text-white border-cyan-400 shadow-md'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-extrabold block">
                              Online – {plan.label}
                            </span>
                            <span className={`text-[11px] block mt-0.5 ${isSelected ? 'text-cyan-100' : 'text-slate-400'}`}>
                              Consultoria {plan.label.toLowerCase()}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Valor do Plano em R$ */}
              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Valor do Plano ({normalizeContractType(infoContractType)}) em R$
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-amber-400">
                      R$
                    </span>
                    <input
                      type="number"
                      step="1"
                      required
                      value={infoContractValue}
                      onChange={(e) => setInfoContractValue(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 text-sm font-extrabold text-amber-300 tabular-nums focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex sm:justify-end pt-2 sm:pt-5">
                  <button
                    type="submit"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 active:scale-95 transition cursor-pointer touch-manipulation"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Salvar Informações do Aluno</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      );
    }

    // Sub-visão Padrão ('menu'): PÁGINA PERFIL DO ALUNO COM MENU DE 4 CARDS GRANDES
    return (
      <div className="space-y-5 pb-24 animate-in fade-in duration-200">
        {/* Barra Superior de Retorno */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedProfileClientId(null)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-bold transition active:scale-95 cursor-pointer touch-manipulation"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Voltar para Clientes</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openEditModal(selectedProfileClient)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Editar Contato</span>
            </button>
          </div>
        </div>

        {/* Cabeçalho do Perfil do Aluno */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg shrink-0 ${
                  selectedProfileClient.gender === 'Feminino'
                    ? 'bg-gradient-to-tr from-pink-600 to-rose-500'
                    : 'bg-gradient-to-tr from-blue-600 to-cyan-500'
                }`}
              >
                {selectedProfileClient.name.charAt(0)}
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                    {selectedProfileClient.name}
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    · {selectedProfileClient.gender}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      {selectedProfileClient.birthDate}
                      {studentAge !== null ? ` (${studentAge} anos)` : ''}
                    </span>
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{selectedProfileClient.email}</span>
                  </span>
                  {selectedProfileClient.phone && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="flex items-center gap-1.5 tabular-nums">
                        <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{selectedProfileClient.phone}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Resumo Rápido de Medidas e Plano */}
            <div className="flex items-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 text-xs text-slate-300 tabular-nums shrink-0">
              <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Medidas</span>
                <span className="font-extrabold text-white">
                  {selectedProfileClient.weight} kg · {selectedProfileClient.height} cm
                </span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Plano Ativo</span>
                <span className="font-extrabold text-emerald-400">
                  {parsedPlan.normalized} (R$ {selectedProfileClient.contractValue})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MENU DE 4 CARDS GRANDES DO PERFIL DO ALUNO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: INFORMAÇÕES */}
          <button
            type="button"
            onClick={() => setProfileSubView('informacoes')}
            className="w-full p-5 sm:p-6 rounded-3xl bg-slate-900/95 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 shadow-lg text-left transition active:scale-[0.99] group cursor-pointer touch-manipulation flex flex-col justify-between min-h-[160px]"
          >
            <div className="flex items-start justify-between gap-3 w-full">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
            </div>

            <div className="mt-4 space-y-1">
              <h3 className="text-base sm:text-lg font-extrabold text-white group-hover:text-emerald-300 transition">
                Informações
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Editar Peso ({selectedProfileClient.weight} kg), Altura ({selectedProfileClient.height} cm), Data de nascimento ({selectedProfileClient.birthDate}) e Tipo de Plano ({parsedPlan.normalized}).
              </p>
            </div>
          </button>

          {/* Card 2: HISTÓRICO DE TREINOS */}
          <button
            type="button"
            onClick={() => {
              setCompletedWorkouts(storage.getCompletedWorkouts());
              setProfileSubView('historico');
            }}
            className="w-full p-5 sm:p-6 rounded-3xl bg-slate-900/95 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 shadow-lg text-left transition active:scale-[0.99] group cursor-pointer touch-manipulation flex flex-col justify-between min-h-[160px]"
          >
            <div className="flex items-start justify-between gap-3 w-full">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
                <History className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 tabular-nums">
                  {clientSessionsCount} {clientSessionsCount === 1 ? 'sessão' : 'sessões'}
                </span>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition" />
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <h3 className="text-base sm:text-lg font-extrabold text-white group-hover:text-amber-300 transition">
                Histórico de Treinos
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Consultar treinos realizados, evolução de cargas e registros anteriores deste aluno.
              </p>
            </div>
          </button>

          {/* Card 3: CRIAR TREINO */}
          <button
            type="button"
            onClick={() => onCreateWorkoutForClient(selectedProfileClient)}
            className="w-full p-5 sm:p-6 rounded-3xl bg-slate-900/95 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 shadow-lg text-left transition active:scale-[0.99] group cursor-pointer touch-manipulation flex flex-col justify-between min-h-[160px]"
          >
            <div className="flex items-start justify-between gap-3 w-full">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition">
                <FilePlus className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
            </div>

            <div className="mt-4 space-y-1">
              <h3 className="text-base sm:text-lg font-extrabold text-white group-hover:text-cyan-300 transition">
                Criar Treino
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Montar ou editar programas de treino, divisões semanais, séries e métodos para {selectedProfileClient.name}.
              </p>
            </div>
          </button>

          {/* Card 4: EXECUÇÃO DO TREINO */}
          <button
            type="button"
            onClick={() => onStartWorkoutForClient(selectedProfileClient)}
            className="w-full p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 hover:from-emerald-950/60 border border-emerald-500/40 hover:border-emerald-400 shadow-lg text-left transition active:scale-[0.99] group cursor-pointer touch-manipulation flex flex-col justify-between min-h-[160px]"
          >
            <div className="flex items-start justify-between gap-3 w-full">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md group-hover:scale-105 transition">
                <Play className="w-6 h-6 fill-slate-950" />
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-0.5 transition" />
            </div>

            <div className="mt-4 space-y-1">
              <h3 className="text-base sm:text-lg font-extrabold text-white group-hover:text-emerald-300 transition">
                Execução do Treino
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Iniciar acompanhamento do treino agora com cronômetro, registro de cargas e séries em tempo real.
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // LISTAGEM PRINCIPAL DA ABA CLIENTES
  // ============================================================================
  return (
    <div className="space-y-4 pb-24">
      {/* Top Banner: Botão IronCoach (Perfil do Treinador) & KPI Total de Alunos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {/* Botão dedicado do IronCoach para acessar o Perfil do Treinador */}
        <button
          type="button"
          onClick={onOpenTrainerProfile}
          className="w-full p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 hover:border-emerald-500/50 shadow-md flex items-center justify-between gap-3 min-h-[100px] text-left transition active:scale-[0.99] group cursor-pointer touch-manipulation"
          title="Abrir Perfil do Treinador IronCoach"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/30 flex-shrink-0 group-hover:scale-105 transition">
              {trainerProfile?.logoDataUrl ? (
                <img
                  src={trainerProfile.logoDataUrl}
                  alt="Logo IronCoach"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Dumbbell className="w-7 h-7 text-white" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-emerald-300 transition leading-tight">
                  IronCoach
                </span>
                <span className="text-xs font-semibold text-slate-400">· Perfil</span>
              </div>
              <p className="text-sm font-bold text-emerald-400 truncate mt-0.5">
                {trainerProfile?.name?.trim() || 'Configurar Nome do Treinador'}
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Toque para editar nome, senha e logo
              </span>
            </div>
          </div>

          <div className="w-9 h-9 rounded-xl bg-slate-800/90 group-hover:bg-emerald-600/20 text-slate-400 group-hover:text-emerald-300 border border-slate-700/80 group-hover:border-emerald-500/40 flex items-center justify-center shrink-0 transition">
            <Edit2 className="w-4 h-4" />
          </div>
        </button>

        {/* KPI Card: Total de Alunos */}
        <div className="w-full p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/80 border border-slate-800 shadow-md flex flex-col justify-between min-h-[100px]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center">
            Total de Alunos
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-white tabular-nums">{clients.length}</span>
            <span className="text-xs text-emerald-400 font-medium">Ativos</span>
          </div>
        </div>
      </div>

      {/* Action Header & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <button
          onClick={openNewClientModal}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 transition touch-manipulation cursor-pointer"
        >
          <UserPlus className="w-5 h-5 text-emerald-100" />
          <span>Cadastrar Novo Aluno</span>
        </button>
      </div>

      {/* Filtro de Planos Detalhado (Presencial: Mensal, Semanal, Avulsa | Online: Mensal, Trimestral, Semestral, Anual) */}
      <div className="w-full">
        {/* Mobile e Tablet: Botão de Drop List Agrupado */}
        <div className="block lg:hidden relative" ref={planDropdownRef}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
                <Layers className="w-4 h-4" />
              </span>
              <span>Filtrar por Plano:</span>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <button
                type="button"
                onClick={() => setIsPlanDropdownOpen((prev) => !prev)}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-700/80 hover:border-emerald-500/50 active:scale-[0.99] text-xs font-bold text-white shadow-xs transition touch-manipulation cursor-pointer"
                aria-expanded={isPlanDropdownOpen}
                aria-haspopup="listbox"
              >
                <span className="truncate">
                  {contractFilter === 'Todos' ? 'Todos os Planos' : contractFilter}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-emerald-400 tabular-nums">
                    {getPlanCount(contractFilter)} {getPlanCount(contractFilter) === 1 ? 'aluno' : 'alunos'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      isPlanDropdownOpen ? 'rotate-180 text-emerald-400' : ''
                    }`}
                  />
                </div>
              </button>

              <AnimatePresence>
                {isPlanDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-full mt-1.5 z-40 p-2 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/90 space-y-2 backdrop-blur-xl max-h-96 overflow-y-auto"
                  >
                    {/* Opção Todos */}
                    <button
                      type="button"
                      onClick={() => {
                        setContractFilter('Todos');
                        setIsPlanDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                        contractFilter === 'Todos'
                          ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                          : 'hover:bg-slate-800/80 text-slate-200'
                      }`}
                    >
                      <span>Todos os Planos</span>
                      <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                        {clients.length}
                      </span>
                    </button>

                    {/* Grupo Presencial */}
                    <div className="pt-1 border-t border-slate-800 space-y-1">
                      <span className="px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" /> Presencial
                      </span>
                      {PRESENCIAL_PLANS.map((p) => {
                        const isSelected = contractFilter === p.fullType;
                        const count = getPlanCount(p.fullType);
                        return (
                          <button
                            key={p.fullType}
                            type="button"
                            onClick={() => {
                              setContractFilter(p.fullType);
                              setIsPlanDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                                : 'hover:bg-slate-800/80 text-slate-300'
                            }`}
                          >
                            <span>Presencial – {p.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400 tabular-nums">{count}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Grupo Online */}
                    <div className="pt-1 border-t border-slate-800 space-y-1">
                      <span className="px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <Globe className="w-3 h-3" /> Online
                      </span>
                      {ONLINE_PLANS.map((p) => {
                        const isSelected = contractFilter === p.fullType;
                        const count = getPlanCount(p.fullType);
                        return (
                          <button
                            key={p.fullType}
                            type="button"
                            onClick={() => {
                              setContractFilter(p.fullType);
                              setIsPlanDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40'
                                : 'hover:bg-slate-800/80 text-slate-300'
                            }`}
                          >
                            <span>Online – {p.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400 tabular-nums">{count}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Versão Desktop (lg+): Barra de Seleção de Planos com Presencial e Online detalhados */}
        <div className="hidden lg:flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setContractFilter('Todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                contractFilter === 'Todos'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>Todos</span>
              <span className="text-[10px] opacity-80 tabular-nums">({clients.length})</span>
            </button>

            <span className="text-slate-700">|</span>

            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 px-1">
              <MapPin className="w-3 h-3" /> Presencial:
            </span>
            {PRESENCIAL_PLANS.map((p) => {
              const isSelected = contractFilter === p.fullType;
              const count = getPlanCount(p.fullType);
              return (
                <button
                  key={p.fullType}
                  type="button"
                  onClick={() => setContractFilter(p.fullType)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span>{p.label}</span>
                  <span className="text-[10px] opacity-80 tabular-nums">({count})</span>
                </button>
              );
            })}

            <span className="text-slate-700">|</span>

            <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1 px-1">
              <Globe className="w-3 h-3" /> Online:
            </span>
            {ONLINE_PLANS.map((p) => {
              const isSelected = contractFilter === p.fullType;
              const count = getPlanCount(p.fullType);
              return (
                <button
                  key={p.fullType}
                  type="button"
                  onClick={() => setContractFilter(p.fullType)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span>{p.label}</span>
                  <span className="text-[10px] opacity-80 tabular-nums">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* LISTA DE CARDS DOS ALUNOS (Exibe apenas: Nome, Data de nascimento, E-mail, Telefone, Botão Editar e Botão Excluir) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {filteredClients.length === 0 ? (
          <div className="col-span-full text-center py-12 px-4 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <UserPlus className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                {clients.length === 0 ? 'Nenhum aluno cadastrado ainda' : 'Nenhum aluno encontrado'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {clients.length === 0
                  ? 'Comece cadastrando seu primeiro aluno para gerenciar treinos, avaliações e agendamentos.'
                  : contractFilter !== 'Todos'
                  ? `Nenhum aluno encontrado com o filtro ${contractFilter}.`
                  : 'Nenhum aluno corresponde aos filtros selecionados.'}
              </p>
            </div>
            {contractFilter !== 'Todos' && clients.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setContractFilter('Todos')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 font-bold text-xs border border-slate-700 active:scale-95 transition cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Ver Todos os Planos ({clients.length})</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredClients.map((client) => {
            return (
              <div
                key={client.id}
                onClick={() => openStudentProfile(client, 'menu')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openStudentProfile(client, 'menu');
                  }
                }}
                className="p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 shadow-md transition-all group cursor-pointer touch-manipulation flex items-start justify-between gap-3"
              >
                {/* Informações solicitadas: Nome, Data de nascimento, E-mail e Número de telefone */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-md shrink-0 group-hover:scale-105 transition ${
                      client.gender === 'Feminino'
                        ? 'bg-gradient-to-tr from-pink-600 to-rose-500'
                        : 'bg-gradient-to-tr from-blue-600 to-cyan-500'
                    }`}
                  >
                    {client.name.charAt(0)}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition tracking-tight truncate">
                      {client.name}
                    </h3>

                    <div className="space-y-1 text-xs text-slate-400">
                      {/* Data de Nascimento */}
                      <div className="flex items-center gap-2 tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{client.birthDate || 'Não informada'}</span>
                      </div>

                      {/* E-mail */}
                      <div className="flex items-center gap-2 truncate" title={client.email}>
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>

                      {/* Número de Telefone */}
                      <div className="flex items-center gap-2 tabular-nums">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{client.phone?.trim() || 'Sem telefone'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botão de Editar Cadastro do Cliente e Botão de Excluir */}
                <div className="flex items-center gap-1.5 shrink-0 self-start">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(client);
                    }}
                    className="w-10 h-10 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center active:scale-95 transition cursor-pointer shadow-xs touch-manipulation"
                    title="Editar Cadastro do Cliente"
                    aria-label={`Editar cadastro de ${client.name}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setClientToDelete(client);
                    }}
                    className="w-10 h-10 rounded-xl bg-slate-800/90 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/40 flex items-center justify-center active:scale-95 transition cursor-pointer shadow-xs touch-manipulation"
                    title="Excluir Cliente"
                    aria-label={`Excluir ${client.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Rápido: Cadastrar Novo Aluno / Editar Cadastro Básico do Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {editingClient ? 'Editar Cadastro do Cliente' : 'Cadastrar Novo Aluno'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Dados de identificação e contato do aluno
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitModal} className="mt-4 space-y-3.5">
              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Data de Nascimento (DIA/MÊS/ANO) e Sexo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="DD/MM/AAAA"
                    value={birthDate}
                    onChange={(e) => setBirthDate(formatBirthDateMask(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Sexo *
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGender('Masculino')}
                      className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        gender === 'Masculino'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      Masculino
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('Feminino')}
                      className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        gender === 'Feminino'
                          ? 'bg-pink-600 text-white shadow-md'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      Feminino
                    </button>
                  </div>
                </div>
              </div>

              {/* E-mail e Número de Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    E-mail *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="aluno@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Número de Telefone
                  </label>
                  <input
                    type="tel"
                    placeholder="(11) 98765-4321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* No cadastro inicial, também permite definir medidas e plano iniciais */}
              {!editingClient && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Peso (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white tabular-nums focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Altura (cm)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white tabular-nums focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectModalPlan('Presencial - Mensal', '750', 'Presencial')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          contractCategory === 'Presencial'
                            ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        Presencial
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectModalPlan('Online - Mensal', '350', 'Online')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          contractCategory === 'Online'
                            ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        Online
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Subplano ({contractCategory})
                        </label>
                        <select
                          value={normalizeContractType(contractType)}
                          onChange={(e) => {
                            const val = e.target.value as DetailedPlanFilter;
                            const found = [...PRESENCIAL_PLANS, ...ONLINE_PLANS].find((p) => p.fullType === val);
                            if (found) {
                              handleSelectModalPlan(
                                found.fullType,
                                found.defaultPrice,
                                val.startsWith('Online') ? 'Online' : 'Presencial'
                              );
                            }
                          }}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                        >
                          {contractCategory === 'Presencial'
                            ? PRESENCIAL_PLANS.map((p) => (
                                <option key={p.fullType} value={p.fullType}>
                                  Presencial – {p.label}
                                </option>
                              ))
                            : ONLINE_PLANS.map((p) => (
                                <option key={p.fullType} value={p.fullType}>
                                  Online – {p.label}
                                </option>
                              ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Valor em R$
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={contractValue}
                          onChange={(e) => setContractValue(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-amber-300 tabular-nums focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 active:scale-95 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingClient ? 'Salvar Alterações' : 'Concluir Cadastro'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-rose-500/50 p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Excluir Aluno</h3>
              <p className="text-xs text-slate-300">
                Tem certeza que deseja remover o aluno{' '}
                <strong className="text-rose-400 font-bold">{clientToDelete.name}</strong>?
              </p>
              <p className="text-[11px] text-slate-400">
                Esta ação removerá o aluno e seus dados da sua lista de alunos.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs active:scale-95 transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedProfileClientId === clientToDelete.id) {
                    setSelectedProfileClientId(null);
                  }
                  onDeleteClient(clientToDelete.id);
                  setClientToDelete(null);
                }}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 active:scale-95 transition cursor-pointer"
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
