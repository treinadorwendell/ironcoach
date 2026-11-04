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
import { storage, isStudentAccessComplete } from '@/lib/storage';
import { calculateHydrationTarget } from '@/lib/nutritionEngine';
import { WorkoutHistoryPage } from './WorkoutHistoryPage';
import { ClientNutritionWorkspace } from './ClientNutritionWorkspace';
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
  Utensils,
  Droplet,
  KeyRound,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ClientSectionProps {
  clients: Client[];
  trainerProfile?: TrainerProfile | null;
  onOpenTrainerProfile?: () => void;
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client, previousEmail?: string) => void;
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

export function formatPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function generateStudentPassword(studentName?: string): string {
  const cleanFirst = (studentName || 'iron')
    .trim()
    .split(/\s+/)[0]
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase()
    .slice(0, 5) || 'iron';
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${cleanFirst}${randomDigits}`;
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
  const [selectedPlanFilters, setSelectedPlanFilters] = useState<
    Exclude<DetailedPlanFilter, 'Todos'>[]
  >([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // Selected Student Profile Page State
  const [selectedProfileClientId, setSelectedProfileClientId] = useState<string | null>(null);
  const [profileSubView, setProfileSubView] = useState<'menu' | 'informacoes' | 'historico' | 'nutricao'>('menu');

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

  // Planejamentos / Planos disponíveis (com alunos vinculados ou já selecionados no filtro)
  const availablePresencialPlans = PRESENCIAL_PLANS.filter(
    (p) =>
      clients.length === 0 ||
      getPlanCount(p.fullType) > 0 ||
      selectedPlanFilters.includes(p.fullType)
  );

  const availableOnlinePlans = ONLINE_PLANS.filter(
    (p) =>
      clients.length === 0 ||
      getPlanCount(p.fullType) > 0 ||
      selectedPlanFilters.includes(p.fullType)
  );

  const togglePlanFilter = (plan: Exclude<DetailedPlanFilter, 'Todos'>) => {
    setSelectedPlanFilters((prev) =>
      prev.includes(plan) ? prev.filter((item) => item !== plan) : [...prev, plan]
    );
  };

  const selectedPlansStudentCount =
    selectedPlanFilters.length === 0
      ? clients.length
      : clients.filter((c) =>
          selectedPlanFilters.includes(normalizeContractType(c.contractType))
        ).length;

  // Modal Form State (Quick Edit / New Client Registration)
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<Gender>('Masculino');
  const [weight, setWeight] = useState<string>('75');
  const [height, setHeight] = useState<string>('175');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [showModalPassword, setShowModalPassword] = useState(true);
  const [copiedCredentialsToast, setCopiedCredentialsToast] = useState(false);
  const [contractCategory, setContractCategory] = useState<ContractCategory>('Presencial');
  const [contractType, setContractType] = useState<ContractType>('Presencial - Mensal');
  const [contractValue, setContractValue] = useState<string>('750');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Student Profile -> Informações Form State
  const [infoName, setInfoName] = useState<string>('');
  const [infoEmail, setInfoEmail] = useState<string>('');
  const [infoPhone, setInfoPhone] = useState<string>('');
  const [infoAccessPassword, setInfoAccessPassword] = useState<string>('');
  const [showInfoPassword, setShowInfoPassword] = useState<boolean>(true);
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

  const handleCopyCredentials = (studentName: string, studentEmail: string, studentPwd: string) => {
    if (!studentEmail.trim() || !studentPwd.trim()) return;
    const text = `Acesso do Aluno IronCoach\nAluno(a): ${studentName.trim() || 'Aluno'}\nE-mail: ${studentEmail.trim()}\nSenha: ${studentPwd.trim()}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedCredentialsToast(true);
    setTimeout(() => setCopiedCredentialsToast(false), 2500);
  };

  // Populate Info form whenever opening a student's Informações view
  const openStudentProfile = (client: Client, initialView: 'menu' | 'informacoes' | 'historico' | 'nutricao' = 'menu') => {
    const parsed = parseContractCategoryAndSub(client.contractType);
    setSelectedProfileClientId(client.id);
    setProfileSubView(initialView);
    setInfoName(client.name || '');
    setInfoEmail(client.email || '');
    setInfoPhone(client.phone || '');
    setInfoAccessPassword(client.accessPassword || '');
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
    setAccessPassword(generateStudentPassword('iron'));
    setShowModalPassword(true);
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
    setBirthDate(client.birthDate || '');
    setGender(client.gender);
    setWeight(String(client.weight));
    setHeight(String(client.height));
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setAccessPassword(client.accessPassword || generateStudentPassword(client.name));
    setShowModalPassword(true);
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
    if (!name.trim() || name.trim().length < 3) {
      setFormError('Por favor, informe o Nome completo do aluno.');
      return;
    }
    if (!birthDate.trim() || birthDate.trim().length < 10) {
      setFormError('Informe a Data de nascimento completa no formato DD/MM/AAAA.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Informe um E-mail válido para o acesso do aluno.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) {
      setFormError('Informe o Número de telefone do aluno com DDD.');
      return;
    }
    if (!accessPassword.trim() || accessPassword.trim().length < 6) {
      setFormError('Gere ou digite uma Senha de acesso com pelo menos 6 caracteres para o aluno.');
      return;
    }

    const numWeight = parseFloat(weight) || 70;
    const numHeight = parseFloat(height) || 170;
    const numValue = parseFloat(contractValue) || 0;

    if (editingClient) {
      const previousEmail = editingClient.email;
      const updated: Client = {
        ...editingClient,
        name: name.trim(),
        birthDate: birthDate.trim(),
        gender,
        weight: numWeight,
        height: numHeight,
        email: email.trim().toLowerCase(),
        contractType,
        contractValue: numValue,
        phone: phone.trim(),
        accessPassword: accessPassword.trim(),
        notes: notes.trim(),
      };
      onUpdateClient(updated, previousEmail);
    } else {
      const newClient: Client = {
        id: `client-${Date.now()}`,
        name: name.trim(),
        birthDate: birthDate.trim(),
        gender,
        weight: numWeight,
        height: numHeight,
        email: email.trim().toLowerCase(),
        contractType,
        contractValue: numValue,
        phone: phone.trim(),
        accessPassword: accessPassword.trim(),
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

    if (!infoName.trim() || infoName.trim().length < 3) {
      setInfoError('Informe o Nome completo do aluno.');
      return;
    }
    if (!infoBirthDate.trim() || infoBirthDate.trim().length < 10) {
      setInfoError('Informe a Data de nascimento completa no formato DD/MM/AAAA (ex: 15/08/1995).');
      return;
    }
    if (!infoEmail.trim() || !infoEmail.includes('@')) {
      setInfoError('Informe um E-mail válido para o acesso exclusivo do aluno.');
      return;
    }
    if (!infoPhone.trim() || infoPhone.replace(/\D/g, '').length < 8) {
      setInfoError('Informe o Número de telefone do aluno com DDD.');
      return;
    }
    if (!infoAccessPassword.trim() || infoAccessPassword.trim().length < 6) {
      setInfoError('A Senha de acesso do aluno deve ter pelo menos 6 caracteres.');
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

    const previousEmail = selectedProfileClient.email;
    setInfoError('');
    const updated: Client = {
      ...selectedProfileClient,
      name: infoName.trim(),
      email: infoEmail.trim().toLowerCase(),
      phone: infoPhone.trim(),
      accessPassword: infoAccessPassword.trim(),
      weight: numWeight,
      height: numHeight,
      birthDate: infoBirthDate.trim(),
      contractType: infoContractType,
      contractValue: parseFloat(infoContractValue) || 0,
      notes: infoNotes.trim(),
    };

    onUpdateClient(updated, previousEmail);
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
      selectedPlanFilters.length === 0 || selectedPlanFilters.includes(normalizedPlan);
    return matchesSearch && matchesContract;
  });

  // ============================================================================
  // PÁGINA DO PERFIL DO ALUNO (QUANDO UM ALUNO ESTÁ SELECIONADO)
  // ============================================================================
  if (selectedProfileClient) {
    // Sub-visão Nutrição & Prescrição de Dieta
    if (profileSubView === 'nutricao') {
      return (
        <ClientNutritionWorkspace
          client={selectedProfileClient}
          onBack={() => setProfileSubView('menu')}
          onUpdateClient={onUpdateClient}
        />
      );
    }

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
    const clientDietPlan = storage.getClientDietPlan(selectedProfileClient.id);
    const clientHydration = calculateHydrationTarget(
      selectedProfileClient.weight,
      clientDietPlan?.metabolicConfig?.activityLevel || 'moderado',
      clientDietPlan?.hydrationConfig
    );

    // Sub-visão 2: Página "Informações" (Editar Peso, Altura, Cm, Data de nascimento DIA/MÊS/ANO e Tipo de Plano Presencial/Online)
    if (profileSubView === 'informacoes') {
      return (
        <div className="space-y-5 pb-24 animate-in fade-in duration-200">
          {/* Topo de Navegação */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setProfileSubView('menu')}
              className="inline-flex items-center gap-2 h-9 sm:h-10 lg:h-11 px-3.5 sm:px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer touch-manipulation whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400 shrink-0" />
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
            {/* BLOCO 1: DADOS OBRIGATÓRIOS E CREDENCIAL DE ACESSO DO ALUNO */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Cadastro & Acesso Exclusivo do Aluno</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Complete os 4 dados obrigatórios (Nome completo, Data de nascimento, E-mail e Telefone) e a senha para liberar o login exclusivo do aluno.
                  </p>
                </div>
                {copiedCredentialsToast && (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Credenciais copiadas!
                  </span>
                )}
              </div>

              {/* Linha 1: Nome Completo, E-mail e Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Nome Completo *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={infoName}
                    onChange={(e) => setInfoName(e.target.value)}
                    placeholder="Nome completo do aluno"
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700/80 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                    <span>E-mail de Login *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={infoEmail}
                    onChange={(e) => setInfoEmail(e.target.value)}
                    placeholder="aluno@email.com"
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700/80 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Número de Telefone *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={infoPhone}
                    onChange={(e) => setInfoPhone(formatPhoneMask(e.target.value))}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700/80 text-sm font-bold text-white tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Linha 2: Senha Gerada pelo Treinador */}
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-cyan-500/30 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-extrabold text-cyan-300 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-cyan-400" />
                    <span>Senha de Acesso do Aluno (Gerada pelo Treinador) *</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInfoAccessPassword(generateStudentPassword(infoName))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Gerar Nova Senha</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyCredentials(infoName, infoEmail, infoAccessPassword)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-200 text-xs font-bold border border-cyan-500/40 transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Acesso</span>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type={showInfoPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={infoAccessPassword}
                    onChange={(e) => setInfoAccessPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowInfoPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showInfoPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Envie este E-mail e Senha para o aluno acessar exclusivamente o Portal do Aluno.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
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
                    <span>Data de Nascimento *</span>
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
                    className="w-full sm:w-auto flex items-center justify-center gap-2 h-11 sm:h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 active:scale-95 transition cursor-pointer touch-manipulation whitespace-nowrap shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
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
            className="inline-flex items-center gap-2 h-9 sm:h-10 lg:h-11 px-3.5 sm:px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer touch-manipulation whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Voltar para Clientes</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openEditModal(selectedProfileClient)}
              className="inline-flex items-center gap-1.5 h-9 sm:h-10 lg:h-11 px-3.5 sm:px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
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

            {/* Resumo Rápido de Medidas, Plano e Hidratação */}
            <div className="flex items-center gap-2.5 sm:gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 text-xs text-slate-300 tabular-nums shrink-0 flex-wrap sm:flex-nowrap">
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
              <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-blue-500/30">
                <span className="text-[10px] text-blue-400 block uppercase font-bold flex items-center gap-1">
                  <Droplet className="w-3 h-3 text-blue-400" /> Hidratação
                </span>
                <span className="font-extrabold text-blue-200">
                  {clientHydration.recommendedLiters} L / dia
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

          {/* Card 5: NUTRIÇÃO & PRESCRIÇÃO DE DIETA */}
          <button
            type="button"
            onClick={() => setProfileSubView('nutricao')}
            className="sm:col-span-2 w-full p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 hover:to-emerald-950/60 border border-emerald-500/40 hover:border-emerald-400 shadow-lg text-left transition active:scale-[0.99] group cursor-pointer touch-manipulation flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <Utensils className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-extrabold text-white group-hover:text-emerald-300 transition">
                    Nutrição & Prescrição Inteligente de Dieta
                  </h3>
                  <span className="text-xs text-emerald-400 font-semibold">
                    · TMB / GET · TACO + POF · IDR · Substituições
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                  Cálculos metabólicos (Harris-Benedict, Mifflin-St Jeor, Cunningham, Katch-McArdle, FAO/OMS e Tinsley), cardápios com horários e medidas caseiras, análise de macro e micronutrientes vs. IDR, substituições dinâmicas por receitas e Painel do Profissional.
                </p>

                {/* Badge de Destaque da Meta de Hidratação Diária */}
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <div className="px-3 py-1.5 rounded-xl bg-blue-950/70 border border-blue-500/40 text-xs font-bold text-blue-300 flex items-center gap-2">
                    <Droplet className="w-4 h-4 text-blue-400" />
                    <span>
                      Meta de Hidratação: <strong className="text-white">{clientHydration.recommendedMl} ml</strong> ({clientHydration.recommendedLiters} L/dia)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    · {clientHydration.breakdownText}
                  </span>
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shrink-0 self-start sm:self-center shadow-md">
              <span>Abrir Nutrição & Hidratação</span>
              <ChevronRight className="w-4 h-4" />
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
            className="w-full h-11 sm:h-12 pl-10 pr-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <button
          onClick={openNewClientModal}
          className="flex items-center justify-center gap-2 h-11 sm:h-12 px-5 sm:px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/50 transition touch-manipulation cursor-pointer whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-100 shrink-0" />
          <span>Cadastrar Novo Aluno</span>
        </button>
      </div>

      {/* Botão com Multi-Select Dropdown List para Selecionar o Planejamento Disponível */}
      <div className="w-full relative" ref={planDropdownRef}>
        <button
          type="button"
          onClick={() => setIsPlanDropdownOpen((prev) => !prev)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 active:scale-[0.99] text-xs sm:text-sm font-bold text-white shadow-md transition touch-manipulation cursor-pointer"
          aria-expanded={isPlanDropdownOpen}
          aria-haspopup="listbox"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Layers className="w-4 h-4" />
            </span>
            <div className="text-left min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Selecionar Planejamento Disponível
              </span>
              <span className="truncate block text-xs sm:text-sm font-extrabold text-white">
                {selectedPlanFilters.length === 0
                  ? 'Todos os Planejamentos Disponíveis'
                  : selectedPlanFilters.length === 1
                  ? selectedPlanFilters[0]
                  : `${selectedPlanFilters.length} planejamentos: ${selectedPlanFilters.join(', ')}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-extrabold text-emerald-400 tabular-nums">
              {selectedPlansStudentCount}{' '}
              {selectedPlansStudentCount === 1 ? 'aluno' : 'alunos'}
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
              role="listbox"
              aria-multiselectable="true"
              className="absolute left-0 right-0 top-full mt-2 z-40 p-3 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/90 space-y-2.5 backdrop-blur-xl max-h-96 overflow-y-auto"
            >
              {/* Cabeçalho do Multi-Select */}
              <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-800">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
                  Planejamentos Disponíveis (Multi-Select)
                </span>
                {selectedPlanFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedPlanFilters([])}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    Limpar seleção ({selectedPlanFilters.length})
                  </button>
                )}
              </div>

              {/* Opção: Todos os Planejamentos Disponíveis */}
              <button
                type="button"
                role="option"
                aria-selected={selectedPlanFilters.length === 0}
                onClick={() => setSelectedPlanFilters([])}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                  selectedPlanFilters.length === 0
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                    : 'hover:bg-slate-800/80 text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition ${
                      selectedPlanFilters.length === 0
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                        : 'bg-slate-950 border-slate-700'
                    }`}
                  >
                    {selectedPlanFilters.length === 0 && (
                      <Check className="w-3 h-3 stroke-[3]" />
                    )}
                  </span>
                  <span>Todos os Planejamentos Disponíveis</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                  {clients.length}
                </span>
              </button>

              {/* Grupo Presencial Disponível */}
              {availablePresencialPlans.length > 0 && (
                <div className="pt-1.5 border-t border-slate-800 space-y-1">
                  <span className="px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Presencial Disponível
                  </span>
                  {availablePresencialPlans.map((p) => {
                    const isSelected = selectedPlanFilters.includes(p.fullType);
                    const count = getPlanCount(p.fullType);
                    return (
                      <button
                        key={p.fullType}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => togglePlanFilter(p.fullType)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                            : 'hover:bg-slate-800/80 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-4 h-4 rounded-md border flex items-center justify-center transition ${
                              isSelected
                                ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                : 'bg-slate-950 border-slate-700'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <span>Presencial – {p.label}</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                          {count} {count === 1 ? 'aluno' : 'alunos'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Grupo Online Disponível */}
              {availableOnlinePlans.length > 0 && (
                <div className="pt-1.5 border-t border-slate-800 space-y-1">
                  <span className="px-2.5 text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Globe className="w-3 h-3" /> Online Disponível
                  </span>
                  {availableOnlinePlans.map((p) => {
                    const isSelected = selectedPlanFilters.includes(p.fullType);
                    const count = getPlanCount(p.fullType);
                    return (
                      <button
                        key={p.fullType}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => togglePlanFilter(p.fullType)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40'
                            : 'hover:bg-slate-800/80 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-4 h-4 rounded-md border flex items-center justify-center transition ${
                              isSelected
                                ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                                : 'bg-slate-950 border-slate-700'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <span>Online – {p.label}</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                          {count} {count === 1 ? 'aluno' : 'alunos'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Rodapé do Dropdown Multi-Select */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlanDropdownOpen(false)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition cursor-pointer"
                >
                  Concluir Seleção
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                  : selectedPlanFilters.length > 0
                  ? `Nenhum aluno encontrado nos planejamentos selecionados (${selectedPlanFilters.join(', ')}).`
                  : 'Nenhum aluno corresponde aos filtros selecionados.'}
              </p>
            </div>
            {selectedPlanFilters.length > 0 && clients.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlanFilters([])}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 font-bold text-xs border border-slate-700 active:scale-95 transition cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Ver Todos os Planejamentos ({clients.length})</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredClients.map((client) => {
            const accessReady = isStudentAccessComplete(client);
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition tracking-tight truncate">
                        {client.name}
                      </h3>
                      {accessReady ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                          <KeyRound className="w-3 h-3" /> Acesso Liberado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-300">
                          <AlertCircle className="w-3 h-3" /> Completar Cadastro p/ Acesso
                        </span>
                      )}
                    </div>

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

                {/* Botões de Ação Rápida: Nutrição, Editar Cadastro e Excluir */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-start">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openStudentProfile(client, 'nutricao');
                    }}
                    className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 flex items-center justify-center active:scale-95 transition cursor-pointer shadow-xs touch-manipulation shrink-0"
                    title="Abrir Nutrição e Prescrição de Dieta"
                    aria-label={`Abrir nutrição de ${client.name}`}
                  >
                    <Utensils className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(client);
                    }}
                    className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center active:scale-95 transition cursor-pointer shadow-xs touch-manipulation shrink-0"
                    title="Editar Cadastro e Senha do Aluno"
                    aria-label={`Editar cadastro de ${client.name}`}
                  >
                    <Edit2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setClientToDelete(client);
                    }}
                    className="w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-xl bg-slate-800/90 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/40 flex items-center justify-center active:scale-95 transition cursor-pointer shadow-xs touch-manipulation shrink-0"
                    title="Excluir Cliente"
                    aria-label={`Excluir ${client.name}`}
                  >
                    <Trash2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
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
                    {editingClient ? 'Editar Cadastro e Acesso do Aluno' : 'Cadastrar Novo Aluno'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Preencha os 4 dados obrigatórios e gere a senha para liberar o acesso exclusivo do aluno
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

            {copiedCredentialsToast && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>E-mail e senha copiados para a área de transferência!</span>
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
                    Data de Nascimento *
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
                    E-mail (Login do Aluno) *
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
                    Número de Telefone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="(11) 98765-4321"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Senha de Acesso do Aluno Gerada pelo Treinador */}
              <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Senha de Acesso do Aluno *</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAccessPassword(generateStudentPassword(name))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-cyan-300 border border-slate-700 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Gerar Senha</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyCredentials(name, email, accessPassword)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-[11px] font-bold text-cyan-200 border border-cyan-500/40 transition cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar Acesso</span>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type={showModalPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={accessPassword}
                    onChange={(e) => setAccessPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full px-3.5 py-2 pr-10 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  O aluno entrará no aplicativo usando o e-mail acima e esta senha gerada por você.
                </p>
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
                  className="h-10 sm:h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap shrink-0"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 h-10 sm:h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/40 active:scale-95 transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
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
