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
} from '@/lib/storage';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { ClientSection } from '@/components/ClientSection';
import { AgendaSection } from '@/components/AgendaSection';
import { CreateWorkoutSection } from '@/components/CreateWorkoutSection';
import { WorkoutExecutionSection } from '@/components/WorkoutExecutionSection';
import { AuthScreen } from '@/components/AuthScreen';
import { testConnection, cloudSync, auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { LogIn, X } from 'lucide-react';

export default function Home() {
  const [currentSection, setCurrentSection] = useState<MainNavSection>('execucao');
  const [isTabletFramed, setIsTabletFramed] = useState(false);

  // Initialize with deterministic seed data matching SSR server HTML
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [workouts, setWorkouts] = useState<WorkoutProgram[]>(INITIAL_WORKOUTS);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(INITIAL_CALENDAR);

  // Cross-navigation context
  const [preSelectedClientId, setPreSelectedClientId] = useState<string | undefined>(undefined);
  const [activeWorkoutForExecution, setActiveWorkoutForExecution] =
    useState<WorkoutProgram | null>(INITIAL_WORKOUTS[0]);

  // Auth Screen & User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');
  const [dismissedAuthBanner, setDismissedAuthBanner] = useState(false);

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
        if (savedSession) {
          const matchingWorkout = loadedWorkouts.find((w) => w.id === savedSession.programId);
          if (matchingWorkout) {
            setActiveWorkoutForExecution(matchingWorkout);
            return;
          }
        }
        setActiveWorkoutForExecution(loadedWorkouts[0]);
      }
    }, 0);

    // 3. Listen to Firebase Auth & Subscribe to real-time Cloud Sync
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        cloudSync.subscribe(user.uid, {
          onClientsChange: (cloudClients) => {
            setClients(cloudClients);
          },
          onWorkoutsChange: (cloudWorkouts) => {
            setWorkouts(cloudWorkouts);
          },
          onCalendarChange: (cloudEvents) => {
            setCalendarEvents(cloudEvents);
          },
          onActiveSessionChange: (cloudSession) => {
            if (cloudSession) {
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

    return () => {
      clearTimeout(timer);
      unsubAuth();
      cloudSync.unsubscribe();
    };
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
    setActiveWorkoutForExecution(newWorkout);
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
    const updated = [newEvent, ...calendarEvents];
    setCalendarEvents(updated);
    storage.saveCalendarEvents(updated);
    cloudSync.syncCalendarEvent(newEvent);
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
            : 'max-w-4xl mx-auto'
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
        />

        {/* Main Section Content */}
        <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
          {/* Banner Informativo de Autenticação PWA (Modo Conectado / Offline) */}
          {!currentUser && !dismissedAuthBanner && (
            <div className="mb-4 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <LogIn className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    Conta de Treinador (PWA)
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    Faça login ou cadastre-se para sincronizar seus alunos e treinos na nuvem.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAuthInitialTab('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition active:scale-95 shadow-md shadow-emerald-950/40"
                >
                  Entrar / Cadastrar
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedAuthBanner(true)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Continuar apenas offline"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {currentSection === 'cliente' && (
            <ClientSection
              clients={clients}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              onStartWorkoutForClient={handleStartWorkoutForClient}
              onCreateWorkoutForClient={handleCreateWorkoutForClient}
            />
          )}

          {currentSection === 'agenda' && (
            <AgendaSection
              events={calendarEvents}
              clients={clients}
              onAddEvent={handleAddCalendarEvent}
              onUpdateEvent={handleUpdateCalendarEvent}
              onDeleteEvent={handleDeleteCalendarEvent}
              onStartWorkoutForClient={handleStartWorkoutForClient}
            />
          )}

          {currentSection === 'criar-treino' && (
            <CreateWorkoutSection
              clients={clients}
              workouts={workouts}
              preSelectedClientId={preSelectedClientId}
              onSaveWorkout={handleSaveWorkout}
              onDeleteWorkout={handleDeleteWorkout}
              onStartExecution={handleStartExecutionFromBuilder}
            />
          )}

          {currentSection === 'execucao' && (
            <WorkoutExecutionSection
              clients={clients}
              workouts={workouts}
              activeWorkout={activeWorkoutForExecution}
              onSelectWorkout={(w) => setActiveWorkoutForExecution(w)}
              onNavigateToCreateWorkout={(clientId) => {
                setPreSelectedClientId(clientId);
                setCurrentSection('criar-treino');
              }}
              onFinishWorkout={() => {
                // Return to client list or stay
              }}
            />
          )}
        </main>

        {/* Fixed Touch-Friendly Bottom Navigation Bar */}
        <BottomNav
          currentSection={currentSection}
          onSelectSection={(sec) => setCurrentSection(sec)}
          hasActiveSession={true}
        />

        {/* Modal de Autenticação PWA (Login, Cadastro e Recuperação de Senha) */}
        <AuthScreen
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialTab={authInitialTab}
        />
      </div>
    </div>
  );
}
