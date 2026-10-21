'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActiveWorkoutSession,
  WorkoutProgram,
  WorkoutSplit,
  ExecutionExerciseState,
} from '@/types';
import { storage } from '@/lib/storage';

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
  const [isHydrated, setIsHydrated] = useState(false);
  const isHydratedRef = useRef(false);
  const lastProgramIdRef = useRef<string | null>(null);

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

  // Set session and immediately persist to localStorage
  const setSessionAndPersist = useCallback(
    (newSessionOrUpdater: ActiveWorkoutSession | null | ((prev: ActiveWorkoutSession | null) => ActiveWorkoutSession | null)) => {
      setSessionState((prev) => {
        const next =
          typeof newSessionOrUpdater === 'function'
            ? newSessionOrUpdater(prev)
            : newSessionOrUpdater;

        storage.saveActiveSession(next);
        return next;
      });
    },
    []
  );

  // Initial hydration from localStorage on mount (preserves checked sets & custom loads/reps on page refresh)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedSession = storage.getActiveSession();

        if (savedSession && savedSession.exercises && savedSession.exercises.length > 0) {
          // If the session has no real active progress yet, rebuild with updated last-performed loads or empty state
          if (
            !hasActiveProgressRef.current(savedSession) &&
            activeWorkoutRef.current &&
            savedSession.programId === activeWorkoutRef.current.id
          ) {
            const fresh = buildSessionRef.current(activeWorkoutRef.current);
            setSessionState(fresh);
            storage.saveActiveSession(fresh);
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
                storage.saveActiveSession(restoredSession);
              }
            }
            setSessionState(restoredSession);
            lastProgramIdRef.current = restoredSession.programId;
          }

          if (savedSession.clientId && onClientSyncRef.current) {
            onClientSyncRef.current(savedSession.clientId);
          }
        } else if (activeWorkoutRef.current) {
          // No saved session found; initialize fresh from active workout template
          const fresh = buildSessionRef.current(activeWorkoutRef.current);
          setSessionState(fresh);
          storage.saveActiveSession(fresh);
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

    // If we already have a session loaded:
    setSessionState((currentSession) => {
      // If current session is already for this workout, preserve current progress (don't overwrite!)
      if (currentSession && currentSession.programId === activeWorkout.id) {
        return currentSession;
      }

      // If current session has active progress for another workout, don't silently overwrite
      if (currentSession && hasActiveProgress(currentSession) && lastProgramIdRef.current === currentSession.programId) {
        // If the user deliberately changed the workout to another one:
        if (currentSession.programId !== activeWorkout.id) {
          const fresh = buildSession(activeWorkout);
          storage.saveActiveSession(fresh);
          lastProgramIdRef.current = activeWorkout.id;
          return fresh;
        }
        return currentSession;
      }

      // Initialize fresh for new workout
      const fresh = buildSession(activeWorkout);
      storage.saveActiveSession(fresh);
      lastProgramIdRef.current = activeWorkout.id;
      return fresh;
    });
  }, [activeWorkout, buildSession, hasActiveProgress]);

  // Force start a new session (e.g. user selects a split or starts fresh)
  const startNewSession = useCallback(
    (prog: WorkoutProgram, split?: WorkoutSplit) => {
      const fresh = buildSession(prog, split);
      lastProgramIdRef.current = prog.id;
      setSessionState(fresh);
      storage.saveActiveSession(fresh);
    },
    [buildSession]
  );

  // Clear active workout session (e.g. after finishing workout)
  const clearActiveSession = useCallback(() => {
    setSessionState(null);
    lastProgramIdRef.current = null;
    storage.saveActiveSession(null);
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
