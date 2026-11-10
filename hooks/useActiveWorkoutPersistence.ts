'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActiveWorkoutSession,
  WorkoutProgram,
  WorkoutSplit,
} from '@/types';
import { storage } from '@/lib/storage';
import { cloudSync } from '@/lib/firebase';

interface UseActiveWorkoutPersistenceProps {
  activeWorkout: WorkoutProgram | null;
  buildSession: (prog: WorkoutProgram, split?: WorkoutSplit) => ActiveWorkoutSession;
  onClientSync?: (clientId: string) => void;
}

export function useActiveWorkoutPersistence({
  activeWorkout,
  buildSession,
  onClientSync,
}: UseActiveWorkoutPersistenceProps) {
  const [session, setSessionState] = useState<ActiveWorkoutSession | null>(null);
  const sessionRef = useRef<ActiveWorkoutSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const isHydratedRef = useRef(false);
  const lastProgramIdRef = useRef<string | null>(null);
  const isClearedRef = useRef(false);

  const activeWorkoutRef = useRef(activeWorkout);
  const buildSessionRef = useRef(buildSession);
  const onClientSyncRef = useRef(onClientSync);

  useEffect(() => {
    activeWorkoutRef.current = activeWorkout;
    buildSessionRef.current = buildSession;
    onClientSyncRef.current = onClientSync;
  }, [activeWorkout, buildSession, onClientSync]);

  // Helper to determine if a session has any user progress (checked sets, notes, elapsed time, altered values)
  const hasActiveProgress = useCallback((sess: ActiveWorkoutSession | null): boolean => {
    if (!sess) return false;
    if (sess.isStarted || sess.elapsedSeconds > 0) return true;
    if (sess.trainerNotes && sess.trainerNotes.trim().length > 0) return true;

    for (const ex of sess.exercises) {
      for (const s of ex.sets) {
        if (s.completed) return true;
        if (s.subSets && s.subSets.some((sub) => sub.completed)) return true;
      }
    }
    return false;
  }, []);

  const hasActiveProgressRef = useRef(hasActiveProgress);
  useEffect(() => {
    hasActiveProgressRef.current = hasActiveProgress;
  }, [hasActiveProgress]);

  // Helper to strip volatile clock counter so 1-second timer ticks never trigger cloud writes
  const getStructuralSessionSignature = useCallback((sess: ActiveWorkoutSession | null): string => {
    if (!sess) return 'null';
    const { elapsedSeconds: _ignoredElapsed, ...rest } = sess;
    return JSON.stringify(rest);
  }, []);

  // Set session and immediately persist to localStorage (independent per-student Data Persist) + smart debounced Firebase sync
  const setSessionAndPersist = useCallback(
    (
      newSessionOrUpdater:
        | ActiveWorkoutSession
        | null
        | ((prev: ActiveWorkoutSession | null) => ActiveWorkoutSession | null)
    ) => {
      const prev = sessionRef.current;
      const next =
        typeof newSessionOrUpdater === 'function'
          ? newSessionOrUpdater(prev)
          : newSessionOrUpdater;

      sessionRef.current = next;
      isClearedRef.current = next === null;
      setSessionState(next);

      const prevSig = getStructuralSessionSignature(prev);
      const nextSig = getStructuralSessionSignature(next);
      const hasStructuralChange = prevSig !== nextSig;

      // Always save structural changes immediately to localStorage; for pure 1s clock ticks, save to localStorage every 10s.
      // Cloud sync to Firestore happens strictly upon finishing the workout (Local-First execution).
      if (hasStructuralChange || !next || (next.elapsedSeconds || 0) % 10 === 0) {
        storage.saveActiveSession(
          next,
          next?.clientId || activeWorkoutRef.current?.clientId,
          next?.programId || activeWorkoutRef.current?.id
        );
      }
    },
    [getStructuralSessionSignature]
  );

  // Initial hydration from localStorage on mount (preserves checked sets & custom loads/reps on page refresh or offline)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const targetClientId = activeWorkoutRef.current?.clientId;
        const targetProgramId = activeWorkoutRef.current?.id;
        const savedSession = storage.getActiveSession(targetClientId, targetProgramId);

        if (savedSession && savedSession.exercises && savedSession.exercises.length > 0) {
          isClearedRef.current = false;
          // If the session has no real active progress yet, rebuild with updated last-performed loads or empty state
          if (
            !hasActiveProgressRef.current(savedSession) &&
            activeWorkoutRef.current &&
            savedSession.programId === activeWorkoutRef.current.id
          ) {
            const fresh = buildSessionRef.current(activeWorkoutRef.current);
            sessionRef.current = fresh;
            setSessionState(fresh);
            storage.saveActiveSession(fresh, fresh.clientId, fresh.programId);
            lastProgramIdRef.current = activeWorkoutRef.current.id;
          } else {
            // Restore the active session and recalculate real elapsed time if already started
            let restoredSession = savedSession;
            if (savedSession.isStarted && savedSession.startTime) {
              const startMs = Date.parse(savedSession.startTime);
              if (!isNaN(startMs)) {
                const realElapsed = Math.max(
                  savedSession.elapsedSeconds || 0,
                  Math.floor((Date.now() - startMs) / 1000)
                );
                restoredSession = {
                  ...savedSession,
                  isPaused: false,
                  elapsedSeconds: realElapsed,
                };
                storage.saveActiveSession(
                  restoredSession,
                  restoredSession.clientId,
                  restoredSession.programId
                );
              }
            }
            sessionRef.current = restoredSession;
            setSessionState(restoredSession);
            lastProgramIdRef.current = restoredSession.programId;
          }

          if (savedSession.clientId && onClientSyncRef.current) {
            onClientSyncRef.current(savedSession.clientId);
          }
        } else if (activeWorkoutRef.current) {
          // No saved session found; initialize fresh from active workout template
          isClearedRef.current = false;
          const fresh = buildSessionRef.current(activeWorkoutRef.current);
          sessionRef.current = fresh;
          setSessionState(fresh);
          storage.saveActiveSession(fresh, fresh.clientId, fresh.programId);
          lastProgramIdRef.current = activeWorkoutRef.current.id;
        }
      } catch (err) {
        console.error('Error hydrating active workout session:', err);
      } finally {
        setIsHydrated(true);
        isHydratedRef.current = true;
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []); // Run only once on mount

  // Sync with activeWorkout prop when it changes AFTER initial hydration
  useEffect(() => {
    if (!isHydratedRef.current || !activeWorkout) return;
    if (isClearedRef.current && lastProgramIdRef.current === activeWorkout.id) {
      return;
    }

    const currentSession = sessionRef.current;

    // If current session is already for this workout, preserve current progress (don't overwrite!)
    if (currentSession && currentSession.programId === activeWorkout.id) {
      return;
    }

    // Check if there is an independently persisted session for this student + workout program
    const persistedForProgram = storage.getStudentSessionPersist(
      activeWorkout.clientId,
      activeWorkout.id
    );
    if (persistedForProgram && hasActiveProgress(persistedForProgram)) {
      isClearedRef.current = false;
      sessionRef.current = persistedForProgram;
      lastProgramIdRef.current = activeWorkout.id;
      setSessionState(persistedForProgram);
      storage.saveActiveSession(
        persistedForProgram,
        persistedForProgram.clientId,
        persistedForProgram.programId
      );
      return;
    }

    // Initialize fresh for new workout
    isClearedRef.current = false;
    const fresh = buildSession(activeWorkout);
    sessionRef.current = fresh;
    lastProgramIdRef.current = activeWorkout.id;
    setSessionState(fresh);
    storage.saveActiveSession(fresh, fresh.clientId, fresh.programId);
  }, [activeWorkout, buildSession, hasActiveProgress]);

  // Force start a new session (e.g. user selects a split or starts fresh)
  const startNewSession = useCallback(
    (prog: WorkoutProgram, split?: WorkoutSplit) => {
      isClearedRef.current = false;
      const fresh = buildSession(prog, split);
      lastProgramIdRef.current = prog.id;
      sessionRef.current = fresh;
      setSessionState(fresh);
      storage.saveActiveSession(fresh, fresh.clientId, fresh.programId);
    },
    [buildSession]
  );

  // Clear active workout session (e.g. after finishing workout)
  const clearActiveSession = useCallback(() => {
    const prev = sessionRef.current;
    isClearedRef.current = true;
    sessionRef.current = null;
    setSessionState(null);
    storage.saveActiveSession(null, prev?.clientId, prev?.programId);
    cloudSync.syncActiveSession(null);
  }, []);

  return {
    session,
    setSession: setSessionAndPersist,
    startNewSession,
    clearActiveSession,
    isHydrated,
    hasActiveProgress: hasActiveProgress(session),
  };
}
