'use client';

import React, { useState, useEffect } from 'react';
import {
  MainNavSection,
  Client,
  WorkoutProgram,
  CalendarEvent,
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
import { AuthScreen } from '@/components/AuthScreen';
import { testConnection, cloudSync, auth, logoutUser } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { LogIn, X, RefreshCw } from 'lucide-react';
import { useInactivitySync } from '@/hooks/useInactivitySync';
import { motion, AnimatePresence } from 'motion/react';

export default function Home() {
  const [currentSection, setCurrentSection] = useState<MainNavSection>('agenda');
  const [isTabletFramed, setIsTabletFramed] = useState(false);

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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');
  const [dismissedAuthBanner, setDismissedAuthBanner] = useState(false);

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

      setClients(loadedClients);
      setWorkouts(loadedWorkouts);
      setCalendarEvents(loadedCalendar);

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
        // Guarantee trainer always lands on Agenda after login or registration
        setCurrentSection('agenda');
        cloudSync.subscribe(user.uid, {
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
              setWorkouts((currentWorkouts) => {
                const matchingWorkout = currentWorkouts.find((w) => w.id === cloudSession.programId);
                if (matchingWorkout) {
                  setActiveWorkoutForExecution(matchingWorkout);
                }
                return currentWorkouts;
              });
            }
          },
        });
      } else {
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
    const interval = setInterval(updateActiveRunningSession, 1500);
    return () => clearInterval(interval);
  }, []);

  // CLIENT HANDLERS
  const handleAddClient = (newClient: Client) => {
    const updated = [newClient, ...clients];
    setClients(updated);
    storage.saveClients(updated);
    cloudSync.syncClient(newClient);
  };

  const handleUpdateClient = (updatedClient: Client) => {
    const updated = clients.map((c) =>
      c.id === updatedClient.id ? updatedClient : c
    );
    setClients(updated);
    storage.saveClients(updated);
    cloudSync.syncClient(updatedClient);
  };

  const handleDeleteClient = (clientId: string) => {
    const updatedClients = clients.filter((c) => c.id !== clientId);
    setClients(updatedClients);
    storage.saveClients(updatedClients);
    cloudSync.removeClient(clientId);

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
    setCalendarEvents((prev) => {
      const existingIndex = prev.findIndex(
        (e) =>
          e.id === newEvent.id ||
          (e.clientId === newEvent.clientId &&
            e.date === newEvent.date &&
            (!e.recurringDays || e.recurringDays.length === 0))
      );
      let updated: CalendarEvent[];
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...newEvent,
          id: updated[existingIndex].id,
        };
        cloudSync.syncCalendarEvent(updated[existingIndex]);
      } else {
        updated = [newEvent, ...prev];
        cloudSync.syncCalendarEvent(newEvent);
      }
      storage.saveCalendarEvents(updated);
      return updated;
    });
  };

  const handleAddCalendarEvents = (newEvents: CalendarEvent[]) => {
    if (!newEvents || newEvents.length === 0) return;
    setCalendarEvents((prev) => {
      const updated = [...prev];
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

      storage.saveCalendarEvents(updated);
      toSync.forEach((evt) => cloudSync.syncCalendarEvent(evt));
      return updated;
    });
  };

  const handleUpdateCalendarEvent = (updatedEvent: CalendarEvent) => {
    setCalendarEvents((prev) => {
      const updated = prev.map((e) =>
        e.id === updatedEvent.id ? updatedEvent : e
      );
      storage.saveCalendarEvents(updated);
      return updated;
    });
    cloudSync.syncCalendarEvent(updatedEvent);
  };

  const handleDeleteCalendarEvent = (eventId: string) => {
    setCalendarEvents((prev) => {
      const updated = prev.filter((e) => e.id !== eventId);
      storage.saveCalendarEvents(updated);
      return updated;
    });
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
    setCurrentSection('execucao');
  };

  const handleCreateWorkoutForClient = (client: Client) => {
    setPreSelectedClientId(client.id);
    setCurrentSection('criar-treino');
  };

  const handleStartExecutionFromBuilder = (workout: WorkoutProgram) => {
    setActiveWorkoutForExecution(workout);
    setCurrentSection('execucao');
  };

  // Active student name in execution
  const activeClient = clients.find(
    (c) => c.id === activeWorkoutForExecution?.clientId
  );

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6">
        <AuthScreen
          mode="fullscreen"
          isOpen={true}
          onSuccess={(user) => {
            setCurrentUser(user);
            setCurrentSection('agenda');
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center transition-all ${
        isTabletFramed ? 'py-4 sm:py-8 px-2 sm:px-4 bg-slate-900/60' : ''
      }`}
    >
      {/* Tablet Portrait Frame Wrapper (Aspect Ratio ~3:4 / Touch Screen) */}
      <div
        className={`w-full flex-1 flex flex-col transition-all relative ${
          isTabletFramed
            ? 'max-w-[768px] min-h-[960px] bg-slate-950 rounded-[32px] border-[8px] border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden ring-1 ring-slate-700/50'
            : 'w-full max-w-none'
        }`}
      >
        {/* Tablet Camera / Speaker Notch Simulation (when framed) */}
        {isTabletFramed && (
          <div className="w-full flex justify-center py-2 bg-slate-950 select-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700" />
              <span className="w-10 h-1.5 rounded-full bg-slate-800" />
            </div>
          </div>
        )}

        {/* Global Header */}
        <Header
          isTabletFramed={isTabletFramed}
          onToggleTabletFrame={() => setIsTabletFramed(!isTabletFramed)}
          activeClientName={
            currentSection === 'execucao' ? activeClient?.name : undefined
          }
          currentUser={currentUser}
          onLogout={async () => {
            try {
              await logoutUser();
              setCurrentUser(null);
            } catch (e) {
              console.error('Logout error:', e);
            }
          }}
        />

        {/* Main Section Content */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto w-full min-w-0">
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
                  key={`${activeWorkoutForExecution?.id || 'no-workout'}-${executionNavTrigger}`}
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
                    setActiveWorkoutForExecution(null);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Toast Notificação de Sincronização após Inatividade com o Firestore */}
        {syncNotice && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/95 border border-emerald-500/50 shadow-2xl backdrop-blur-md text-emerald-300 text-xs font-bold animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-none">
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 shrink-0 ${isResumingSync ? 'animate-spin' : ''}`} />
            <span>{syncNotice}</span>
          </div>
        )}

        {/* Fixed Touch-Friendly Bottom Navigation Bar */}
        <BottomNav
          currentSection={currentSection}
          onSelectSection={(sec) => {
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
      </div>
    </div>
  );
}
