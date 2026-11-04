'use client';

import React, { useState, useEffect } from 'react';
import {
  MainNavSection,
  Client,
  WorkoutProgram,
  CalendarEvent,
  TrainerProfile,
  AppUserRole,
  StudentNavSection,
  StudentSessionContext,
} from '@/types';
import {
  storage,
  INITIAL_CLIENTS,
  INITIAL_WORKOUTS,
  INITIAL_CALENDAR,
  expandLegacyRecurringEvents,
} from '@/lib/storage';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { ClientSection } from '@/components/ClientSection';
import { AgendaSection } from '@/components/AgendaSection';
import { CreateWorkoutSection } from '@/components/CreateWorkoutSection';
import { WorkoutExecutionSection } from '@/components/WorkoutExecutionSection';
import { StudentDietView } from '@/components/StudentDietView';
import { WorkoutHistoryPage } from '@/components/WorkoutHistoryPage';
import { AuthScreen } from '@/components/AuthScreen';
import { TrainerProfileModal } from '@/components/TrainerProfileModal';
import { StudentSettingsModal } from '@/components/StudentSettingsModal';
import { testConnection, cloudSync, auth, logoutUser } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { RefreshCw, GraduationCap, ShieldCheck } from 'lucide-react';
import { useInactivitySync } from '@/hooks/useInactivitySync';
import { motion, AnimatePresence } from 'motion/react';

export default function Home() {
  const [currentSection, setCurrentSection] = useState<MainNavSection>('agenda');

  // Role & Student Portal states
  const [appRole, setAppRole] = useState<AppUserRole>('trainer');
  const [studentSession, setStudentSession] = useState<StudentSessionContext | null>(null);
  const [studentSection, setStudentSection] = useState<StudentNavSection>('meu-treino');
  const [activeStudentId, setActiveStudentId] = useState<string>('');

  // Initialize with empty clean slate state matching SSR server HTML
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [workouts, setWorkouts] = useState<WorkoutProgram[]>(INITIAL_WORKOUTS);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(INITIAL_CALENDAR);

  // Cross-navigation context
  const [preSelectedClientId, setPreSelectedClientId] = useState<string | undefined>(undefined);
  const [activeWorkoutForExecution, setActiveWorkoutForExecution] =
    useState<WorkoutProgram | null>(null);
  const [hasActiveRunningSession, setHasActiveRunningSession] = useState(false);
  const [executionNavTrigger, setExecutionNavTrigger] = useState(0);

  // Auth Screen & User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Trainer Profile state & modal
  const [trainerProfile, setTrainerProfile] = useState<TrainerProfile | null>(null);
  const [isTrainerProfileModalOpen, setIsTrainerProfileModalOpen] = useState(false);
  const [isStudentSettingsModalOpen, setIsStudentSettingsModalOpen] = useState(false);

  // Hook de sincronização forçada com o Firestore ao retornar ao app após inatividade
  const { isSyncing: isResumingSync, syncNotice } = useInactivitySync({
    inactivityThresholdMs: 15000,
    showToast: true,
  });

  // Safely hydrate data from client storage and cloud on mount
  useEffect(() => {
    // 1. Mandatory connection test probe
    testConnection();

    // 2. Hydrate local storage first
    const timer = setTimeout(() => {
      const loadedClients = storage.getClients();
      const loadedWorkouts = storage.getWorkouts();
      const loadedCalendar = storage.getCalendarEvents();
      const savedRole = storage.getAppRole();
      const savedStudentId = storage.getActiveStudentId();
      const savedStudentSession = storage.getStudentSession();

      setClients(loadedClients);
      setWorkouts(loadedWorkouts);
      setCalendarEvents(loadedCalendar);

      if (savedStudentSession) {
        setStudentSession(savedStudentSession);
        setAppRole('student');
        setActiveStudentId(savedStudentSession.clientId);
      } else {
        setAppRole(savedRole);
        if (savedStudentId && loadedClients.some((c) => c.id === savedStudentId)) {
          setActiveStudentId(savedStudentId);
        } else if (loadedClients.length > 0) {
          setActiveStudentId(loadedClients[0].id);
        }
      }

      if (loadedWorkouts.length > 0) {
        const savedSession = storage.getActiveSession();
        if (savedSession && savedSession.isStarted) {
          const matchingWorkout = loadedWorkouts.find((w) => w.id === savedSession.programId);
          if (matchingWorkout) {
            setActiveWorkoutForExecution(matchingWorkout);
            return;
          }
        }
      } else {
        setActiveWorkoutForExecution(null);
      }
    }, 0);

    // 3. Listen to Firebase Auth & Subscribe to real-time Cloud Sync
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const activeStudSession = storage.getStudentSession();
        const isLockedStudent = Boolean(
          activeStudSession &&
            (!user.email ||
              user.email.trim().toLowerCase() === activeStudSession.email.trim().toLowerCase())
        );

        if (isLockedStudent && activeStudSession) {
          setStudentSession(activeStudSession);
          setAppRole('student');
          setActiveStudentId(activeStudSession.clientId);
          setIsTrainerProfileModalOpen(false);
        } else {
          setStudentSession(null);
          storage.saveStudentSession(null);
        }

        const targetSyncUid =
          isLockedStudent &&
          activeStudSession?.trainerUid &&
          activeStudSession.trainerUid !== 'local-trainer'
            ? activeStudSession.trainerUid
            : user.uid;

        // Hydrate local profile immediately if available for this user
        const localProfile = storage.getTrainerProfile(targetSyncUid);
        if (localProfile) {
          setTrainerProfile(localProfile);
        }

        if (!isLockedStudent) {
          setCurrentSection('agenda');
        }

        cloudSync.subscribe(targetSyncUid, {
          onClientsChange: (cloudClients) => {
            setClients(cloudClients);
          },
          onWorkoutsChange: (cloudWorkouts) => {
            setWorkouts(cloudWorkouts);
          },
          onCalendarChange: (cloudEvents) => {
            const { events: normalized, changedEvents } = expandLegacyRecurringEvents(cloudEvents);
            if (changedEvents.length > 0) {
              storage.saveCalendarEvents(normalized);
              changedEvents.forEach((evt) => cloudSync.syncCalendarEvent(evt));
            }
            setCalendarEvents(normalized);
          },
          onActiveSessionChange: (cloudSession) => {
            if (cloudSession && cloudSession.isStarted) {
              setHasActiveRunningSession(true);
              const latestWorkouts = storage.getWorkouts();
              const matchingWorkout = latestWorkouts.find((w) => w.id === cloudSession.programId);
              if (matchingWorkout) {
                setActiveWorkoutForExecution(matchingWorkout);
              }
            } else {
              setHasActiveRunningSession(false);
            }
          },
          onTrainerProfileChange: (cloudProfile) => {
            const currentStudSession = storage.getStudentSession();
            if (cloudProfile && cloudProfile.name?.trim() && cloudProfile.isProfileCompleted) {
              setTrainerProfile(cloudProfile);
            } else {
              const fallback = storage.getTrainerProfile(targetSyncUid);
              if (fallback && fallback.name?.trim() && fallback.isProfileCompleted) {
                setTrainerProfile(fallback);
              } else {
                setTrainerProfile(cloudProfile || fallback || null);
                if (!currentStudSession) {
                  setIsTrainerProfileModalOpen(true);
                }
              }
            }
          },
        });
      } else {
        setTrainerProfile(null);
        setIsTrainerProfileModalOpen(false);
        cloudSync.unsubscribe();
      }
    });

    // 4. Listener para reidratação de estado imediata ao concluir forceSync
    const handleDataSynced = () => {
      setClients(storage.getClients());
      setWorkouts(storage.getWorkouts());
      setCalendarEvents(storage.getCalendarEvents());
    };
    window.addEventListener('ironcoach:data-synced', handleDataSynced);

    // 5. Listener para atualização de status na agenda em tempo real
    const handleCalendarUpdated = () => {
      setCalendarEvents(storage.getCalendarEvents());
    };
    window.addEventListener('ironcoach:calendar-updated', handleCalendarUpdated);

    return () => {
      clearTimeout(timer);
      unsubAuth();
      cloudSync.unsubscribe();
      window.removeEventListener('ironcoach:data-synced', handleDataSynced);
      window.removeEventListener('ironcoach:calendar-updated', handleCalendarUpdated);
    };
  }, []);

  // Monitora continuamente se há sessão ativa iniciada para refletir no badge do BottomNav
  useEffect(() => {
    const updateActiveRunningSession = () => {
      const sess = storage.getActiveSession();
      setHasActiveRunningSession(Boolean(sess && sess.isStarted));
    };
    updateActiveRunningSession();
    window.addEventListener('ironcoach:active-session-updated', updateActiveRunningSession);
    const interval = setInterval(updateActiveRunningSession, 1500);
    return () => {
      clearInterval(interval);
      window.removeEventListener('ironcoach:active-session-updated', updateActiveRunningSession);
    };
  }, []);

  // TRAINER PROFILE HANDLER
  const handleSaveTrainerProfile = (updatedProfile: TrainerProfile) => {
    setTrainerProfile(updatedProfile);
    storage.saveTrainerProfile(updatedProfile, currentUser?.uid);
    cloudSync.syncTrainerProfile(updatedProfile);
    setIsTrainerProfileModalOpen(false);
  };

  // CLIENT HANDLERS
  const handleAddClient = (newClient: Client) => {
    const withTrainer: Client = {
      ...newClient,
      trainerUid: currentUser?.uid || newClient.trainerUid,
    };
    const updated = [withTrainer, ...clients];
    setClients(updated);
    storage.saveClients(updated);
    cloudSync.syncClient(withTrainer);
  };

  const handleUpdateClient = (updatedClient: Client, previousEmail?: string) => {
    const resolvedTrainerUid =
      studentSession?.trainerUid || updatedClient.trainerUid || currentUser?.uid;
    const withTrainer: Client = {
      ...updatedClient,
      trainerUid: resolvedTrainerUid,
    };
    const exists = clients.some((c) => c.id === withTrainer.id);
    const updated = exists
      ? clients.map((c) => (c.id === withTrainer.id ? withTrainer : c))
      : [withTrainer, ...clients];
    setClients(updated);
    storage.saveClients(updated);
    cloudSync.syncClient(withTrainer, previousEmail);

    if (studentSession && studentSession.clientId === withTrainer.id) {
      const updatedSession: StudentSessionContext = {
        ...studentSession,
        name: withTrainer.name,
        birthDate: withTrainer.birthDate,
        email: withTrainer.email,
        phone: withTrainer.phone || studentSession.phone,
      };
      setStudentSession(updatedSession);
      storage.saveStudentSession(updatedSession);
    }
  };

  const handleDeleteClient = (clientId: string) => {
    const clientToRemove = clients.find((c) => c.id === clientId);
    const updatedClients = clients.filter((c) => c.id !== clientId);
    setClients(updatedClients);
    storage.saveClients(updatedClients);
    cloudSync.removeClient(clientId, clientToRemove?.email);

    // Cascade clean up workouts
    const toDeleteWorkouts = workouts.filter((w) => w.clientId === clientId);
    const updatedWorkouts = workouts.filter((w) => w.clientId !== clientId);
    setWorkouts(updatedWorkouts);
    storage.saveWorkouts(updatedWorkouts);
    toDeleteWorkouts.forEach((w) => cloudSync.removeWorkout(w.id));

    // Cascade clean up calendar events
    const toDeleteEvents = calendarEvents.filter((e) => e.clientId === clientId);
    const updatedEvents = calendarEvents.filter((e) => e.clientId !== clientId);
    setCalendarEvents(updatedEvents);
    storage.saveCalendarEvents(updatedEvents);
    toDeleteEvents.forEach((e) => cloudSync.removeCalendarEvent(e.id));

    if (activeWorkoutForExecution?.clientId === clientId) {
      setActiveWorkoutForExecution(updatedWorkouts[0] || null);
    }
  };

  // WORKOUT HANDLERS
  const handleSaveWorkout = (newWorkout: WorkoutProgram) => {
    const existingIndex = workouts.findIndex((w) => w.id === newWorkout.id);
    let updated: WorkoutProgram[];
    if (existingIndex >= 0) {
      updated = [...workouts];
      updated[existingIndex] = newWorkout;
    } else {
      updated = [newWorkout, ...workouts];
    }
    setWorkouts(updated);
    storage.saveWorkouts(updated);
    cloudSync.syncWorkout(newWorkout);
    const savedSession = storage.getActiveSession();
    if (savedSession && savedSession.isStarted && savedSession.programId === newWorkout.id) {
      setActiveWorkoutForExecution(newWorkout);
    }
  };

  const handleDeleteWorkout = (workoutId: string) => {
    const updated = workouts.filter((w) => w.id !== workoutId);
    setWorkouts(updated);
    storage.saveWorkouts(updated);
    cloudSync.removeWorkout(workoutId);
    if (activeWorkoutForExecution?.id === workoutId) {
      setActiveWorkoutForExecution(updated[0] || null);
    }
  };

  // CALENDAR HANDLERS
  const handleAddCalendarEvent = (newEvent: CalendarEvent) => {
    const existingIndex = calendarEvents.findIndex(
      (e) =>
        e.id === newEvent.id ||
        (e.clientId === newEvent.clientId &&
          e.date === newEvent.date &&
          (!e.recurringDays || e.recurringDays.length === 0))
    );
    let updated: CalendarEvent[];
    if (existingIndex >= 0) {
      updated = [...calendarEvents];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...newEvent,
        id: updated[existingIndex].id,
      };
      cloudSync.syncCalendarEvent(updated[existingIndex]);
    } else {
      updated = [newEvent, ...calendarEvents];
      cloudSync.syncCalendarEvent(newEvent);
    }
    setCalendarEvents(updated);
    storage.saveCalendarEvents(updated);
  };

  const handleAddCalendarEvents = (newEvents: CalendarEvent[]) => {
    if (!newEvents || newEvents.length === 0) return;
    const updated = [...calendarEvents];
    const toSync: CalendarEvent[] = [];

    newEvents.forEach((newEvent) => {
      const existingIndex = updated.findIndex(
        (e) =>
          e.id === newEvent.id ||
          (e.clientId === newEvent.clientId &&
            e.date === newEvent.date &&
            (!e.recurringDays || e.recurringDays.length === 0))
      );
      if (existingIndex >= 0) {
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...newEvent,
          id: updated[existingIndex].id,
        };
        toSync.push(updated[existingIndex]);
      } else {
        updated.unshift(newEvent);
        toSync.push(newEvent);
      }
    });

    setCalendarEvents(updated);
    storage.saveCalendarEvents(updated);
    toSync.forEach((evt) => cloudSync.syncCalendarEvent(evt));
  };

  const handleUpdateCalendarEvent = (updatedEvent: CalendarEvent) => {
    const updated = calendarEvents.map((e) =>
      e.id === updatedEvent.id ? updatedEvent : e
    );
    setCalendarEvents(updated);
    storage.saveCalendarEvents(updated);
    cloudSync.syncCalendarEvent(updatedEvent);
  };

  const handleDeleteCalendarEvent = (eventId: string) => {
    const updated = calendarEvents.filter((e) => e.id !== eventId);
    setCalendarEvents(updated);
    storage.saveCalendarEvents(updated);
    cloudSync.removeCalendarEvent(eventId);
  };

  // Confirmação de treino realizado disparado a partir da aba Execução de Treino
  const handleConfirmWorkoutCompletedInAgenda = (
    clientId: string,
    clientName: string,
    workoutName: string,
    dateIso: string,
    startTimeStr?: string,
    trainerNotes?: string
  ) => {
    // 1. Procurar se já existe agendamento deste aluno nesta data específica
    const existingIndex = calendarEvents.findIndex(
      (e) => e.clientId === clientId && e.date === dateIso
    );

    let updated: CalendarEvent[];
    if (existingIndex >= 0) {
      const existing = calendarEvents[existingIndex];
      const updatedEvt: CalendarEvent = {
        ...existing,
        status: 'realizado',
        title: existing.title || workoutName || 'Treino Realizado',
        notes: trainerNotes
          ? `${existing.notes ? existing.notes + ' • ' : ''}${trainerNotes}`
          : existing.notes,
      };
      updated = [...calendarEvents];
      updated[existingIndex] = updatedEvt;
      cloudSync.syncCalendarEvent(updatedEvt);
    } else {
      // 2. Se não houver evento na data direta, verificar se há template de dia recorrente
      const [y, m, d] = dateIso.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d).getDay();
      const recurringEvt = calendarEvents.find(
        (e) => e.clientId === clientId && e.recurringDays?.includes(dayOfWeek)
      );

      const now = new Date();
      const startH =
        startTimeStr ||
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const endHourNum = (parseInt(startH.split(':')[0], 10) + 1) % 24;
      const endH = `${String(endHourNum).padStart(2, '0')}:${startH.split(':')[1] || '00'}`;

      const newEvt: CalendarEvent = {
        id: `evt-${Date.now()}`,
        clientId,
        clientName,
        title: recurringEvt?.title || workoutName || 'Treino Realizado',
        date: dateIso,
        startTime: recurringEvt?.startTime || startH,
        endTime: recurringEvt?.endTime || endH,
        status: 'realizado',
        notes: trainerNotes || 'Treino finalizado na Execução de Treino',
      };
      updated = [newEvt, ...calendarEvents];
      cloudSync.syncCalendarEvent(newEvt);
    }

    setCalendarEvents(updated);
    storage.saveCalendarEvents(updated);
  };

  // CROSS-TAB ACTIONS
  const handleStartWorkoutForClient = (client: Client) => {
    const clientWorkout = workouts.find((w) => w.clientId === client.id) || workouts[0];
    if (clientWorkout) {
      setActiveWorkoutForExecution(clientWorkout);
    }
    setExecutionNavTrigger((prev) => prev + 1);
    setCurrentSection('execucao');
  };

  const handleCreateWorkoutForClient = (client: Client) => {
    setPreSelectedClientId(client.id);
    setCurrentSection('criar-treino');
  };

  const handleStartExecutionFromBuilder = (workout: WorkoutProgram) => {
    setActiveWorkoutForExecution(workout);
    setExecutionNavTrigger((prev) => prev + 1);
    setCurrentSection('execucao');
  };

  // Active student name in execution
  const activeClient = clients.find(
    (c) => c.id === activeWorkoutForExecution?.clientId
  );

  const isStudentAccountLocked = Boolean(studentSession);

  // Student resolved for Student Portal view
  const effectiveStudent: Client | null = isStudentAccountLocked && studentSession
    ? clients.find((c) => c.id === studentSession.clientId) || {
        id: studentSession.clientId,
        name: studentSession.name,
        birthDate: studentSession.birthDate,
        gender: 'Masculino',
        weight: 75,
        height: 175,
        email: studentSession.email,
        phone: studentSession.phone,
        contractType: 'Presencial - Mensal',
        contractValue: 750,
        createdAt: new Date().toISOString().split('T')[0],
      }
    : clients.find((c) => c.id === activeStudentId) || clients[0] || null;

  const handleChangeRole = (nextRole: AppUserRole) => {
    if (isStudentAccountLocked) return;
    setAppRole(nextRole);
    storage.saveAppRole(nextRole);
    if (nextRole === 'student') {
      if (!activeStudentId && clients.length > 0) {
        setActiveStudentId(clients[0].id);
        storage.saveActiveStudentId(clients[0].id);
      }
      setExecutionNavTrigger((prev) => prev + 1);
    }
  };

  const handleSelectStudentId = (studentId: string) => {
    if (isStudentAccountLocked) return;
    setActiveStudentId(studentId);
    storage.saveActiveStudentId(studentId);
    setActiveWorkoutForExecution(null);
    setExecutionNavTrigger((prev) => prev + 1);
  };

  if (!currentUser) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center justify-center pl-[max(0.75rem,var(--sal))] pr-[max(0.75rem,var(--sar))] sm:px-6 pt-[calc(var(--sat)+0.75rem)] pb-[calc(var(--sab)+0.75rem)]">
        <AuthScreen
          mode="fullscreen"
          isOpen={true}
          initialRole={appRole}
          onSuccess={(user, chosenRole, loggedStudentSession) => {
            setCurrentUser(user);
            if (chosenRole === 'student' && loggedStudentSession) {
              setStudentSession(loggedStudentSession);
              setAppRole('student');
              setActiveStudentId(loggedStudentSession.clientId);
              setStudentSection('meu-treino');
            } else {
              setStudentSession(null);
              storage.saveStudentSession(null);
              setAppRole('trainer');
              storage.saveAppRole('trainer');
              setCurrentSection('agenda');
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center w-full transition-all">
      <div className="w-full max-w-none flex-1 flex flex-col transition-all relative">
        {/* Global Header */}
        <Header
          activeClientName={
            currentSection === 'execucao' ? activeClient?.name : undefined
          }
          currentUser={currentUser}
          trainerProfile={trainerProfile}
          onOpenTrainerProfile={() => {
            if (!isStudentAccountLocked) {
              setIsTrainerProfileModalOpen(true);
            }
          }}
          onOpenStudentSettings={() => {
            setIsStudentSettingsModalOpen(true);
          }}
          appRole={isStudentAccountLocked ? 'student' : appRole}
          onChangeRole={isStudentAccountLocked ? undefined : handleChangeRole}
          isStudentAccountLocked={isStudentAccountLocked}
          clients={clients}
          activeStudentId={effectiveStudent?.id}
          onSelectStudentId={isStudentAccountLocked ? undefined : handleSelectStudentId}
          onLogout={async () => {
            try {
              setIsStudentSettingsModalOpen(false);
              storage.saveStudentSession(null);
              setStudentSession(null);
              await logoutUser();
              setCurrentUser(null);
            } catch (e) {
              console.error('Logout error:', e);
            }
          }}
        />

        {/* Main Section Content with Safe-Area Clearance */}
        <main className="flex-1 pt-3 sm:pt-5 lg:pt-6 pl-[max(0.75rem,var(--sal))] pr-[max(0.75rem,var(--sar))] sm:px-5 lg:px-6 pb-[calc(5.75rem+var(--sab))] sm:pb-32 overflow-y-auto w-full min-w-0">
          {(isStudentAccountLocked || appRole === 'student') ? (
            /* VISÃO DO ALUNO (PORTAL DE RECEBIMENTO E EXECUÇÃO) */
            !effectiveStudent ? (
              <div className="max-w-xl mx-auto my-8 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    Nenhum Aluno Cadastrado para Simular o Perfil
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Para visualizar o portal do aluno (Meu Treino, Minha Dieta e Meu Progresso), cadastre pelo menos um aluno no Perfil do Treinador.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleChangeRole('trainer');
                      setCurrentSection('cliente');
                    }}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 transition active:scale-95 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Ir para Perfil Treinador e Cadastrar Aluno</span>
                  </button>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                {studentSection === 'meu-treino' && (
                  <motion.div
                    key={`student-treino-${effectiveStudent.id}`}
                    initial={{ opacity: 0, y: 10, scale: 0.995 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.995 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full"
                  >
                    <WorkoutExecutionSection
                      key={`student-exec-${effectiveStudent.id}-${executionNavTrigger}`}
                      clients={[effectiveStudent]}
                      workouts={workouts.filter((w) => w.clientId === effectiveStudent.id)}
                      activeWorkout={
                        activeWorkoutForExecution?.clientId === effectiveStudent.id
                          ? activeWorkoutForExecution
                          : null
                      }
                      calendarEvents={calendarEvents.filter(
                        (e) => e.clientId === effectiveStudent.id
                      )}
                      lockedClientId={effectiveStudent.id}
                      isStudentView={true}
                      onSelectWorkout={(w) => setActiveWorkoutForExecution(w)}
                      onConfirmWorkoutCompletedInAgenda={handleConfirmWorkoutCompletedInAgenda}
                      onFinishWorkout={() => {
                        setHasActiveRunningSession(false);
                        setActiveWorkoutForExecution(null);
                      }}
                    />
                  </motion.div>
                )}

                {studentSection === 'minha-dieta' && (
                  <motion.div
                    key={`student-dieta-${effectiveStudent.id}`}
                    initial={{ opacity: 0, y: 10, scale: 0.995 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.995 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full"
                  >
                    <StudentDietView client={effectiveStudent} />
                  </motion.div>
                )}

                {studentSection === 'meu-progresso' && (
                  <motion.div
                    key={`student-progresso-${effectiveStudent.id}`}
                    initial={{ opacity: 0, y: 10, scale: 0.995 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.995 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full"
                  >
                    <WorkoutHistoryPage
                      clients={[effectiveStudent]}
                      initialClientId={effectiveStudent.id}
                      readOnly={true}
                      hideBackButton={true}
                      onBack={() => setStudentSection('meu-treino')}
                      onStartWorkoutForClient={() => {
                        setStudentSection('meu-treino');
                        setExecutionNavTrigger((prev) => prev + 1);
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )
          ) : (
            /* VISÃO DO TREINADOR (GESTÃO COMPLETA) */
            <AnimatePresence mode="wait" initial={false}>
              {currentSection === 'cliente' && (
                <motion.div
                  key="section-cliente"
                  initial={{ opacity: 0, y: 10, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.995 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full"
                >
                  <ClientSection
                    clients={clients}
                    trainerProfile={trainerProfile}
                    onOpenTrainerProfile={() => setIsTrainerProfileModalOpen(true)}
                    onAddClient={handleAddClient}
                    onUpdateClient={handleUpdateClient}
                    onDeleteClient={handleDeleteClient}
                    onStartWorkoutForClient={handleStartWorkoutForClient}
                    onCreateWorkoutForClient={handleCreateWorkoutForClient}
                  />
                </motion.div>
              )}

              {currentSection === 'agenda' && (
                <motion.div
                  key="section-agenda"
                  initial={{ opacity: 0, y: 10, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.995 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full"
                >
                  <AgendaSection
                    events={calendarEvents}
                    clients={clients}
                    onAddEvent={handleAddCalendarEvent}
                    onAddEvents={handleAddCalendarEvents}
                    onUpdateEvent={handleUpdateCalendarEvent}
                    onDeleteEvent={handleDeleteCalendarEvent}
                    onStartWorkoutForClient={handleStartWorkoutForClient}
                  />
                </motion.div>
              )}

              {currentSection === 'criar-treino' && (
                <motion.div
                  key="section-criar-treino"
                  initial={{ opacity: 0, y: 10, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.995 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full"
                >
                  <CreateWorkoutSection
                    clients={clients}
                    workouts={workouts}
                    preSelectedClientId={preSelectedClientId}
                    onSaveWorkout={handleSaveWorkout}
                    onDeleteWorkout={handleDeleteWorkout}
                    onStartExecution={handleStartExecutionFromBuilder}
                    onNavigateToClients={() => setCurrentSection('cliente')}
                  />
                </motion.div>
              )}

              {currentSection === 'execucao' && (
                <motion.div
                  key="section-execucao"
                  initial={{ opacity: 0, y: 10, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.995 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full"
                >
                  <WorkoutExecutionSection
                    key={`execucao-${executionNavTrigger}`}
                    clients={clients}
                    workouts={workouts}
                    activeWorkout={activeWorkoutForExecution}
                    calendarEvents={calendarEvents}
                    onSelectWorkout={(w) => setActiveWorkoutForExecution(w)}
                    onNavigateToClients={() => setCurrentSection('cliente')}
                    onNavigateToCreateWorkout={(clientId) => {
                      setPreSelectedClientId(clientId);
                      setCurrentSection('criar-treino');
                    }}
                    onConfirmWorkoutCompletedInAgenda={handleConfirmWorkoutCompletedInAgenda}
                    onFinishWorkout={() => {
                      setHasActiveRunningSession(false);
                      setActiveWorkoutForExecution(null);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>

        {/* Toast Notificação de Sincronização após Inatividade com o Firestore */}
        {syncNotice && (
          <div className="fixed top-[calc(var(--sat)+4.25rem)] left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/95 border border-emerald-500/50 shadow-2xl backdrop-blur-md text-emerald-300 text-xs font-bold animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-none max-w-[92vw]">
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 shrink-0 ${isResumingSync ? 'animate-spin' : ''}`} />
            <span className="truncate">{syncNotice}</span>
          </div>
        )}

        {/* Fixed Touch-Friendly Bottom Navigation Bar */}
        <BottomNav
          appRole={isStudentAccountLocked ? 'student' : appRole}
          studentSection={studentSection}
          onSelectStudentSection={(sec) => {
            if (sec === 'meu-treino') {
              setExecutionNavTrigger((prev) => prev + 1);
            }
            setStudentSection(sec);
          }}
          currentSection={currentSection}
          onSelectSection={(sec) => {
            if (isStudentAccountLocked) return;
            if (sec === 'execucao') {
              const savedSession = storage.getActiveSession();
              if (savedSession && savedSession.isStarted) {
                const matchingWorkout = workouts.find((w) => w.id === savedSession.programId);
                if (matchingWorkout) {
                  setActiveWorkoutForExecution(matchingWorkout);
                }
              } else {
                // Sem treino iniciado: limpa qualquer sessão não iniciada e vai direto para escolher aluno
                storage.saveActiveSession(null);
                cloudSync.syncActiveSession(null);
                setActiveWorkoutForExecution(null);
              }
              setExecutionNavTrigger((prev) => prev + 1);
            }
            setCurrentSection(sec);
          }}
          hasActiveSession={hasActiveRunningSession}
        />

        {/* Modal de Perfil do Treinador (Obrigatório no 1º acesso no Perfil Treinador) */}
        {isTrainerProfileModalOpen && !isStudentAccountLocked && appRole === 'trainer' && (
          <TrainerProfileModal
            key={trainerProfile?.updatedAt || currentUser?.uid || 'trainer-profile'}
            isOpen={isTrainerProfileModalOpen}
            isFirstLoginMandatory={
              !trainerProfile || !trainerProfile.name?.trim() || !trainerProfile.isProfileCompleted
            }
            initialProfile={trainerProfile}
            currentUser={currentUser}
            onClose={() => setIsTrainerProfileModalOpen(false)}
            onSaveProfile={handleSaveTrainerProfile}
              onLogout={async () => {
              try {
                setIsTrainerProfileModalOpen(false);
                storage.saveStudentSession(null);
                setStudentSession(null);
                await logoutUser();
                setCurrentUser(null);
              } catch (e) {
                console.error('Logout error:', e);
              }
            }}
          />
        )}

        {/* Modal de Configurações do Aluno ao clicar na logo IronCoach */}
        {isStudentSettingsModalOpen && (isStudentAccountLocked || appRole === 'student') && (
          <StudentSettingsModal
            isOpen={isStudentSettingsModalOpen}
            student={effectiveStudent}
            trainerProfile={trainerProfile}
            currentUser={currentUser}
            isStudentAccountLocked={isStudentAccountLocked}
            onClose={() => setIsStudentSettingsModalOpen(false)}
            onSaveStudent={handleUpdateClient}
            onLogout={async () => {
              try {
                setIsStudentSettingsModalOpen(false);
                storage.saveStudentSession(null);
                setStudentSession(null);
                await logoutUser();
                setCurrentUser(null);
              } catch (e) {
                console.error('Logout error:', e);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
