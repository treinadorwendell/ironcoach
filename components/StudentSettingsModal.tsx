'use client';

import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  User as UserIcon,
  Lock,
  Check,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogOut,
  Settings,
  Mail,
  Phone,
  Calendar,
  Scale,
  Ruler,
} from 'lucide-react';
import { Client, TrainerProfile } from '@/types';
import {
  updateTrainerPassword,
  updateTrainerDisplayName,
  getFirebaseAuthErrorMessage,
} from '@/lib/firebase';
import { User } from 'firebase/auth';

interface StudentSettingsModalProps {
  isOpen: boolean;
  student: Client | null;
  trainerProfile?: TrainerProfile | null;
  currentUser?: User | null;
  isStudentAccountLocked?: boolean;
  onClose: () => void;
  onSaveStudent: (updatedClient: Client, previousEmail?: string) => void;
  onLogout?: () => void;
}

export const StudentSettingsModal: React.FC<StudentSettingsModalProps> = ({
  isOpen,
  student,
  trainerProfile,
  currentUser,
  isStudentAccountLocked = false,
  onClose,
  onSaveStudent,
  onLogout,
}) => {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && student) {
      setName(student.name || '');
      setBirthDate(student.birthDate || '');
      setEmail(student.email || '');
      setPhone(student.phone || '');
      setWeight(student.weight ? String(student.weight) : '');
      setHeight(student.height ? String(student.height) : '');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = name.trim();
    const cleanBirthDate = birthDate.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanPassword = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (cleanName.length < 3) {
      setErrorMessage('Por favor, informe seu nome completo (mínimo 3 caracteres).');
      return;
    }

    if (!cleanBirthDate) {
      setErrorMessage('Por favor, informe sua data de nascimento.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Por favor, informe um e-mail válido.');
      return;
    }

    if (cleanPhone.replace(/\D/g, '').length < 8) {
      setErrorMessage('Por favor, informe um número de telefone válido com DDD.');
      return;
    }

    if (cleanPassword.length > 0) {
      if (cleanPassword.length < 6) {
        setErrorMessage('A nova senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (cleanPassword !== cleanConfirm) {
        setErrorMessage('A confirmação de senha não coincide com a nova senha.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const previousEmail = student.email;
      const parsedWeight = parseFloat(weight);
      const parsedHeight = parseFloat(height);

      const updatedClient: Client = {
        ...student,
        name: cleanName,
        birthDate: cleanBirthDate,
        email: cleanEmail,
        phone: cleanPhone,
        weight: !isNaN(parsedWeight) && parsedWeight > 0 ? parsedWeight : student.weight,
        height: !isNaN(parsedHeight) && parsedHeight > 0 ? parsedHeight : student.height,
        accessPassword:
          cleanPassword.length >= 6 ? cleanPassword : student.accessPassword,
      };

      if (isStudentAccountLocked && currentUser) {
        try {
          await updateTrainerDisplayName(cleanName);
        } catch {
          // Ignore display name error if any
        }

        if (cleanPassword.length >= 6) {
          try {
            await updateTrainerPassword(cleanPassword);
          } catch (pwdErr: unknown) {
            const code = (pwdErr as { code?: string })?.code || '';
            if (code !== 'auth/requires-recent-login') {
              setErrorMessage(getFirebaseAuthErrorMessage(pwdErr));
              setIsSaving(false);
              return;
            }
          }
        }
      }

      onSaveStudent(updatedClient, previousEmail);
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage(
        cleanPassword.length >= 6
          ? 'Suas informações e nova senha foram salvas com sucesso!'
          : 'Suas informações foram atualizadas com sucesso!'
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar as alterações. Tente novamente.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pl-[max(0.75rem,var(--sal))] pr-[max(0.75rem,var(--sar))] sm:px-5 pt-[calc(var(--sat)+0.5rem)] pb-[calc(var(--sab)+0.5rem)] bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-modal-safe sm:max-h-[90dvh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-950/50 ring-1 ring-white/10 shrink-0">
              {trainerProfile?.logoDataUrl ? (
                <img
                  src={trainerProfile.logoDataUrl}
                  alt="Logo IronCoach"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Dumbbell className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
                  Configurações do Aluno
                </h2>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Edite seus dados pessoais, senha de acesso ou saia da conta
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
            title="Fechar configurações"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Dados Pessoais */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5" />
              <span>Informações Pessoais</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Nome Completo</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Data de Nascimento</span>
                </label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Telefone / WhatsApp</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                <span>E-mail de Acesso</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Peso (kg)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="300"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="75"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Altura (cm)</span>
                </label>
                <input
                  type="number"
                  step="1"
                  min="100"
                  max="250"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="175"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Segurança e Senha */}
          <div className="pt-3 border-t border-slate-800/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Segurança & Senha</span>
              </h3>
              <span className="text-[10px] font-semibold text-slate-400">
                Deixe em branco para manter a atual
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200">
                  Confirmar Nova Senha
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Sair da Conta */}
          {onLogout && (
            <div className="pt-3 border-t border-slate-800/80">
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Sessão Conectada
                  </span>
                  <span className="text-xs font-semibold text-slate-200 truncate block">
                    {student.email || currentUser?.email || student.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200 text-xs font-bold transition active:scale-95 cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sair da Conta</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-cyan-950/60 transition active:scale-95 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
