'use client';

import React, { useState, useId } from 'react';
import {
  Dumbbell,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  X,
  KeyRound,
  ArrowLeft,
  Smartphone,
  Cloud,
  Loader2,
  GraduationCap,
} from 'lucide-react';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  resetPassword,
  getFirebaseAuthErrorMessage,
} from '@/lib/firebase';
import { User } from 'firebase/auth';
import { AppUserRole } from '@/types';

interface AuthScreenProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: (user: User, role: AppUserRole) => void;
  /**
   * If true, renders as an inline full-page container (e.g., when unauthenticated)
   * If false or not provided with isOpen, renders as a responsive overlay/modal
   */
  mode?: 'modal' | 'fullscreen';
  initialTab?: 'login' | 'register';
  initialRole?: AppUserRole;
}

type AuthTab = 'login' | 'register' | 'forgot_password';

export const AuthScreen: React.FC<AuthScreenProps> = ({
  isOpen = true,
  onClose,
  onSuccess,
  mode = 'modal',
  initialTab = 'login',
  initialRole = 'trainer',
}) => {
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);
  const [selectedRole, setSelectedRole] = useState<AppUserRole>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Accessible IDs for inputs
  const emailInputId = useId();
  const passwordInputId = useId();
  const confirmPasswordInputId = useId();
  const nameInputId = useId();

  if (!isOpen) return null;

  // Calculador de força da senha
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-700' };
    if (pwd.length < 6) return { score: 1, label: 'Muito fraca (mínimo 6 dígitos)', color: 'bg-rose-500' };

    let score = 1;
    if (pwd.length >= 8) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score++;

    if (score === 2) return { score: 2, label: 'Razoável', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Boa', color: 'bg-cyan-500' };
    return { score: 4, label: 'Excelente e segura', color: 'bg-emerald-500' };
  };

  const passwordStrength = getPasswordStrength(password);

  // Limpa mensagens ao trocar de aba
  const handleSwitchTab = (newTab: AuthTab) => {
    setActiveTab(newTab);
    setErrorMessage(null);
    setErrorCode(null);
    setSuccessMessage(null);
  };

  // Validação de E-mail
  const isValidEmail = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  // Submissão do Formulário de Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Por favor, informe seu endereço de e-mail.');
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setErrorMessage('Formato de e-mail inválido. Verifique o endereço digitado.');
      return;
    }
    if (!password) {
      setErrorMessage('Por favor, informe sua senha.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await loginWithEmail(cleanEmail, password);
      setSuccessMessage(`Bem-vindo de volta${user.displayName ? `, ${user.displayName}` : ''}! Sincronizando dados...`);
      setTimeout(() => {
        onSuccess?.(user, selectedRole);
        onClose?.();
      }, 700);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      setErrorCode(code);
      const friendlyMsg = getFirebaseAuthErrorMessage(err);
      setErrorMessage(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Submissão do Formulário de Registro
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorCode(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    const cleanName = displayName.trim();

    if (!cleanName) {
      setErrorMessage('Por favor, informe seu nome ou nome do estúdio/box.');
      return;
    }
    if (!cleanEmail) {
      setErrorMessage('Por favor, informe um endereço de e-mail.');
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setErrorMessage('Formato de e-mail inválido. Verifique e tente novamente.');
      return;
    }
    if (!password) {
      setErrorMessage('Por favor, crie uma senha segura.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('A senha é muito curta. O Firebase exige no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem. Verifique a confirmação.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await registerWithEmail(cleanEmail, password, cleanName);
      setSuccessMessage('Conta criada com sucesso! Sincronização em nuvem ativada.');
      setTimeout(() => {
        onSuccess?.(user, selectedRole);
        onClose?.();
      }, 900);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      setErrorCode(code);
      const friendlyMsg = getFirebaseAuthErrorMessage(err);
      setErrorMessage(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Submissão de Recuperação de Senha
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorCode(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Digite seu e-mail para receber as instruções de recuperação.');
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setErrorMessage('Formato de e-mail inválido.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(cleanEmail);
      setSuccessMessage(
        `Enviamos um link de redefinição de senha para "${cleanEmail}". Verifique sua caixa de entrada e spam.`
      );
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      setErrorCode(code);
      const friendlyMsg = getFirebaseAuthErrorMessage(err);
      setErrorMessage(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Login com Google
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setErrorCode(null);
    setSuccessMessage(null);
    setIsGoogleLoading(true);
    try {
      const user = await loginWithGoogle();
      if (user) {
        setSuccessMessage(`Conectado como ${user.displayName || user.email}!`);
        setTimeout(() => {
          onSuccess?.(user, selectedRole);
          onClose?.();
        }, 600);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      setErrorCode(code);
      const friendlyMsg = getFirebaseAuthErrorMessage(err);
      setErrorMessage(friendlyMsg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div
      className={
        mode === 'fullscreen'
          ? 'min-h-[calc(100vh-120px)] flex items-center justify-center p-3 sm:p-6'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200'
      }
    >
      <div className="w-full max-w-md bg-slate-900 border border-emerald-500/30 rounded-3xl shadow-2xl shadow-emerald-950/40 overflow-hidden flex flex-col my-auto transition-all">
        {/* Top Header Card */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 border-b border-slate-800">
          {/* Close button if modal */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95"
              title="Fechar tela de autenticação"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/30 flex-shrink-0">
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">IronCoach</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  PRO PWA
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <Cloud className="w-3.5 h-3.5 text-emerald-400 inline" />
                <span>Sincronização em nuvem e histórico contínuo</span>
              </p>
            </div>
          </div>

          {/* Seletor de Perfil de Acesso: Treinador vs Aluno */}
          {activeTab !== 'forgot_password' && (
            <div className="mt-4 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 block px-0.5">
                Escolha o Perfil de Acesso (Desenvolvimento / Uso):
              </span>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/90 rounded-2xl border border-slate-800/90">
                <button
                  type="button"
                  onClick={() => setSelectedRole('trainer')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedRole === 'trainer'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Perfil Treinador</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('student')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedRole === 'student'
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/60'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Perfil Aluno</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 px-1">
                {selectedRole === 'trainer'
                  ? 'Acesso total: gestão de alunos, agenda, criação de treinos e prescrição de dieta.'
                  : 'Visão do Aluno: visualização de Meu Treino, Minha Dieta, Meu Progresso e execução de séries.'}
              </p>
            </div>
          )}

          {/* Tabs: Entrar / Cadastrar */}
          {activeTab !== 'forgot_password' && (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/90 rounded-2xl border border-slate-800/90 mt-3">
              <button
                type="button"
                onClick={() => handleSwitchTab('login')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'login'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTab('register')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'register'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Cadastrar</span>
              </button>
            </div>
          )}

          {/* Header se for Esqueci Senha */}
          {activeTab === 'forgot_password' && (
            <div className="flex items-center gap-2 mt-4 pt-2">
              <button
                type="button"
                onClick={() => handleSwitchTab('login')}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Voltar ao login"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="text-sm font-extrabold text-white">Recuperação de Acesso</h3>
                <p className="text-[11px] text-slate-400">Enviaremos um link para seu e-mail</p>
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex flex-col gap-2 animate-in shake duration-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block text-rose-300">Falha na autenticação</span>
                  <span>{errorMessage}</span>
                </div>
              </div>

              {/* Botão de resolução rápida para E-mail já existente */}
              {errorCode === 'auth/email-already-in-use' && (
                <div className="pt-2 border-t border-rose-500/25 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-rose-300">Deseja entrar com este e-mail?</span>
                  <button
                    type="button"
                    onClick={() => handleSwitchTab('login')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Ir para Login</span>
                  </button>
                </div>
              )}

              {/* Botão de resolução rápida para Provedor de e-mail não ativado */}
              {errorCode === 'auth/operation-not-allowed' && (
                <div className="pt-2 border-t border-rose-500/25 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-rose-300">Use o login instantâneo com Google:</span>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-700" />
                    ) : (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>Entrar com Google</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block text-emerald-300">Sucesso!</span>
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          {/* TAB 1: ENTRAR (LOGIN) */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              {/* Campo E-mail */}
              <div className="space-y-1">
                <label
                  htmlFor={emailInputId}
                  className="text-xs font-bold text-slate-300 flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>E-mail</span>
                </label>
                <div className="relative">
                  <input
                    id={emailInputId}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 pl-3.5 pr-3 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={passwordInputId}
                    className="text-xs font-bold text-slate-300 flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Senha</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSwitchTab('forgot_password')}
                    className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id={passwordInputId}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="Sua senha secreta"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-3.5 pr-10 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botão Entrar Principal */}
              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 border border-emerald-400/30 transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 stroke-[2.5]" />
                    <span>Entrar no IronCoach</span>
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: CADASTRAR (REGISTER) */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {/* Campo Nome */}
              <div className="space-y-1">
                <label
                  htmlFor={nameInputId}
                  className="text-xs font-bold text-slate-300 flex items-center gap-1.5"
                >
                  <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Nome do Treinador / Estúdio</span>
                </label>
                <input
                  id={nameInputId}
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Ex: Carlos Personal ou Iron Studio"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-11 pl-3.5 pr-3 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              {/* Campo E-mail */}
              <div className="space-y-1">
                <label
                  htmlFor={emailInputId}
                  className="text-xs font-bold text-slate-300 flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>E-mail</span>
                </label>
                <input
                  id={emailInputId}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  placeholder="treinador@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-3.5 pr-3 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              {/* Campo Senha */}
              <div className="space-y-1">
                <label
                  htmlFor={passwordInputId}
                  className="text-xs font-bold text-slate-300 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Criar Senha (mín. 6 dígitos)</span>
                </label>
                <div className="relative">
                  <input
                    id={passwordInputId}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-3.5 pr-10 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    title={showPassword ? 'Ocultar' : 'Exibir'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Medidor de Força da Senha */}
                {password.length > 0 && (
                  <div className="pt-1 space-y-1">
                    <div className="grid grid-cols-4 gap-1 h-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`rounded-full transition-all duration-200 ${
                            step <= passwordStrength.score ? passwordStrength.color : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Força: <strong className="text-white">{passwordStrength.label}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Campo Confirmar Senha */}
              <div className="space-y-1">
                <label
                  htmlFor={confirmPasswordInputId}
                  className="text-xs font-bold text-slate-300 flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Confirmar Senha</span>
                </label>
                <div className="relative">
                  <input
                    id={confirmPasswordInputId}
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    placeholder="Repita sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full h-11 pl-3.5 pr-10 bg-slate-950 border rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none transition ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-rose-500 focus:border-rose-500'
                        : 'border-slate-700/80 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    title={showConfirmPassword ? 'Ocultar' : 'Exibir'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <span className="text-[10px] text-rose-400 font-bold block">
                    As senhas não coincidem.
                  </span>
                )}
              </div>

              {/* Botão Registrar Principal */}
              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 border border-emerald-400/30 transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Criando conta...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 stroke-[2.5]" />
                    <span>Cadastrar Gratuitamente</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: ESQUECI MINHA SENHA */}
          {activeTab === 'forgot_password' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  Como funciona:
                </span>
                <p className="text-slate-400">
                  Informe o e-mail cadastrado na sua conta. Você receberá uma mensagem oficial do Firebase Authentication contendo o link seguro para redefinir sua senha.
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor={emailInputId}
                  className="text-xs font-bold text-slate-300 flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Seu e-mail cadastrado</span>
                </label>
                <input
                  id={emailInputId}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  placeholder="treinador@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-3.5 pr-3 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/60 border border-cyan-400/30 transition active:scale-[0.98] disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Enviando link...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Enviar Link de Recuperação</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSwitchTab('login')}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar para tela de login</span>
              </button>
            </form>
          )}

          {/* Divisor "ou continue com" */}
          {activeTab !== 'forgot_password' && (
            <>
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider relative shrink-0">
                  ou continue com
                </span>
              </div>

              {/* Botão Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                className="w-full h-11 rounded-xl bg-slate-950 hover:bg-slate-800/90 border border-slate-700/80 hover:border-slate-600 text-slate-200 text-xs font-bold flex items-center justify-center gap-2.5 transition active:scale-[0.98] disabled:opacity-60"
              >
                {isGoogleLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continuar com o Google</span>
              </button>
            </>
          )}

          {/* PWA Offline Info & Skip / Guest Mode */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 truncate">
              <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Otimizado para PWA / Tablet</span>
            </span>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white font-semibold transition underline underline-offset-2 shrink-0 ml-2"
              >
                Continuar Offline
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
