import {
  Client,
  WorkoutProgram,
  WorkoutSplit,
  CalendarEvent,
  ExerciseHistoricalEntry,
  ActiveWorkoutSession,
  DatabaseExercise,
  MuscleGroup,
  CompletedWorkoutRecord,
  ExecutionSet,
  ExerciseFinishedSnapshot,
  ExerciseCommentRecord,
  WorkoutFeedbackReport,
  ExerciseImprovementItem,
  TrainerProfile,
  CustomWorkoutMethod,
  ClientDietPlan,
  NutritionProfessionalLibrary,
  AppUserRole,
  StudentSessionContext,
  PendingSyncOperation,
  PendingSyncOperationType,
  StudentIndependentProgressPersist,
} from '@/types';
import { INITIAL_EXERCISE_DATABASE } from './exerciseDatabase';
import { getInitialProfessionalLibrary } from './nutritionEngine';

const STORAGE_KEYS = {
  CLIENTS: 'ironcoach_clients_v1',
  WORKOUTS: 'ironcoach_workouts_v2',
  CALENDAR: 'ironcoach_calendar_v1',
  HISTORY: 'ironcoach_history_v1',
  ACTIVE_SESSION: 'ironcoach_active_session_v2',
  COMPLETED_WORKOUTS: 'ironcoach_completed_workouts_v1',
  EXERCISE_DATABASE: 'ironcoach_exercise_db_v3_json',
  LEGACY_EXERCISE_DATABASE: 'ironcoach_exercise_db_v2',
  EXERCISE_FINISHED_SNAPSHOTS: 'ironcoach_exercise_finished_snapshots_v1',
  EXERCISE_COMMENTS: 'ironcoach_exercise_comments_v1',
  TRAINER_PROFILE: 'ironcoach_trainer_profile_v1',
  CUSTOM_METHODS: 'ironcoach_custom_methods_v1',
  DIET_PLANS: 'ironcoach_diet_plans_v1',
  NUTRITION_LIBRARY: 'ironcoach_nutrition_library_v1',
  APP_ROLE: 'ironcoach_app_role_v1',
  ACTIVE_STUDENT_ID: 'ironcoach_active_student_id_v1',
  STUDENT_SESSION: 'ironcoach_student_session_v1',
  PENDING_SYNC_QUEUE: 'ironcoach_pending_sync_queue_v1',
  STUDENT_SESSIONS_PERSIST: 'ironcoach_student_sessions_persist_v1',
  STUDENT_PROGRESS_PERSIST: 'ironcoach_student_progress_persist_v1',
};

export function isStudentAccessComplete(client?: Client | null): boolean {
  if (!client) return false;
  const hasName = Boolean(client.name && client.name.trim().length >= 3);
  const hasBirth = Boolean(client.birthDate && client.birthDate.trim().length >= 8);
  const hasEmail = Boolean(client.email && client.email.includes('@'));
  const hasPhone = Boolean(client.phone && client.phone.replace(/\D/g, '').length >= 8);
  const hasPass = Boolean(client.accessPassword && client.accessPassword.trim().length >= 6);
  return hasName && hasBirth && hasEmail && hasPhone && hasPass;
}

// Clean initial state (no dummy clients, workouts, calendar events, or histories)
export const INITIAL_CLIENTS: Client[] = [];

export const CLEAN_SLATE_KEY = 'ironcoach_clean_slate_v3_applied';

export function purgeAllSampleData() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CALENDAR, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.COMPLETED_WORKOUTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify({}));
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    localStorage.removeItem(STORAGE_KEYS.EXERCISE_FINISHED_SNAPSHOTS);
    localStorage.setItem(CLEAN_SLATE_KEY, 'true');
  } catch (e) {
    console.error('Error purging sample data:', e);
  }
}

export function ensureCleanSlate() {
  if (typeof window === 'undefined') return;
  try {
    const isApplied = localStorage.getItem(CLEAN_SLATE_KEY);
    if (!isApplied) {
      purgeAllSampleData();
    }
  } catch (e) {
    console.error('Error ensuring clean slate:', e);
  }
}


export const INITIAL_WORKOUTS: WorkoutProgram[] = [];

// Initial Seed History (empty)
const INITIAL_HISTORY: Record<string, ExerciseHistoricalEntry[]> = {};

// Initial Seed Calendar Events (empty)
export const INITIAL_CALENDAR: CalendarEvent[] = [];

// Initial Completed Workouts (empty)
export const INITIAL_COMPLETED_WORKOUTS: CompletedWorkoutRecord[] = [];


export function expandLegacyRecurringEvents(rawEvents: CalendarEvent[]): {
  events: CalendarEvent[];
  changedEvents: CalendarEvent[];
} {
  const hasLegacy = rawEvents.some(
    (e) => Array.isArray(e.recurringDays) && e.recurringDays.length > 0
  );
  if (!hasLegacy) {
    return { events: rawEvents, changedEvents: [] };
  }

  const independentEvents = rawEvents.filter(
    (e) => !Array.isArray(e.recurringDays) || e.recurringDays.length === 0
  );
  const legacyEvents = rawEvents.filter(
    (e) => Array.isArray(e.recurringDays) && e.recurringDays.length > 0
  );

  const resultEvents: CalendarEvent[] = [...independentEvents];
  const changedEvents: CalendarEvent[] = [];
  const existingKeys = new Set(
    independentEvents.map((e) => `${e.clientId}::${e.date}`)
  );

  for (const leg of legacyEvents) {
    const startDateStr = leg.date;
    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    let endDateStr = leg.recurringEndDate;
    if (!endDateStr || endDateStr < startDateStr) {
      const fallbackEnd = new Date(sy, sm - 1, sd);
      fallbackEnd.setDate(fallbackEnd.getDate() + 56); // 8 semanas padrão para eventos legados sem data limite
      const fy = fallbackEnd.getFullYear();
      const fm = String(fallbackEnd.getMonth() + 1).padStart(2, '0');
      const fd = String(fallbackEnd.getDate()).padStart(2, '0');
      endDateStr = `${fy}-${fm}-${fd}`;
    }

    const [ey, em, ed] = endDateStr.split('-').map(Number);
    const cur = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const exceptions = new Set(leg.recurringExceptions || []);
    const recDays = leg.recurringDays || [];

    const matchingDates: string[] = [];
    let safety = 0;
    while (cur <= end && safety < 370) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const dStr = `${y}-${m}-${d}`;
      if (recDays.includes(cur.getDay()) && !exceptions.has(dStr)) {
        matchingDates.push(dStr);
      }
      cur.setDate(cur.getDate() + 1);
      safety++;
    }

    if (matchingDates.length === 0 && !exceptions.has(startDateStr)) {
      matchingDates.push(startDateStr);
    }

    let parentIdReused = false;

    matchingDates.forEach((dStr) => {
      const key = `${leg.clientId}::${dStr}`;
      if (!parentIdReused) {
        parentIdReused = true;
        const firstEvt: CalendarEvent = {
          ...leg,
          id: leg.id,
          date: dStr,
          recurringDays: [],
          recurringExceptions: [],
          recurringEndDate: endDateStr,
          recurringParentId: leg.recurringParentId || leg.id,
          status: dStr === startDateStr ? leg.status || 'confirmado' : 'confirmado',
        };
        if (firstEvt.status !== 'reagendado') {
          delete firstEvt.rescheduledDate;
          delete firstEvt.rescheduledTime;
        }
        resultEvents.push(firstEvt);
        changedEvents.push(firstEvt);
        existingKeys.add(key);
        return;
      }

      if (existingKeys.has(key)) return;

      const childEvt: CalendarEvent = {
        ...leg,
        id: `${leg.id}-${dStr}`,
        date: dStr,
        recurringDays: [],
        recurringExceptions: [],
        recurringEndDate: endDateStr,
        recurringParentId: leg.recurringParentId || leg.id,
        status: 'confirmado',
      };
      delete childEvt.rescheduledDate;
      delete childEvt.rescheduledTime;

      resultEvents.push(childEvt);
      changedEvents.push(childEvt);
      existingKeys.add(key);
    });

    // Caso todas as datas estivessem em exceção, ainda limpa recurringDays do registro pai
    if (!parentIdReused) {
      const cleanedParent: CalendarEvent = {
        ...leg,
        recurringDays: [],
        recurringExceptions: [],
        recurringEndDate: endDateStr,
        recurringParentId: leg.recurringParentId || leg.id,
      };
      resultEvents.push(cleanedParent);
      changedEvents.push(cleanedParent);
    }
  }

  return { events: resultEvents, changedEvents };
}

export const storage = {
  purgeAllSampleData() {
    purgeAllSampleData();
  },

  getAppRole(): AppUserRole {
    if (typeof window === 'undefined') return 'trainer';
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.APP_ROLE);
      if (saved === 'student' || saved === 'trainer') {
        return saved;
      }
      return 'trainer';
    } catch {
      return 'trainer';
    }
  },

  saveAppRole(role: AppUserRole) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.APP_ROLE, role);
    } catch (e) {
      console.error('Error saving app role:', e);
    }
  },

  getActiveStudentId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_STUDENT_ID);
    } catch {
      return null;
    }
  },

  saveActiveStudentId(studentId: string | null) {
    if (typeof window === 'undefined') return;
    try {
      if (studentId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_STUDENT_ID, studentId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_STUDENT_ID);
      }
    } catch (e) {
      console.error('Error saving active student id:', e);
    }
  },

  getStudentSession(): StudentSessionContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_SESSION);
      if (!raw) return null;
      return JSON.parse(raw) as StudentSessionContext;
    } catch {
      return null;
    }
  },

  saveStudentSession(session: StudentSessionContext | null) {
    if (typeof window === 'undefined') return;
    try {
      if (session) {
        localStorage.setItem(STORAGE_KEYS.STUDENT_SESSION, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEYS.STUDENT_SESSION);
      }
    } catch (e) {
      console.error('Error saving student session:', e);
    }
  },

  getTrainerProfile(userId?: string): TrainerProfile | null {
    if (typeof window === 'undefined') return null;
    try {
      if (userId) {
        const scopedData = localStorage.getItem(`${STORAGE_KEYS.TRAINER_PROFILE}_${userId}`);
        if (scopedData) {
          return JSON.parse(scopedData);
        }
      }
      const data = localStorage.getItem(STORAGE_KEYS.TRAINER_PROFILE);
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  saveTrainerProfile(profile: TrainerProfile, userId?: string) {
    if (typeof window === 'undefined') return;
    try {
      const serialized = JSON.stringify(profile);
      localStorage.setItem(STORAGE_KEYS.TRAINER_PROFILE, serialized);
      if (userId) {
        localStorage.setItem(`${STORAGE_KEYS.TRAINER_PROFILE}_${userId}`, serialized);
      }
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('ironcoach:trainer-profile-updated', {
              detail: { profile, userId },
            })
          );
        }
      }, 0);
    } catch (e) {
      console.error('Error saving trainer profile:', e);
    }
  },

  getClients(): Client[] {
    if (typeof window === 'undefined') return INITIAL_CLIENTS;
    ensureCleanSlate();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_CLIENTS));
        return INITIAL_CLIENTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_CLIENTS;
    }
  },

  saveClients(clients: Client[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    } catch (e) {
      console.error('Storage error:', e);
    }
  },

  getWorkouts(): WorkoutProgram[] {
    if (typeof window === 'undefined') return INITIAL_WORKOUTS;
    ensureCleanSlate();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(INITIAL_WORKOUTS));
        return INITIAL_WORKOUTS;
      }
      const parsed: WorkoutProgram[] = JSON.parse(data);
      return parsed.map((p) => {
        // Ensure splits exist
        if (!p.splits || p.splits.length === 0) {
          p.splits = [
            {
              id: `${p.id}-split-1`,
              name: p.name || 'Treino A',
              weekDays: p.weekDays || [1, 4],
              exercises: p.exercises || [],
            },
          ];
        }
        return p;
      });
    } catch {
      return INITIAL_WORKOUTS;
    }
  },

  saveWorkouts(workouts: WorkoutProgram[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
    } catch (e) {
      console.error('Storage error:', e);
    }
  },

  deleteWorkout(id: string): WorkoutProgram[] {
    const list = this.getWorkouts().filter((w) => w.id !== id);
    this.saveWorkouts(list);
    return list;
  },

  getCalendarEvents(): CalendarEvent[] {
    if (typeof window === 'undefined') return INITIAL_CALENDAR;
    ensureCleanSlate();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CALENDAR);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.CALENDAR, JSON.stringify(INITIAL_CALENDAR));
        return INITIAL_CALENDAR;
      }
      const parsed: CalendarEvent[] = JSON.parse(data);
      const { events: normalized, changedEvents } = expandLegacyRecurringEvents(parsed);
      if (changedEvents.length > 0) {
        localStorage.setItem(STORAGE_KEYS.CALENDAR, JSON.stringify(normalized));
      }
      return normalized;
    } catch {
      return INITIAL_CALENDAR;
    }
  },

  saveCalendarEvents(events: CalendarEvent[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.CALENDAR, JSON.stringify(events));
    } catch (e) {
      console.error('Storage error:', e);
    }
  },

  getExerciseHistory(exerciseName: string, clientId?: string): ExerciseHistoricalEntry[] {
    const scopedKey = clientId ? `${clientId}::${exerciseName}` : exerciseName;
    if (typeof window === 'undefined') {
      if (!clientId || clientId === 'client-1') {
        return INITIAL_HISTORY[exerciseName] || [];
      }
      return [];
    }
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (!data) {
        const seeded: Record<string, ExerciseHistoricalEntry[]> = {};
        Object.entries(INITIAL_HISTORY).forEach(([ex, entries]) => {
          seeded[`client-1::${ex}`] = entries;
        });
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(seeded));
        if (!clientId || clientId === 'client-1') {
          return INITIAL_HISTORY[exerciseName] || [];
        }
        return [];
      }
      const parsed = JSON.parse(data);
      if (parsed[scopedKey]) {
        return parsed[scopedKey];
      }
      // If client-1 and no specific entry yet, return seed
      if (clientId === 'client-1' && INITIAL_HISTORY[exerciseName]) {
        return INITIAL_HISTORY[exerciseName];
      }
      return [];
    } catch {
      if (!clientId || clientId === 'client-1') {
        return INITIAL_HISTORY[exerciseName] || [];
      }
      return [];
    }
  },

  recordExerciseHistory(
    exerciseName: string,
    weightKg: number,
    reps: number,
    setsCompleted: number,
    clientId?: string
  ) {
    if (typeof window === 'undefined') return;
    try {
      const scopedKey = clientId ? `${clientId}::${exerciseName}` : exerciseName;
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      const historyMap: Record<string, ExerciseHistoricalEntry[]> = data
        ? JSON.parse(data)
        : {};

      const existing =
        historyMap[scopedKey] ||
        (clientId === 'client-1' ? INITIAL_HISTORY[exerciseName] || [] : []);

      const today = new Date();
      const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(
        today.getMonth() + 1
      ).padStart(2, '0')}`;

      const newEntry: ExerciseHistoricalEntry = {
        date: dateStr,
        weightKg,
        reps,
        setsCompleted,
      };

      const updated = [...existing, newEntry];
      // Keep only last 8 entries for clean performance
      if (updated.length > 8) {
        updated.splice(0, updated.length - 8);
      }

      historyMap[scopedKey] = updated;
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(historyMap));
    } catch (e) {
      console.error('Error recording exercise history:', e);
    }
  },

  /**
   * Retorna a carga utilizada no último treino realizado para o exercício específico de acordo com o aluno.
   * Busca primeiro nos treinos concluídos (CompletedWorkoutRecord) e depois no histórico de exercícios.
   * Caso não tenha histórico, retorna null para que seja exibido sem numeração.
   */
  getLastPerformedWeight(
    exerciseName: string,
    clientId?: string,
    setIndex?: number
  ): number | null {
    if (!exerciseName) return null;
    const cleanName = exerciseName.trim().toLowerCase();

    // 1. Prioridade: Buscar no histórico de treinos concluídos realizados pelo aluno
    const completedList = this.getCompletedWorkouts(clientId);
    if (completedList && completedList.length > 0) {
      // Ordenar do treino mais recente para o mais antigo (completedAt desc)
      const sorted = [...completedList].sort((a, b) => {
        const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return timeB - timeA;
      });

      for (const record of sorted) {
        const matchingEx = record.exercises?.find(
          (e) => e.name?.trim().toLowerCase() === cleanName
        );
        if (matchingEx && matchingEx.sets && matchingEx.sets.length > 0) {
          // Se houver um índice de série específico solicitado
          if (
            setIndex !== undefined &&
            matchingEx.sets[setIndex] &&
            typeof matchingEx.sets[setIndex].weightKg === 'number' &&
            matchingEx.sets[setIndex].weightKg > 0
          ) {
            return matchingEx.sets[setIndex].weightKg;
          }

          // Se a série específica não tiver ou não foi solicitada, buscar série válida
          const setsWithWeight = matchingEx.sets.filter(
            (s) => typeof s.weightKg === 'number' && s.weightKg > 0
          );
          if (setsWithWeight.length > 0) {
            if (setIndex !== undefined && setIndex < setsWithWeight.length) {
              return setsWithWeight[setIndex].weightKg ?? null;
            }
            return setsWithWeight[setsWithWeight.length - 1].weightKg ?? null;
          }
        }
      }
    }

    // 2. Buscar no histórico individual do exercício (ExerciseHistoricalEntry)
    const history = this.getExerciseHistory(exerciseName, clientId);
    if (history && history.length > 0) {
      const lastEntry = history[history.length - 1];
      if (typeof lastEntry.weightKg === 'number' && lastEntry.weightKg > 0) {
        return lastEntry.weightKg;
      }
    }

    // Caso não tenha histórico: retorna null (sem numeração)
    return null;
  },

  /**
   * Grava o exercício e suas séries no histórico imediatamente quando o usuário clica em "Concluir e Recolher".
   * Retorna o snapshot gravado para sincronização com Firestore.
   */
  recordExerciseFinishedOnCollapse(
    clientId: string | undefined,
    exerciseName: string,
    sets: ExecutionSet[]
  ): ExerciseFinishedSnapshot | null {
    if (typeof window === 'undefined' || !exerciseName) return null;
    try {
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(
        now.getMonth() + 1
      ).padStart(2, '0')}`;

      const newSnapshot: ExerciseFinishedSnapshot = {
        id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        clientId: clientId || 'general',
        exerciseName: exerciseName.trim(),
        date: dateStr,
        timestamp: now.toISOString(),
        sets: sets.map((s) => {
          const w = typeof s.weightKg === 'number' ? s.weightKg : null;
          const r = Number(s.completedReps) || Number(s.targetReps) || 10;
          return {
            setNumber: s.setNumber,
            weightKg: w,
            completedReps: r,
            volumeKg: (w || 0) * r,
            completed: s.completed,
            pse: typeof s.pse === 'number' ? s.pse : null,
          };
        }),
      };

      const existingData = localStorage.getItem(STORAGE_KEYS.EXERCISE_FINISHED_SNAPSHOTS);
      const list = existingData ? JSON.parse(existingData) : [];
      list.push(newSnapshot);
      if (list.length > 120) {
        list.splice(0, list.length - 120);
      }
      localStorage.setItem(STORAGE_KEYS.EXERCISE_FINISHED_SNAPSHOTS, JSON.stringify(list));
      if (clientId) {
        this.persistStudentIndependentSnapshot(clientId, newSnapshot);
      }
      return newSnapshot;
    } catch (e) {
      console.error('Error recording finished exercise snapshot:', e);
      return null;
    }
  },

  /**
   * Mescla snapshots recebidos do Firestore com o cache local e atualiza o Data Persist independente de cada aluno.
   */
  mergeExerciseSnapshots(incoming: ExerciseFinishedSnapshot[]) {
    if (typeof window === 'undefined' || !Array.isArray(incoming)) return;
    try {
      const existingData = localStorage.getItem(STORAGE_KEYS.EXERCISE_FINISHED_SNAPSHOTS);
      const existing: ExerciseFinishedSnapshot[] = existingData ? JSON.parse(existingData) : [];
      const existingIds = new Set(existing.map((s) => s.id));
      const merged = [...existing];
      const affectedClients = new Set<string>();
      incoming.forEach((item) => {
        if (!existingIds.has(item.id)) {
          merged.push(item);
          existingIds.add(item.id);
        }
        if (item.clientId) {
          affectedClients.add(item.clientId);
        }
      });
      merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      if (merged.length > 200) {
        merged.splice(0, merged.length - 200);
      }
      localStorage.setItem(STORAGE_KEYS.EXERCISE_FINISHED_SNAPSHOTS, JSON.stringify(merged));
      affectedClients.forEach((cid) => {
        const clientSnaps = merged.filter((s) => s.clientId === cid);
        clientSnaps.forEach((snap) => this.persistStudentIndependentSnapshot(cid, snap));
      });
    } catch (e) {
      console.error('Error merging exercise snapshots:', e);
    }
  },

  /**
   * Retorna o histórico de uma série específica (ex: Série 1) baseado tanto nos
   * registros de exercícios recolhidos ("Concluir e Recolher") quanto nos treinos
   * finalizados sincronizados do Firestore, incluindo o PSE de 0 a 10.
   */
  getSeriesHistory(
    exerciseName: string,
    setNumber: number,
    clientId?: string
  ): Array<{
    date: string;
    timestamp: string;
    weightKg: number;
    reps: number;
    volumeKg: number;
    setNumber: number;
    pse?: number | null;
  }> {
    if (typeof window === 'undefined' || !exerciseName) return [];
    try {
      const cleanName = exerciseName.trim().toLowerCase();
      const points: Array<{
        date: string;
        timestamp: string;
        weightKg: number;
        reps: number;
        volumeKg: number;
        setNumber: number;
        pse?: number | null;
      }> = [];

      const registeredTimestamps = new Set<string>();

      // 1. Buscar snapshots gravados via "Concluir e Recolher" (global + Data Persist independente do aluno)
      const snapData = localStorage.getItem(STORAGE_KEYS.EXERCISE_FINISHED_SNAPSHOTS);
      const rawGlobalSnaps: ExerciseFinishedSnapshot[] = snapData ? JSON.parse(snapData) : [];
      const progressMap = this.getStudentProgressPersistMap();
      const studentSnaps =
        clientId && progressMap[clientId]?.exerciseSnapshots
          ? progressMap[clientId].exerciseSnapshots
          : [];
      const snapById = new Map<string, ExerciseFinishedSnapshot>();
      if (Array.isArray(rawGlobalSnaps)) {
        rawGlobalSnaps.forEach((s) => {
          if (s && s.id) snapById.set(s.id, s);
        });
      }
      if (Array.isArray(studentSnaps)) {
        studentSnaps.forEach((s) => {
          if (s && s.id && !snapById.has(s.id)) snapById.set(s.id, s);
        });
      }
      const snapshots = Array.from(snapById.values());
      if (snapshots.length > 0) {
        snapshots
          .filter(
            (snap: any) =>
              (!clientId || !snap.clientId || snap.clientId === 'general' || snap.clientId === clientId) &&
              snap.exerciseName?.trim().toLowerCase() === cleanName
          )
          .forEach((snap: any) => {
              if (Array.isArray(snap.sets)) {
                const s = snap.sets.find((item: any) => item.setNumber === setNumber);
                if (s && ((typeof s.weightKg === 'number' && s.weightKg > 0) || (typeof s.pse === 'number') || s.completed)) {
                  const reps = Number(s.completedReps) || 10;
                  const w = typeof s.weightKg === 'number' ? s.weightKg : 0;
                  const vol = s.volumeKg != null ? Number(s.volumeKg) : w * reps;
                  const pseVal = typeof s.pse === 'number' ? s.pse : null;
                  const ts = snap.timestamp || new Date().toISOString();
                  registeredTimestamps.add(ts.substring(0, 16)); // chave por minuto para deduplicar
                  points.push({
                    date: snap.date || 'Hoje',
                    timestamp: ts,
                    weightKg: w,
                    reps,
                    volumeKg: vol,
                    setNumber,
                    pse: pseVal,
                  });
                }
              }
            });
      }

      // 2. Buscar nos treinos finalizados sincronizados no Firestore ("completedWorkouts")
      const completedList = this.getCompletedWorkouts(clientId);
      if (Array.isArray(completedList)) {
        completedList.forEach((cw) => {
          const ts = cw.completedAt || new Date().toISOString();
          const minuteKey = ts.substring(0, 16);
          // Se já registrou pelo snapshot no mesmo minuto, pula para evitar duplicata
          if (registeredTimestamps.has(minuteKey)) return;

          if (Array.isArray(cw.exercises)) {
            cw.exercises.forEach((ex) => {
              if (ex.name?.trim().toLowerCase() === cleanName && Array.isArray(ex.sets)) {
                const s = ex.sets.find((item: any) => item.setNumber === setNumber);
                if (s && ((typeof s.weightKg === 'number' && s.weightKg > 0) || (typeof s.pse === 'number') || s.completed)) {
                  const reps = Number(s.completedReps) || 10;
                  const w = typeof s.weightKg === 'number' ? s.weightKg : 0;
                  const vol = w * reps;
                  const pseVal = typeof s.pse === 'number' ? s.pse : null;
                  registeredTimestamps.add(minuteKey);
                  points.push({
                    date: cw.date || 'Hoje',
                    timestamp: ts,
                    weightKg: w,
                    reps,
                    volumeKg: vol,
                    setNumber,
                    pse: pseVal,
                  });
                }
              }
            });
          }
        });
      }

      // Ordenar cronologicamente do mais antigo para o mais recente
      points.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return points;
    } catch (e) {
      console.error('Error in getSeriesHistory:', e);
      return [];
    }
  },

  getActiveSession(clientId?: string, programId?: string): ActiveWorkoutSession | null {
    if (typeof window === 'undefined') return null;
    ensureCleanSlate();
    try {
      if (clientId || programId) {
        const scoped = this.getStudentSessionPersist(clientId, programId);
        if (scoped) return scoped;
      }
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  saveActiveSession(session: ActiveWorkoutSession | null, clientId?: string, programId?: string) {
    if (typeof window === 'undefined') return;
    try {
      const prevSession = this.getActiveSession();
      const targetClientId = clientId || session?.clientId || prevSession?.clientId;
      const targetProgramId = programId || session?.programId || prevSession?.programId;

      if (!session) {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
      } else {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
      }

      this.saveStudentSessionPersist(session, targetClientId, targetProgramId);

      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('ironcoach:active-session-updated', { detail: { session } })
          );
        }
      }, 0);
    } catch (e) {
      console.error('Error saving active session:', e);
    }
  },

  // EXERCISE DATABASE METHODS
  getExerciseDatabase(): DatabaseExercise[] {
    if (typeof window === 'undefined') return INITIAL_EXERCISE_DATABASE;
    try {
      const customRaw = localStorage.getItem(STORAGE_KEYS.EXERCISE_DATABASE);
      const deletedRaw = localStorage.getItem('ironcoach_deleted_exercise_ids_v3');
      const deletedIds = new Set<string>(deletedRaw ? JSON.parse(deletedRaw) : []);

      let storedList: DatabaseExercise[] = [];
      if (customRaw) {
        const parsed: DatabaseExercise[] = JSON.parse(customRaw);
        storedList = parsed.filter(
          (ex) => ex && (ex.isCustom || ex.isModified || ex.videoUrl || ex.gifUrl)
        );
      } else {
        const legacyRaw = localStorage.getItem(STORAGE_KEYS.LEGACY_EXERCISE_DATABASE);
        if (legacyRaw) {
          const legacyParsed: DatabaseExercise[] = JSON.parse(legacyRaw);
          storedList = legacyParsed.filter(
            (ex) => ex && (ex.isCustom || ex.isModified || ex.videoUrl || ex.gifUrl)
          );
          localStorage.setItem(STORAGE_KEYS.EXERCISE_DATABASE, JSON.stringify(storedList));
        }
      }

      const storedById = new Map<string, DatabaseExercise>();
      storedList.forEach((item) => {
        if (!deletedIds.has(item.id)) {
          storedById.set(item.id, item);
        }
      });

      const baseCatalogIds = new Set(INITIAL_EXERCISE_DATABASE.map((ex) => ex.id));
      const pureCustom = storedList.filter(
        (ex) => !deletedIds.has(ex.id) && !baseCatalogIds.has(ex.id)
      );

      const mergedCatalog = INITIAL_EXERCISE_DATABASE.filter(
        (ex) => !deletedIds.has(ex.id)
      ).map((ex) => {
        const override = storedById.get(ex.id);
        return override ? { ...ex, ...override, isModified: true } : ex;
      });

      return [...pureCustom, ...mergedCatalog];
    } catch {
      return INITIAL_EXERCISE_DATABASE;
    }
  },

  saveExerciseDatabase(exercises: DatabaseExercise[]) {
    if (typeof window === 'undefined') return;
    try {
      const toPersist = exercises.filter(
        (ex) => ex && (ex.isCustom || ex.isModified || ex.videoUrl || ex.gifUrl)
      );
      localStorage.setItem(
        STORAGE_KEYS.EXERCISE_DATABASE,
        JSON.stringify(toPersist)
      );
      window.dispatchEvent(new CustomEvent('ironcoach:exercise-db-updated'));
    } catch (e) {
      console.error('Error saving exercise database:', e);
    }
  },

  addExerciseToDatabase(
    name: string,
    muscleGroup: MuscleGroup,
    extra?: Partial<DatabaseExercise>
  ): DatabaseExercise {
    const currentAll = this.getExerciseDatabase();
    const newEx: DatabaseExercise = {
      id: `custom-ex-${Date.now()}`,
      name: name.trim(),
      muscleGroup,
      primaryMuscles: extra?.primaryMuscles || [],
      secondaryMuscles: extra?.secondaryMuscles || [],
      equipment: extra?.equipment || 'outros',
      level: extra?.level || 'intermediario',
      mechanic: extra?.mechanic || null,
      force: extra?.force || null,
      category: extra?.category || 'forca',
      instructions: extra?.instructions || [],
      images: extra?.images || [],
      videoUrl: extra?.videoUrl,
      gifUrl: extra?.gifUrl,
      mediaType: extra?.mediaType,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [newEx, ...currentAll];
    this.saveExerciseDatabase(updated);
    return newEx;
  },

  updateExerciseInDatabase(updatedExercise: DatabaseExercise): DatabaseExercise[] {
    const currentAll = this.getExerciseDatabase();
    const exists = currentAll.some((ex) => ex.id === updatedExercise.id);
    const nextItem: DatabaseExercise = {
      ...updatedExercise,
      isModified: true,
    };
    const updatedList = exists
      ? currentAll.map((ex) => (ex.id === updatedExercise.id ? nextItem : ex))
      : [ { ...nextItem, isCustom: true }, ...currentAll ];
    this.saveExerciseDatabase(updatedList);
    return this.getExerciseDatabase();
  },

  deleteExerciseFromDatabase(exerciseId: string): DatabaseExercise[] {
    if (typeof window !== 'undefined') {
      try {
        const deletedRaw = localStorage.getItem('ironcoach_deleted_exercise_ids_v3');
        const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
        if (!deletedIds.includes(exerciseId)) {
          deletedIds.push(exerciseId);
          localStorage.setItem('ironcoach_deleted_exercise_ids_v3', JSON.stringify(deletedIds));
        }
      } catch (e) {
        console.error('Error recording deleted exercise id:', e);
      }
    }
    const list = this.getExerciseDatabase().filter((ex) => ex.id !== exerciseId);
    this.saveExerciseDatabase(list);
    return list;
  },

  resetExerciseDatabase(): DatabaseExercise[] {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ironcoach_deleted_exercise_ids_v3');
      localStorage.removeItem(STORAGE_KEYS.EXERCISE_DATABASE);
      window.dispatchEvent(new CustomEvent('ironcoach:exercise-db-updated'));
    }
    return INITIAL_EXERCISE_DATABASE;
  },

  // CUSTOM WORKOUT METHODS (MÉTODOS AVANÇADOS PERSONALIZADOS)
  getCustomMethods(): CustomWorkoutMethod[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_METHODS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveCustomMethods(methods: CustomWorkoutMethod[]): CustomWorkoutMethod[] {
    if (typeof window === 'undefined') return methods;
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_METHODS, JSON.stringify(methods));
      window.dispatchEvent(new CustomEvent('ironcoach:custom-methods-updated'));
    } catch (e) {
      console.error('Error saving custom methods:', e);
    }
    return methods;
  },

  addCustomMethod(
    methodData: Omit<CustomWorkoutMethod, 'id' | 'createdAt'>
  ): CustomWorkoutMethod {
    const current = this.getCustomMethods();
    const cleanName = methodData.name.trim();
    const existingIdx = current.findIndex(
      (m) => m.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    const newMethod: CustomWorkoutMethod = {
      id: existingIdx >= 0 ? current[existingIdx].id : `method-${Date.now()}`,
      name: cleanName,
      hasSubSets: methodData.hasSubSets,
      subSetsTemplate: methodData.hasSubSets ? methodData.subSetsTemplate || [] : [],
      createdAt: new Date().toISOString(),
    };
    const updated =
      existingIdx >= 0
        ? current.map((m, idx) => (idx === existingIdx ? newMethod : m))
        : [newMethod, ...current];
    this.saveCustomMethods(updated);
    return newMethod;
  },

  deleteCustomMethod(methodId: string): CustomWorkoutMethod[] {
    const current = this.getCustomMethods().filter((m) => m.id !== methodId);
    return this.saveCustomMethods(current);
  },

  // COMPLETED WORKOUTS HISTORY METHODS
  getCompletedWorkouts(clientId?: string): CompletedWorkoutRecord[] {
    if (typeof window === 'undefined') {
      return clientId
        ? INITIAL_COMPLETED_WORKOUTS.filter((w) => w.clientId === clientId)
        : INITIAL_COMPLETED_WORKOUTS;
    }
    ensureCleanSlate();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COMPLETED_WORKOUTS);
      const list: CompletedWorkoutRecord[] = data ? JSON.parse(data) : [];

      // Merge with independent student progress store so history is always available offline
      const progressMap = this.getStudentProgressPersistMap();
      const byId = new Map<string, CompletedWorkoutRecord>();
      list.forEach((item) => {
        if (item && item.id) byId.set(item.id, item);
      });

      if (clientId && progressMap[clientId]?.completedWorkouts) {
        progressMap[clientId].completedWorkouts.forEach((item) => {
          if (item && item.id && !byId.has(item.id)) {
            byId.set(item.id, item);
          }
        });
      } else if (!clientId) {
        Object.values(progressMap).forEach((entry) => {
          entry?.completedWorkouts?.forEach((item) => {
            if (item && item.id && !byId.has(item.id)) {
              byId.set(item.id, item);
            }
          });
        });
      }

      const combined = Array.from(byId.values()).sort(
        (a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
      );

      return clientId ? combined.filter((w) => w.clientId === clientId) : combined;
    } catch {
      return clientId
        ? INITIAL_COMPLETED_WORKOUTS.filter((w) => w.clientId === clientId)
        : INITIAL_COMPLETED_WORKOUTS;
    }
  },

  saveCompletedWorkout(record: CompletedWorkoutRecord): CompletedWorkoutRecord[] {
    const list = this.getCompletedWorkouts();
    const existingIdx = list.findIndex((w) => w.id === record.id);
    const updated =
      existingIdx >= 0
        ? list.map((w, idx) => (idx === existingIdx ? record : w))
        : [record, ...list];
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          STORAGE_KEYS.COMPLETED_WORKOUTS,
          JSON.stringify(updated)
        );
        if (record.clientId) {
          this.persistStudentIndependentCompletedWorkout(record.clientId, record);
        }
      } catch (e) {
        console.error('Error saving completed workout:', e);
      }
    }
    return updated;
  },

  mergeCompletedWorkouts(incoming: CompletedWorkoutRecord[]): CompletedWorkoutRecord[] {
    if (typeof window === 'undefined') return incoming;
    try {
      const localList = this.getCompletedWorkouts();
      const pendingOps = this.getPendingOperations();
      const pendingDeletedIds = new Set(
        pendingOps
          .filter((op) => op.type === 'DELETE_COMPLETED_WORKOUT')
          .map((op) => op.entityId)
      );
      const pendingUpserts = new Map<string, CompletedWorkoutRecord>();
      pendingOps
        .filter((op) => op.type === 'UPSERT_COMPLETED_WORKOUT')
        .forEach((op) => {
          const rec = op.payload as CompletedWorkoutRecord;
          if (rec && rec.id) pendingUpserts.set(rec.id, rec);
        });

      const byId = new Map<string, CompletedWorkoutRecord>();
      localList.forEach((item) => {
        if (item && item.id && !pendingDeletedIds.has(item.id)) {
          byId.set(item.id, item);
        }
      });
      incoming.forEach((item) => {
        if (item && item.id && !pendingDeletedIds.has(item.id)) {
          const pendingLocal = pendingUpserts.get(item.id);
          byId.set(item.id, pendingLocal || item);
        }
      });
      pendingUpserts.forEach((rec, id) => {
        if (!pendingDeletedIds.has(id)) {
          byId.set(id, rec);
        }
      });

      const merged = Array.from(byId.values()).sort(
        (a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
      );

      localStorage.setItem(STORAGE_KEYS.COMPLETED_WORKOUTS, JSON.stringify(merged));

      // Mirror into per-student independent Data Persist store
      const affectedClients = new Set<string>();
      merged.forEach((r) => {
        if (r.clientId) affectedClients.add(r.clientId);
      });
      affectedClients.forEach((cid) => {
        const studentRecords = merged.filter((r) => r.clientId === cid);
        this.persistStudentIndependentCompletedWorkoutList(cid, studentRecords);
      });

      return merged;
    } catch (e) {
      console.error('Error merging completed workouts:', e);
      return incoming;
    }
  },

  updateCompletedWorkout(record: CompletedWorkoutRecord): CompletedWorkoutRecord[] {
    return this.saveCompletedWorkout(record);
  },

  generateWorkoutFeedbackReport(currentRecord: CompletedWorkoutRecord): {
    canGenerate: boolean;
    report: WorkoutFeedbackReport | null;
    previousRecord?: CompletedWorkoutRecord;
  } {
    const allClientWorkouts = this.getCompletedWorkouts(currentRecord.clientId)
      .filter((w) => w.id !== currentRecord.id)
      .sort(
        (a, b) =>
          new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
      );

    if (allClientWorkouts.length === 0) {
      return { canGenerate: false, report: null };
    }

    const currentSplitClean = (currentRecord.splitName || '').trim().toLowerCase();
    const currentExNames = new Set(
      (currentRecord.exercises || []).map((e) => (e.name || '').trim().toLowerCase())
    );

    // Prioriza treino anterior da mesma divisão/split ou que compartilhe exercícios
    const matchingSplitRecord =
      allClientWorkouts.find(
        (w) => (w.splitName || '').trim().toLowerCase() === currentSplitClean
      ) ||
      allClientWorkouts.find((w) =>
        (w.exercises || []).some((e) =>
          currentExNames.has((e.name || '').trim().toLowerCase())
        )
      ) ||
      allClientWorkouts[0];

    const extractExerciseStats = (ex: { sets?: any[] }) => {
      const sets = Array.isArray(ex.sets) ? ex.sets : [];
      const activeSets = sets.filter((s) => s.completed);
      const targetSets = activeSets.length > 0 ? activeSets : sets;

      let maxWeightKg = 0;
      let totalReps = 0;
      let volumeKg = 0;
      const pseValues: number[] = [];

      targetSets.forEach((s) => {
        const w = typeof s.weightKg === 'number' && s.weightKg > 0 ? s.weightKg : 0;
        const r = typeof s.completedReps === 'number' && s.completedReps > 0 ? s.completedReps : 0;
        if (w > maxWeightKg) maxWeightKg = w;
        totalReps += r;
        volumeKg += w * r;
        if (typeof s.pse === 'number') {
          pseValues.push(s.pse);
        }

        if (Array.isArray(s.subSets)) {
          s.subSets.forEach((sub: any) => {
            if (sub.completed || activeSets.length === 0) {
              const subW = typeof sub.weightKg === 'number' && sub.weightKg > 0 ? sub.weightKg : 0;
              const subR =
                typeof sub.completedReps === 'number' && sub.completedReps > 0
                  ? sub.completedReps
                  : 0;
              if (subW > maxWeightKg) maxWeightKg = subW;
              totalReps += subR;
              volumeKg += subW * subR;
            }
          });
        }
      });

      const avgPse =
        pseValues.length > 0
          ? Number(
              (pseValues.reduce((acc, v) => acc + v, 0) / pseValues.length).toFixed(1)
            )
          : null;

      return {
        maxWeightKg: Number(maxWeightKg.toFixed(1)),
        totalReps,
        volumeKg: Number(volumeKg.toFixed(1)),
        avgPse,
      };
    };

    const exerciseComparisons: ExerciseImprovementItem[] = (
      currentRecord.exercises || []
    ).map((currEx) => {
      const cleanName = (currEx.name || '').trim().toLowerCase();
      const currStats = extractExerciseStats(currEx);

      // Busca o treino anterior mais recente que contenha este exercício específico
      let prevWorkoutForEx: CompletedWorkoutRecord | undefined;
      let prevExRecord: any;

      for (const prevW of allClientWorkouts) {
        const found = (prevW.exercises || []).find(
          (e) => (e.name || '').trim().toLowerCase() === cleanName
        );
        if (found) {
          prevWorkoutForEx = prevW;
          prevExRecord = found;
          break;
        }
      }

      if (!prevExRecord) {
        return {
          exerciseName: currEx.name,
          muscleGroup: currEx.muscleGroup,
          hasPreviousHistory: false,
          previousMaxWeightKg: 0,
          currentMaxWeightKg: currStats.maxWeightKg,
          weightDiffKg: 0,
          weightDiffPercent: 0,
          previousTotalReps: 0,
          currentTotalReps: currStats.totalReps,
          repsDiff: 0,
          repsDiffPercent: 0,
          previousVolumeKg: 0,
          currentVolumeKg: currStats.volumeKg,
          volumeDiffKg: 0,
          volumeDiffPercent: 0,
          previousAvgPse: null,
          currentAvgPse: currStats.avgPse,
          pseDiff: null,
          pseLoadRelationship: '1º registro deste exercício no histórico',
          pseLoadStatus: 'maintained',
          hasAnyImprovement: false,
          improvementsSummary: ['Exercício registrado pela 1ª vez para base futura'],
        };
      }

      const prevStats = extractExerciseStats(prevExRecord);
      const weightDiffKg = Number((currStats.maxWeightKg - prevStats.maxWeightKg).toFixed(1));
      const weightDiffPercent =
        prevStats.maxWeightKg > 0
          ? Number(
              (((currStats.maxWeightKg - prevStats.maxWeightKg) / prevStats.maxWeightKg) * 100).toFixed(
                1
              )
            )
          : currStats.maxWeightKg > 0
          ? 100
          : 0;

      const repsDiff = currStats.totalReps - prevStats.totalReps;
      const repsDiffPercent =
        prevStats.totalReps > 0
          ? Number((((currStats.totalReps - prevStats.totalReps) / prevStats.totalReps) * 100).toFixed(1))
          : currStats.totalReps > 0
          ? 100
          : 0;

      const volumeDiffKg = Number((currStats.volumeKg - prevStats.volumeKg).toFixed(1));
      const volumeDiffPercent =
        prevStats.volumeKg > 0
          ? Number((((currStats.volumeKg - prevStats.volumeKg) / prevStats.volumeKg) * 100).toFixed(1))
          : currStats.volumeKg > 0
          ? 100
          : 0;

      const pseDiff =
        currStats.avgPse !== null && prevStats.avgPse !== null
          ? Number((currStats.avgPse - prevStats.avgPse).toFixed(1))
          : null;

      const improvementsSummary: string[] = [];
      if (weightDiffKg > 0) {
        improvementsSummary.push(
          `Carga +${weightDiffPercent}% (+${weightDiffKg} kg)`
        );
      }
      if (repsDiff > 0) {
        improvementsSummary.push(`+${repsDiff} repetições totais`);
      }
      if (volumeDiffKg > 0) {
        improvementsSummary.push(
          `Volume +${volumeDiffPercent}% (+${volumeDiffKg} kg)`
        );
      }

      let pseLoadRelationship = 'Manutenção da relação PSE × Carga';
      let pseLoadStatus: 'improved' | 'progressed' | 'maintained' | 'demanding' =
        'maintained';

      if (currStats.avgPse !== null && prevStats.avgPse !== null) {
        if (weightDiffKg > 0 && currStats.avgPse < prevStats.avgPse) {
          pseLoadRelationship = `Eficiência Superior: Carga +${weightDiffPercent}% com menor esforço (PSE ${prevStats.avgPse} → ${currStats.avgPse})`;
          pseLoadStatus = 'improved';
          improvementsSummary.push('Menor PSE com carga maior');
        } else if (weightDiffKg > 0 && currStats.avgPse === prevStats.avgPse) {
          pseLoadRelationship = `Ganho Real de Força: Carga +${weightDiffPercent}% mantendo PSE ${currStats.avgPse}`;
          pseLoadStatus = 'improved';
          improvementsSummary.push('Mesma PSE com carga maior');
        } else if (weightDiffKg > 0 && currStats.avgPse > prevStats.avgPse) {
          pseLoadRelationship = `Progressão de Carga (+${weightDiffPercent}%) com PSE proporcional (${prevStats.avgPse} → ${currStats.avgPse})`;
          pseLoadStatus = 'progressed';
        } else if (weightDiffKg === 0 && currStats.avgPse < prevStats.avgPse) {
          pseLoadRelationship = `Adaptação de Esforço: Mesma carga (${currStats.maxWeightKg} kg) com menor PSE (${prevStats.avgPse} → ${currStats.avgPse})`;
          pseLoadStatus = 'improved';
          improvementsSummary.push(`Redução de esforço (PSE ${prevStats.avgPse} → ${currStats.avgPse})`);
        } else if (weightDiffKg === 0 && repsDiff > 0 && currStats.avgPse <= prevStats.avgPse) {
          pseLoadRelationship = `Resistência Muscular: +${repsDiff} reps sem aumento de PSE (${currStats.avgPse})`;
          pseLoadStatus = 'improved';
        } else if (currStats.avgPse > prevStats.avgPse && weightDiffKg <= 0) {
          pseLoadRelationship = `Maior percepção de esforço (PSE ${prevStats.avgPse} → ${currStats.avgPse}) para a carga atual`;
          pseLoadStatus = 'demanding';
        } else {
          pseLoadRelationship = `Estabilidade: Carga ${currStats.maxWeightKg} kg • PSE ${currStats.avgPse}`;
          pseLoadStatus = 'maintained';
        }
      } else if (weightDiffKg > 0) {
        pseLoadRelationship = `Evolução de Carga (+${weightDiffPercent}%)${
          currStats.avgPse !== null ? ` • PSE atual ${currStats.avgPse}` : ''
        }`;
        pseLoadStatus = 'progressed';
      } else if (repsDiff > 0 || volumeDiffKg > 0) {
        pseLoadRelationship = `Evolução de Volume/Repetições mantendo carga base (${currStats.maxWeightKg} kg)`;
        pseLoadStatus = 'progressed';
      }

      const hasAnyImprovement =
        weightDiffKg > 0 ||
        repsDiff > 0 ||
        volumeDiffKg > 0 ||
        pseLoadStatus === 'improved';

      return {
        exerciseName: currEx.name,
        muscleGroup: currEx.muscleGroup,
        hasPreviousHistory: true,
        previousDate: prevWorkoutForEx?.date,
        previousMaxWeightKg: prevStats.maxWeightKg,
        currentMaxWeightKg: currStats.maxWeightKg,
        weightDiffKg,
        weightDiffPercent,
        previousTotalReps: prevStats.totalReps,
        currentTotalReps: currStats.totalReps,
        repsDiff,
        repsDiffPercent,
        previousVolumeKg: prevStats.volumeKg,
        currentVolumeKg: currStats.volumeKg,
        volumeDiffKg,
        volumeDiffPercent,
        previousAvgPse: prevStats.avgPse,
        currentAvgPse: currStats.avgPse,
        pseDiff,
        pseLoadRelationship,
        pseLoadStatus,
        hasAnyImprovement,
        improvementsSummary,
      };
    });

    // Métricas globais da sessão comparada ao último treino de referência
    const prevGlobalExercises = matchingSplitRecord.exercises || [];
    const prevGlobalStats = prevGlobalExercises.map((e) => extractExerciseStats(e));
    const currGlobalStats = (currentRecord.exercises || []).map((e) =>
      extractExerciseStats(e)
    );

    const previousTotalVolumeKg =
      matchingSplitRecord.totalVolumeKg ||
      Number(prevGlobalStats.reduce((sum, s) => sum + s.volumeKg, 0).toFixed(1));
    const currentTotalVolumeKg =
      currentRecord.totalVolumeKg ||
      Number(currGlobalStats.reduce((sum, s) => sum + s.volumeKg, 0).toFixed(1));

    const totalVolumeDiffKg = Number(
      (currentTotalVolumeKg - previousTotalVolumeKg).toFixed(1)
    );
    const totalVolumeDiffPercent =
      previousTotalVolumeKg > 0
        ? Number(
            (
              ((currentTotalVolumeKg - previousTotalVolumeKg) / previousTotalVolumeKg) *
              100
            ).toFixed(1)
          )
        : currentTotalVolumeKg > 0
        ? 100
        : 0;

    const previousTotalReps = prevGlobalStats.reduce((sum, s) => sum + s.totalReps, 0);
    const currentTotalReps = currGlobalStats.reduce((sum, s) => sum + s.totalReps, 0);
    const totalRepsDiff = currentTotalReps - previousTotalReps;

    const prevValidPses = prevGlobalStats
      .map((s) => s.avgPse)
      .filter((v): v is number => v !== null);
    const currValidPses = currGlobalStats
      .map((s) => s.avgPse)
      .filter((v): v is number => v !== null);

    const previousAvgPse =
      prevValidPses.length > 0
        ? Number(
            (prevValidPses.reduce((a, b) => a + b, 0) / prevValidPses.length).toFixed(1)
          )
        : null;
    const currentAvgPse =
      currValidPses.length > 0
        ? Number(
            (currValidPses.reduce((a, b) => a + b, 0) / currValidPses.length).toFixed(1)
          )
        : null;

    const comparedItems = exerciseComparisons.filter((c) => c.hasPreviousHistory);
    const avgWeightDiffPercent =
      comparedItems.length > 0
        ? Number(
            (
              comparedItems.reduce((sum, item) => sum + item.weightDiffPercent, 0) /
              comparedItems.length
            ).toFixed(1)
          )
        : 0;

    const exercisesImprovedCount = exerciseComparisons.filter(
      (c) => c.hasAnyImprovement
    ).length;

    const report: WorkoutFeedbackReport = {
      id: `rep-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      comparedWorkoutId: matchingSplitRecord.id,
      comparedWorkoutDate: matchingSplitRecord.date,
      previousTotalVolumeKg,
      currentTotalVolumeKg,
      totalVolumeDiffKg,
      totalVolumeDiffPercent,
      previousTotalReps,
      currentTotalReps,
      totalRepsDiff,
      previousAvgPse,
      currentAvgPse,
      avgWeightDiffPercent,
      exercisesImprovedCount,
      totalComparedExercises: comparedItems.length,
      exerciseComparisons,
      nextWorkoutGoal: currentRecord.nextWorkoutGoal || '',
    };

    return {
      canGenerate: true,
      report,
      previousRecord: matchingSplitRecord,
    };
  },

  getPreWorkoutHistoryAnalysis(
    clientId: string,
    splitName?: string,
    programName?: string
  ): {
    latestRecord: CompletedWorkoutRecord | null;
    recordsWithFeedbackOrGoal: CompletedWorkoutRecord[];
    allPreviousRecords: CompletedWorkoutRecord[];
  } {
    const allClientRecords = this.getCompletedWorkouts(clientId).sort(
      (a, b) =>
        new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
    );

    if (allClientRecords.length === 0) {
      return {
        latestRecord: null,
        recordsWithFeedbackOrGoal: [],
        allPreviousRecords: [],
      };
    }

    const cleanSplit = (splitName || '').trim().toLowerCase();
    const cleanProg = (programName || '').trim().toLowerCase();

    const matchingSplitRecords = cleanSplit
      ? allClientRecords.filter((r) => {
          const rSplit = (r.splitName || '').trim().toLowerCase();
          return rSplit === cleanSplit || (cleanProg && cleanSplit.includes(rSplit));
        })
      : [];

    const prioritizedList =
      matchingSplitRecords.length > 0 ? matchingSplitRecords : allClientRecords;

    const latestRecord = prioritizedList[0] || allClientRecords[0] || null;
    const recordsWithFeedbackOrGoal = allClientRecords.filter(
      (r) =>
        r.feedbackReport ||
        (r.nextWorkoutGoal && r.nextWorkoutGoal.trim().length > 0) ||
        (r.trainerNotes && r.trainerNotes.trim().length > 0)
    );

    return {
      latestRecord,
      recordsWithFeedbackOrGoal,
      allPreviousRecords: allClientRecords,
    };
  },

  deleteCompletedWorkout(workoutId: string): CompletedWorkoutRecord[] {
    const list = this.getCompletedWorkouts();
    const target = list.find((w) => w.id === workoutId);
    const updated = list.filter((w) => w.id !== workoutId);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          STORAGE_KEYS.COMPLETED_WORKOUTS,
          JSON.stringify(updated)
        );
        if (target?.clientId) {
          const clientRemaining = updated.filter((w) => w.clientId === target.clientId);
          this.persistStudentIndependentCompletedWorkoutList(target.clientId, clientRemaining);
        }
      } catch (e) {
        console.error('Error deleting completed workout:', e);
      }
    }
    return updated;
  },

  saveExerciseComment(clientId: string, exerciseName: string, commentText: string) {
    if (typeof window === 'undefined' || !commentText.trim()) return;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXERCISE_COMMENTS);
      const allComments: ExerciseCommentRecord[] = data ? JSON.parse(data) : [];
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(
        now.getMonth() + 1
      ).padStart(2, '0')}/${now.getFullYear()}`;

      const newRecord: ExerciseCommentRecord = {
        id: `com-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        clientId,
        exerciseName,
        comment: commentText.trim(),
        date: dateStr,
        timestamp: now.toISOString(),
      };

      allComments.push(newRecord);
      localStorage.setItem(STORAGE_KEYS.EXERCISE_COMMENTS, JSON.stringify(allComments));
      window.dispatchEvent(new Event('ironcoach:data-synced'));
    } catch (e) {
      console.error('Error saving exercise comment:', e);
    }
  },

  getExerciseComments(exerciseName: string, clientId?: string): ExerciseCommentRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXERCISE_COMMENTS);
      if (!data) return [];
      const allComments: ExerciseCommentRecord[] = JSON.parse(data);
      return allComments
        .filter(
          (c) =>
            c.exerciseName.toLowerCase() === exerciseName.toLowerCase() &&
            (!clientId || c.clientId === clientId)
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch {
      return [];
    }
  },

  // ============================================================================
  // NUTRITION & DIET PLANS STORAGE
  // ============================================================================
  getDietPlans(): ClientDietPlan[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DIET_PLANS);
      if (!raw) return [];
      return JSON.parse(raw) as ClientDietPlan[];
    } catch (e) {
      console.error('Error reading diet plans:', e);
      return [];
    }
  },

  saveDietPlans(plans: ClientDietPlan[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.DIET_PLANS, JSON.stringify(plans));
    } catch (e) {
      console.error('Error saving diet plans:', e);
    }
  },

  getClientDietPlan(clientId: string): ClientDietPlan | null {
    const plans = this.getDietPlans();
    return plans.find((p) => p.clientId === clientId) || null;
  },

  saveClientDietPlan(plan: ClientDietPlan): ClientDietPlan[] {
    const plans = this.getDietPlans();
    const idx = plans.findIndex((p) => p.clientId === plan.clientId || p.id === plan.id);
    const updatedPlan: ClientDietPlan = {
      ...plan,
      updatedAt: new Date().toISOString(),
    };
    let updatedList: ClientDietPlan[];
    if (idx >= 0) {
      updatedList = [...plans];
      updatedList[idx] = updatedPlan;
    } else {
      updatedList = [updatedPlan, ...plans];
    }
    this.saveDietPlans(updatedList);
    return updatedList;
  },

  deleteClientDietPlan(clientId: string): ClientDietPlan[] {
    const plans = this.getDietPlans().filter((p) => p.clientId !== clientId);
    this.saveDietPlans(plans);
    return plans;
  },

  getNutritionLibrary(): NutritionProfessionalLibrary {
    const defaults = getInitialProfessionalLibrary();
    if (typeof window === 'undefined') return defaults;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.NUTRITION_LIBRARY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEYS.NUTRITION_LIBRARY, JSON.stringify(defaults));
        return defaults;
      }
      const parsed = JSON.parse(raw) as Partial<NutritionProfessionalLibrary>;
      return {
        customFoods: Array.isArray(parsed.customFoods)
          ? parsed.customFoods
          : defaults.customFoods,
        recipes: Array.isArray(parsed.recipes) && parsed.recipes.length > 0
          ? parsed.recipes
          : defaults.recipes,
        mealTemplates: Array.isArray(parsed.mealTemplates) && parsed.mealTemplates.length > 0
          ? parsed.mealTemplates
          : defaults.mealTemplates,
        customPortions: Array.isArray(parsed.customPortions)
          ? parsed.customPortions
          : defaults.customPortions,
        updatedAt: parsed.updatedAt || defaults.updatedAt,
      };
    } catch (e) {
      console.error('Error reading nutrition library:', e);
      return defaults;
    }
  },

  saveNutritionLibrary(library: NutritionProfessionalLibrary) {
    if (typeof window === 'undefined') return;
    try {
      const updated: NutritionProfessionalLibrary = {
        ...library,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.NUTRITION_LIBRARY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving nutrition library:', e);
    }
  },

  // ============================================================================
  // DATA PERSIST: INDEPENDENT STUDENT WORKOUT SESSION & PROGRESS STORAGE
  // ============================================================================
  getStudentProgressPersistMap(): Record<string, StudentIndependentProgressPersist> {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_PROGRESS_PERSIST);
      if (!raw) return {};
      return JSON.parse(raw) as Record<string, StudentIndependentProgressPersist>;
    } catch {
      return {};
    }
  },

  saveStudentProgressPersistMap(map: Record<string, StudentIndependentProgressPersist>) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENT_PROGRESS_PERSIST, JSON.stringify(map));
    } catch (e) {
      console.error('Error saving student independent progress map:', e);
    }
  },

  ensureStudentProgressBucket(
    map: Record<string, StudentIndependentProgressPersist>,
    clientId: string
  ): StudentIndependentProgressPersist {
    if (!map[clientId]) {
      map[clientId] = {
        clientId,
        activeSession: null,
        sessionsByProgram: {},
        completedWorkouts: [],
        exerciseSnapshots: [],
        updatedAt: new Date().toISOString(),
      };
    }
    return map[clientId];
  },

  saveStudentSessionPersist(
    session: ActiveWorkoutSession | null,
    clientId?: string,
    programId?: string
  ) {
    if (typeof window === 'undefined') return;
    try {
      const targetClientId = clientId || session?.clientId;
      const targetProgramId = programId || session?.programId;

      const rawMap = localStorage.getItem(STORAGE_KEYS.STUDENT_SESSIONS_PERSIST);
      const sessionsMap: Record<string, ActiveWorkoutSession> = rawMap
        ? JSON.parse(rawMap)
        : {};

      if (session && targetClientId) {
        sessionsMap[`${targetClientId}::latest`] = session;
        if (targetProgramId) {
          sessionsMap[`${targetClientId}::${targetProgramId}`] = session;
        }
      } else if (!session && targetClientId) {
        delete sessionsMap[`${targetClientId}::latest`];
        if (targetProgramId) {
          delete sessionsMap[`${targetClientId}::${targetProgramId}`];
        }
      }
      localStorage.setItem(
        STORAGE_KEYS.STUDENT_SESSIONS_PERSIST,
        JSON.stringify(sessionsMap)
      );

      if (targetClientId) {
        const progressMap = this.getStudentProgressPersistMap();
        const bucket = this.ensureStudentProgressBucket(progressMap, targetClientId);
        bucket.activeSession = session;
        if (targetProgramId) {
          if (session) {
            bucket.sessionsByProgram[targetProgramId] = session;
          } else {
            delete bucket.sessionsByProgram[targetProgramId];
          }
        }
        bucket.updatedAt = new Date().toISOString();
        this.saveStudentProgressPersistMap(progressMap);
      }
    } catch (e) {
      console.error('Error saving student session persist:', e);
    }
  },

  getStudentSessionPersist(
    clientId?: string,
    programId?: string
  ): ActiveWorkoutSession | null {
    if (typeof window === 'undefined') return null;
    try {
      const rawMap = localStorage.getItem(STORAGE_KEYS.STUDENT_SESSIONS_PERSIST);
      const sessionsMap: Record<string, ActiveWorkoutSession> = rawMap
        ? JSON.parse(rawMap)
        : {};

      if (clientId && programId && sessionsMap[`${clientId}::${programId}`]) {
        return sessionsMap[`${clientId}::${programId}`];
      }
      if (clientId && sessionsMap[`${clientId}::latest`]) {
        const latest = sessionsMap[`${clientId}::latest`];
        if (!programId || latest.programId === programId) {
          return latest;
        }
      }

      if (clientId) {
        const progressMap = this.getStudentProgressPersistMap();
        const bucket = progressMap[clientId];
        if (bucket) {
          if (programId && bucket.sessionsByProgram?.[programId]) {
            return bucket.sessionsByProgram[programId];
          }
          if (bucket.activeSession && (!programId || bucket.activeSession.programId === programId)) {
            return bucket.activeSession;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  persistStudentIndependentCompletedWorkout(
    clientId: string,
    record: CompletedWorkoutRecord
  ) {
    if (typeof window === 'undefined' || !clientId) return;
    try {
      const progressMap = this.getStudentProgressPersistMap();
      const bucket = this.ensureStudentProgressBucket(progressMap, clientId);
      const idx = bucket.completedWorkouts.findIndex((w) => w.id === record.id);
      if (idx >= 0) {
        bucket.completedWorkouts[idx] = record;
      } else {
        bucket.completedWorkouts.unshift(record);
      }
      bucket.completedWorkouts.sort(
        (a, b) =>
          new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
      );
      bucket.updatedAt = new Date().toISOString();
      this.saveStudentProgressPersistMap(progressMap);
    } catch (e) {
      console.error('Error persisting student independent completed workout:', e);
    }
  },

  persistStudentIndependentCompletedWorkoutList(
    clientId: string,
    records: CompletedWorkoutRecord[]
  ) {
    if (typeof window === 'undefined' || !clientId) return;
    try {
      const progressMap = this.getStudentProgressPersistMap();
      const bucket = this.ensureStudentProgressBucket(progressMap, clientId);
      bucket.completedWorkouts = [...records].sort(
        (a, b) =>
          new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
      );
      bucket.updatedAt = new Date().toISOString();
      this.saveStudentProgressPersistMap(progressMap);
    } catch (e) {
      console.error('Error persisting student independent completed workout list:', e);
    }
  },

  persistStudentIndependentSnapshot(
    clientId: string,
    snapshot: ExerciseFinishedSnapshot
  ) {
    if (typeof window === 'undefined' || !clientId) return;
    try {
      const progressMap = this.getStudentProgressPersistMap();
      const bucket = this.ensureStudentProgressBucket(progressMap, clientId);
      const exists = bucket.exerciseSnapshots.some((s) => s.id === snapshot.id);
      if (!exists) {
        bucket.exerciseSnapshots.push(snapshot);
        if (bucket.exerciseSnapshots.length > 120) {
          bucket.exerciseSnapshots.splice(0, bucket.exerciseSnapshots.length - 120);
        }
        bucket.updatedAt = new Date().toISOString();
        this.saveStudentProgressPersistMap(progressMap);
      }
    } catch (e) {
      console.error('Error persisting student independent snapshot:', e);
    }
  },

  // ============================================================================
  // OFFLINE-SAFE MERGE HELPERS RESPECTING PENDING QUEUE OPERATIONS
  // ============================================================================
  mergeClients(incoming: Client[]): Client[] {
    if (typeof window === 'undefined') return incoming;
    try {
      const pendingOps = this.getPendingOperations();
      const deletedIds = new Set(
        pendingOps
          .filter((op) => op.type === 'DELETE_CLIENT')
          .map((op) => op.entityId)
      );
      const pendingUpserts = new Map<string, Client>();
      pendingOps
        .filter((op) => op.type === 'UPSERT_CLIENT')
        .forEach((op) => {
          const client = op.payload as Client;
          if (client && client.id) {
            pendingUpserts.set(client.id, client);
          }
        });

      const byId = new Map<string, Client>();
      incoming.forEach((c) => {
        if (c && c.id && !deletedIds.has(c.id)) {
          byId.set(c.id, pendingUpserts.get(c.id) || c);
        }
      });
      pendingUpserts.forEach((c, id) => {
        if (!deletedIds.has(id)) {
          byId.set(id, c);
        }
      });

      const merged = Array.from(byId.values());
      this.saveClients(merged);
      return merged;
    } catch (e) {
      console.error('Error merging clients:', e);
      return incoming;
    }
  },

  mergeWorkouts(incoming: WorkoutProgram[]): WorkoutProgram[] {
    if (typeof window === 'undefined') return incoming;
    try {
      const pendingOps = this.getPendingOperations();
      const deletedIds = new Set(
        pendingOps
          .filter((op) => op.type === 'DELETE_WORKOUT')
          .map((op) => op.entityId)
      );
      const pendingUpserts = new Map<string, WorkoutProgram>();
      pendingOps
        .filter((op) => op.type === 'UPSERT_WORKOUT')
        .forEach((op) => {
          const workout = op.payload as WorkoutProgram;
          if (workout && workout.id) {
            pendingUpserts.set(workout.id, workout);
          }
        });

      const byId = new Map<string, WorkoutProgram>();
      incoming.forEach((w) => {
        if (w && w.id && !deletedIds.has(w.id)) {
          byId.set(w.id, pendingUpserts.get(w.id) || w);
        }
      });
      pendingUpserts.forEach((w, id) => {
        if (!deletedIds.has(id)) {
          byId.set(id, w);
        }
      });

      const merged = Array.from(byId.values());
      this.saveWorkouts(merged);
      return merged;
    } catch (e) {
      console.error('Error merging workouts:', e);
      return incoming;
    }
  },

  mergeCalendarEvents(incoming: CalendarEvent[]): CalendarEvent[] {
    if (typeof window === 'undefined') return incoming;
    try {
      const pendingOps = this.getPendingOperations();
      const deletedIds = new Set(
        pendingOps
          .filter((op) => op.type === 'DELETE_CALENDAR_EVENT')
          .map((op) => op.entityId)
      );
      const pendingUpserts = new Map<string, CalendarEvent>();
      pendingOps
        .filter((op) => op.type === 'UPSERT_CALENDAR_EVENT')
        .forEach((op) => {
          const evt = op.payload as CalendarEvent;
          if (evt && evt.id) {
            pendingUpserts.set(evt.id, evt);
          }
        });

      const byId = new Map<string, CalendarEvent>();
      incoming.forEach((e) => {
        if (e && e.id && !deletedIds.has(e.id)) {
          byId.set(e.id, pendingUpserts.get(e.id) || e);
        }
      });
      pendingUpserts.forEach((e, id) => {
        if (!deletedIds.has(id)) {
          byId.set(id, e);
        }
      });

      const merged = Array.from(byId.values());
      this.saveCalendarEvents(merged);
      return merged;
    } catch (e) {
      console.error('Error merging calendar events:', e);
      return incoming;
    }
  },

  // ============================================================================
  // OFFLINE PENDING OPERATIONS QUEUE
  // ============================================================================
  getPendingOperations(): PendingSyncOperation[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PENDING_SYNC_QUEUE);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  savePendingOperations(ops: PendingSyncOperation[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.PENDING_SYNC_QUEUE, JSON.stringify(ops));
      window.dispatchEvent(
        new CustomEvent('ironcoach:sync-queue-updated', {
          detail: { count: ops.length, operations: ops },
        })
      );
    } catch (e) {
      console.error('Error saving pending operations queue:', e);
    }
  },

  enqueuePendingOperation(input: {
    type: PendingSyncOperationType;
    entityId: string;
    payload: unknown;
    previousEmail?: string;
    clientEmail?: string;
  }): PendingSyncOperation {
    const queue = this.getPendingOperations();
    const nowIso = new Date().toISOString();

    const deleteCounterpartMap: Partial<Record<PendingSyncOperationType, PendingSyncOperationType>> = {
      DELETE_CLIENT: 'UPSERT_CLIENT',
      DELETE_WORKOUT: 'UPSERT_WORKOUT',
      DELETE_CALENDAR_EVENT: 'UPSERT_CALENDAR_EVENT',
      DELETE_COMPLETED_WORKOUT: 'UPSERT_COMPLETED_WORKOUT',
      DELETE_CUSTOM_EXERCISE: 'UPSERT_CUSTOM_EXERCISE',
      DELETE_DIET_PLAN: 'UPSERT_DIET_PLAN',
    };

    const upsertCounterpartMap: Partial<Record<PendingSyncOperationType, PendingSyncOperationType>> = {
      UPSERT_CLIENT: 'DELETE_CLIENT',
      UPSERT_WORKOUT: 'DELETE_WORKOUT',
      UPSERT_CALENDAR_EVENT: 'DELETE_CALENDAR_EVENT',
      UPSERT_COMPLETED_WORKOUT: 'DELETE_COMPLETED_WORKOUT',
      UPSERT_CUSTOM_EXERCISE: 'DELETE_CUSTOM_EXERCISE',
      UPSERT_DIET_PLAN: 'DELETE_DIET_PLAN',
    };

    let filteredQueue = [...queue];

    // If enqueueing a DELETE, remove any prior UPSERT for the same entityId
    const upsertToCancel = deleteCounterpartMap[input.type];
    if (upsertToCancel) {
      filteredQueue = filteredQueue.filter(
        (op) => !(op.type === upsertToCancel && op.entityId === input.entityId)
      );
    }

    // If enqueueing an UPSERT, remove any prior DELETE for the same entityId
    const deleteToCancel = upsertCounterpartMap[input.type];
    if (deleteToCancel) {
      filteredQueue = filteredQueue.filter(
        (op) => !(op.type === deleteToCancel && op.entityId === input.entityId)
      );
    }

    // Coalesce if an operation of the same type + entityId already exists in queue
    const existingIdx = filteredQueue.findIndex(
      (op) => op.type === input.type && op.entityId === input.entityId
    );

    if (existingIdx >= 0) {
      const existingOp = filteredQueue[existingIdx];
      const updatedOp: PendingSyncOperation = {
        ...existingOp,
        payload: input.payload,
        previousEmail: existingOp.previousEmail || input.previousEmail,
        clientEmail: input.clientEmail || existingOp.clientEmail,
        createdAt: nowIso,
      };
      filteredQueue[existingIdx] = updatedOp;
      this.savePendingOperations(filteredQueue);
      return updatedOp;
    }

    const newOp: PendingSyncOperation = {
      id: `qop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: input.type,
      entityId: input.entityId,
      payload: input.payload,
      previousEmail: input.previousEmail,
      clientEmail: input.clientEmail,
      createdAt: nowIso,
      retryCount: 0,
    };

    filteredQueue.push(newOp);
    this.savePendingOperations(filteredQueue);
    return newOp;
  },

  removePendingOperation(operationId: string) {
    const queue = this.getPendingOperations();
    const next = queue.filter((op) => op.id !== operationId);
    if (next.length !== queue.length) {
      this.savePendingOperations(next);
    }
  },

  markPendingOperationAttempt(operationId: string) {
    const queue = this.getPendingOperations();
    const next = queue.map((op) =>
      op.id === operationId
        ? {
            ...op,
            retryCount: (op.retryCount || 0) + 1,
            lastAttemptAt: new Date().toISOString(),
          }
        : op
    );
    this.savePendingOperations(next);
  },

  clearPendingOperations() {
    this.savePendingOperations([]);
  },
};

