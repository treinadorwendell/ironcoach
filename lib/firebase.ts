import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  Client,
  WorkoutProgram,
  CalendarEvent,
  CompletedWorkoutRecord,
  ExerciseHistoricalEntry,
  DatabaseExercise,
  ActiveWorkoutSession,
  ExerciseFinishedSnapshot,
  TrainerProfile,
} from '@/types';
import { storage } from './storage';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Must pass databaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore Error Handler Specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  shouldThrow: boolean = false
) {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (shouldThrow) {
    throw new Error(JSON.stringify(errInfo));
  }
}

/**
 * Recursively removes all `undefined` values from an object or array,
 * because Firestore setDoc / updateDoc rejects documents with `undefined` properties.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    if (data instanceof Date) {
      return data as unknown as T;
    }
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// Connectivity test
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.warn('Firebase client is offline, using local cache.');
    }
    return false;
  }
}

// Authentication Helpers
export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.warn('Google Sign-In notice:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.warn('Sign-Out notice:', error);
    throw error;
  }
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
    return credential.user;
  } catch (error) {
    console.warn('Email Login notice:', error);
    throw error;
  }
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
    if (displayName && displayName.trim()) {
      try {
        await updateProfile(credential.user, {
          displayName: displayName.trim(),
        });
      } catch (err) {
        console.warn('Could not update display name:', err);
      }
    }
    return credential.user;
  } catch (error) {
    console.warn('Email Registration notice:', error);
    throw error;
  }
}

export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    console.warn('Password Reset notice:', error);
    throw error;
  }
}

export async function updateTrainerPassword(newPassword: string): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('Nenhum treinador autenticado no momento.');
  }
  await updatePassword(auth.currentUser, newPassword);
}

export async function updateTrainerDisplayName(displayName: string): Promise<void> {
  if (!auth.currentUser || !displayName.trim()) return;
  try {
    await updateProfile(auth.currentUser, {
      displayName: displayName.trim(),
    });
  } catch (err) {
    console.warn('Could not update auth displayName:', err);
  }
}

export function getFirebaseAuthErrorMessage(error: unknown): string {
  if (!error) return 'Ocorreu um erro inesperado. Tente novamente.';
  const code = (error as { code?: string })?.code || '';
  const message = (error as Error)?.message || '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado. Alterne para a aba Entrar para acessar com sua senha ou recupere o acesso.';
    case 'auth/invalid-email':
      return 'Endereço de e-mail inválido. Verifique o formato digitado (exemplo: usuario@email.com).';
    case 'auth/operation-not-allowed':
      return 'O provedor de E-mail/Senha não está ativado no Firebase Console deste projeto. Utilize a opção "Continuar com Google" para entrar com 1 toque.';
    case 'auth/weak-password':
      return 'Senha muito fraca. Digite pelo menos 6 caracteres (recomendado mesclar letras e números).';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada pelo administrador.';
    case 'auth/user-not-found':
      return 'Nenhuma conta encontrada com este e-mail. Verifique o endereço ou cadastre-se.';
    case 'auth/wrong-password':
      return 'Senha incorreta. Verifique suas credenciais e tente novamente.';
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos. Verifique suas credenciais.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas sem sucesso. Por segurança, aguarde alguns instantes antes de tentar novamente.';
    case 'auth/network-request-failed':
      return 'Falha na conexão de rede. Verifique sua conexão à internet.';
    case 'auth/popup-closed-by-user':
      return 'A janela de autenticação foi fechada antes de concluir o processo.';
    case 'auth/popup-blocked':
      return 'O navegador bloqueou a janela pop-up de login. Permita pop-ups para este site.';
    case 'auth/requires-recent-login':
      return 'Por segurança, faça login novamente para prosseguir.';
    default:
      if (message.includes('password')) {
        return 'Erro na validação da senha. A senha deve possuir pelo menos 6 caracteres.';
      }
      if (message.includes('email')) {
        return 'Erro no e-mail informado. Por favor, verifique a digitação.';
      }
      return message || 'Não foi possível concluir a autenticação. Tente novamente.';
  }
}

// Sync Service for Multi-Tablet Real-Time Syncing
export interface CloudSyncCallbacks {
  onClientsChange?: (clients: Client[]) => void;
  onWorkoutsChange?: (workouts: WorkoutProgram[]) => void;
  onCalendarChange?: (events: CalendarEvent[]) => void;
  onCompletedWorkoutsChange?: (records: CompletedWorkoutRecord[]) => void;
  onActiveSessionChange?: (session: ActiveWorkoutSession | null) => void;
  onExerciseDbChange?: (exercises: DatabaseExercise[]) => void;
  onExerciseSnapshotsChange?: (snapshots: ExerciseFinishedSnapshot[]) => void;
  onTrainerProfileChange?: (profile: TrainerProfile | null) => void;
  onSyncStatusChange?: (status: 'synced' | 'syncing' | 'offline' | 'unauthenticated') => void;
}

class FirestoreSyncService {
  private activeUnsubscribers: Unsubscribe[] = [];
  private currentUserId: string | null = null;
  private isInitialSyncDone = false;
  private currentCallbacks: CloudSyncCallbacks | null = null;
  private lastSyncTimestamp: number = Date.now();
  private isSyncingNow: boolean = false;
  private lastSessionClearedAt: number = 0;

  public subscribe(userId: string, callbacks: CloudSyncCallbacks) {
    this.unsubscribe();
    this.currentUserId = userId;
    this.currentCallbacks = callbacks;
    callbacks.onSyncStatusChange?.('syncing');

    try {
      // 1. Clients listener
      const clientsRef = collection(db, 'users', userId, 'clients');
      const unsubClients = onSnapshot(
        clientsRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Client[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as Client);
            });
            storage.saveClients(list);
            callbacks.onClientsChange?.(list);
          } else {
            // First time cloud sync: seed local data to cloud
            this.seedLocalToCloud(userId);
          }
          callbacks.onSyncStatusChange?.('synced');
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${userId}/clients`);
          callbacks.onSyncStatusChange?.('offline');
        }
      );
      this.activeUnsubscribers.push(unsubClients);

      // 2. Workouts listener
      const workoutsRef = collection(db, 'users', userId, 'workouts');
      const unsubWorkouts = onSnapshot(
        workoutsRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: WorkoutProgram[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as WorkoutProgram);
            });
            storage.saveWorkouts(list);
            callbacks.onWorkoutsChange?.(list);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${userId}/workouts`);
        }
      );
      this.activeUnsubscribers.push(unsubWorkouts);

      // 3. Calendar listener
      const calendarRef = collection(db, 'users', userId, 'calendar');
      const unsubCalendar = onSnapshot(
        calendarRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: CalendarEvent[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as CalendarEvent);
            });
            storage.saveCalendarEvents(list);
            callbacks.onCalendarChange?.(list);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${userId}/calendar`);
        }
      );
      this.activeUnsubscribers.push(unsubCalendar);

      // 4. Completed Workouts History listener
      const completedRef = collection(db, 'users', userId, 'completedWorkouts');
      const unsubCompleted = onSnapshot(
        completedRef,
        (snapshot) => {
          const list: CompletedWorkoutRecord[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as CompletedWorkoutRecord);
          });
          // Sort by completion date descending
          list.sort(
            (a, b) =>
              new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
          );
          if (list.length > 0) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('ironcoach_completed_workouts_v1', JSON.stringify(list));
            }
            callbacks.onCompletedWorkoutsChange?.(list);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${userId}/completedWorkouts`);
        }
      );
      this.activeUnsubscribers.push(unsubCompleted);

      // 5. Active Session & Settings listener
      const sessionDocRef = doc(db, 'users', userId, 'settings', 'activeSession');
      const unsubSession = onSnapshot(
        sessionDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const session = (data?.session as ActiveWorkoutSession | null) ?? null;
            if (session && Date.now() - this.lastSessionClearedAt < 5000) {
              return;
            }
            storage.saveActiveSession(session);
            callbacks.onActiveSessionChange?.(session);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${userId}/settings/activeSession`);
        }
      );
      this.activeUnsubscribers.push(unsubSession);

      // 6. Custom Exercise Database listener
      const exercisesRef = collection(db, 'users', userId, 'customExercises');
      const unsubExercises = onSnapshot(
        exercisesRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: DatabaseExercise[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as DatabaseExercise;
              if (data && data.isCustom) {
                list.push(data);
              }
            });
            storage.saveExerciseDatabase(list);
            callbacks.onExerciseDbChange?.(storage.getExerciseDatabase());
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${userId}/customExercises`);
        }
      );
      this.activeUnsubscribers.push(unsubExercises);

      // 7. Exercise Snapshots with PSE listener
      const snapshotsRef = collection(db, 'users', userId, 'exerciseSnapshots');
      const unsubSnapshots = onSnapshot(
        snapshotsRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: ExerciseFinishedSnapshot[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as ExerciseFinishedSnapshot);
            });
            storage.mergeExerciseSnapshots(list);
            callbacks.onExerciseSnapshotsChange?.(list);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${userId}/exerciseSnapshots`);
        }
      );
      this.activeUnsubscribers.push(unsubSnapshots);

      // 8. Trainer Profile listener
      const profileDocRef = doc(db, 'users', userId, 'settings', 'trainerProfile');
      const unsubProfile = onSnapshot(
        profileDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const profile = (data?.profile as TrainerProfile | null) ?? null;
            if (profile) {
              storage.saveTrainerProfile(profile, userId);
              callbacks.onTrainerProfileChange?.(profile);
              return;
            }
          }
          const localScoped = storage.getTrainerProfile(userId);
          if (localScoped && localScoped.name?.trim() && localScoped.isProfileCompleted) {
            this.syncTrainerProfile(localScoped);
            callbacks.onTrainerProfileChange?.(localScoped);
          } else {
            callbacks.onTrainerProfileChange?.(null);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${userId}/settings/trainerProfile`);
          const localFallback = storage.getTrainerProfile(userId);
          callbacks.onTrainerProfileChange?.(localFallback);
        }
      );
      this.activeUnsubscribers.push(unsubProfile);

      this.isInitialSyncDone = true;
    } catch (err) {
      console.error('Error in subscribeToCloudSync:', err);
      callbacks.onSyncStatusChange?.('offline');
    }
  }

  public unsubscribe() {
    this.activeUnsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        console.error('Error unsubscribing:', e);
      }
    });
    this.activeUnsubscribers = [];
    this.currentUserId = null;
  }

  // Upload initial seed/local data to Firestore if cloud is fresh
  public async seedLocalToCloud(userId: string) {
    try {
      const localClients = storage.getClients();
      const localWorkouts = storage.getWorkouts();
      const localCalendar = storage.getCalendarEvents();
      const localCompleted = storage.getCompletedWorkouts();
      const localExercises = storage.getExerciseDatabase();

      const batch = writeBatch(db);

      localClients.forEach((client) => {
        const ref = doc(db, 'users', userId, 'clients', client.id);
        batch.set(
          ref,
          sanitizeForFirestore({ ...client, userId, updatedAt: new Date().toISOString() }),
          { merge: true }
        );
      });

      localWorkouts.forEach((w) => {
        const ref = doc(db, 'users', userId, 'workouts', w.id);
        batch.set(
          ref,
          sanitizeForFirestore({ ...w, userId, updatedAt: new Date().toISOString() }),
          { merge: true }
        );
      });

      localCalendar.forEach((evt) => {
        const ref = doc(db, 'users', userId, 'calendar', evt.id);
        batch.set(
          ref,
          sanitizeForFirestore({ ...evt, userId, updatedAt: new Date().toISOString() }),
          { merge: true }
        );
      });

      localCompleted.forEach((rec) => {
        const ref = doc(db, 'users', userId, 'completedWorkouts', rec.id);
        batch.set(ref, sanitizeForFirestore({ ...rec, userId }), { merge: true });
      });

      localExercises
        .filter((ex) => ex.isCustom)
        .forEach((ex) => {
          const ref = doc(db, 'users', userId, 'customExercises', ex.id);
          batch.set(ref, sanitizeForFirestore({ ...ex, userId }), { merge: true });
        });

      await batch.commit();
      console.log('Local data successfully seeded to Firestore cloud');
    } catch (error) {
      console.error('Error seeding data to cloud:', error);
    }
  }

  // Cloud Write Methods
  public async syncClient(client: Client) {
    if (!this.currentUserId) return;
    const path = `users/${this.currentUserId}/clients/${client.id}`;
    try {
      await setDoc(
        doc(db, 'users', this.currentUserId, 'clients', client.id),
        sanitizeForFirestore({
          ...client,
          userId: this.currentUserId,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async removeClient(clientId: string) {
    if (!this.currentUserId) return;
    const path = `users/${this.currentUserId}/clients/${clientId}`;
    try {
      await deleteDoc(doc(db, 'users', this.currentUserId, 'clients', clientId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  public async syncWorkout(workout: WorkoutProgram) {
    if (!this.currentUserId) return;
    const path = `users/${this.currentUserId}/workouts/${workout.id}`;
    try {
      await setDoc(
        doc(db, 'users', this.currentUserId, 'workouts', workout.id),
        sanitizeForFirestore({
          ...workout,
          userId: this.currentUserId,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async removeWorkout(workoutId: string) {
    if (!this.currentUserId) return;
    const path = `users/${this.currentUserId}/workouts/${workoutId}`;
    try {
      await deleteDoc(doc(db, 'users', this.currentUserId, 'workouts', workoutId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  public async syncCalendarEvent(event: CalendarEvent) {
    if (!this.currentUserId) return;
    const path = `users/${this.currentUserId}/calendar/${event.id}`;
    try {
      await setDoc(
        doc(db, 'users', this.currentUserId, 'calendar', event.id),
        sanitizeForFirestore({
          ...event,
          userId: this.currentUserId,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async removeCalendarEvent(eventId: string) {
    if (!this.currentUserId) return;
    const path = `users/${this.currentUserId}/calendar/${eventId}`;
    try {
      await deleteDoc(doc(db, 'users', this.currentUserId, 'calendar', eventId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  public async syncCompletedWorkout(record: CompletedWorkoutRecord) {
    if (!this.currentUserId) return;
    const path = `users/${this.currentUserId}/completedWorkouts/${record.id}`;
    try {
      await setDoc(
        doc(db, 'users', this.currentUserId, 'completedWorkouts', record.id),
        sanitizeForFirestore({
          ...record,
          userId: this.currentUserId,
        })
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async removeCompletedWorkout(workoutId: string) {
    if (!this.currentUserId) return;
    const path = `users/${this.currentUserId}/completedWorkouts/${workoutId}`;
    try {
      await deleteDoc(doc(db, 'users', this.currentUserId, 'completedWorkouts', workoutId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  public async syncActiveSession(session: ActiveWorkoutSession | null) {
    if (!session) {
      this.lastSessionClearedAt = Date.now();
    } else {
      this.lastSessionClearedAt = 0;
    }
    if (!this.currentUserId) return;
    const path = `users/${this.currentUserId}/settings/activeSession`;
    try {
      await setDoc(
        doc(db, 'users', this.currentUserId, 'settings', 'activeSession'),
        sanitizeForFirestore({
          session: session || null,
          userId: this.currentUserId,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async syncExerciseDatabase(exercise: DatabaseExercise) {
    if (!this.currentUserId) return;
    const path = `users/${this.currentUserId}/customExercises/${exercise.id}`;
    try {
      await setDoc(
        doc(db, 'users', this.currentUserId, 'customExercises', exercise.id),
        sanitizeForFirestore({
          ...exercise,
          userId: this.currentUserId,
        })
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async removeExerciseFromDatabase(exerciseId: string) {
    if (!this.currentUserId) return;
    const path = `users/${this.currentUserId}/customExercises/${exerciseId}`;
    try {
      await deleteDoc(doc(db, 'users', this.currentUserId, 'customExercises', exerciseId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  public async syncFinishedExerciseSnapshot(snapshot: ExerciseFinishedSnapshot) {
    if (!this.currentUserId) return;
    const path = `users/${this.currentUserId}/exerciseSnapshots/${snapshot.id}`;
    try {
      await setDoc(
        doc(db, 'users', this.currentUserId, 'exerciseSnapshots', snapshot.id),
        sanitizeForFirestore({
          ...snapshot,
          userId: this.currentUserId,
        })
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async syncTrainerProfile(profile: TrainerProfile) {
    const targetUid = this.currentUserId || auth.currentUser?.uid;
    if (!targetUid) return;
    const path = `users/${targetUid}/settings/trainerProfile`;
    try {
      await setDoc(
        doc(db, 'users', targetUid, 'settings', 'trainerProfile'),
        sanitizeForFirestore({
          profile,
          userId: targetUid,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public getLastSyncTimestamp(): number {
    return this.lastSyncTimestamp;
  }

  public isSyncing(): boolean {
    return this.isSyncingNow;
  }

  /**
   * Força a sincronização imediata de todos os dados com o Firestore,
   * recarregando treinos, clientes, agenda e histórico de exercícios com PSE.
   */
  public async forceSync(userId?: string): Promise<{ success: boolean; error?: string; count?: number }> {
    const targetUid = userId || this.currentUserId || auth.currentUser?.uid;
    if (!targetUid) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    if (this.isSyncingNow) {
      return { success: true };
    }

    this.isSyncingNow = true;
    this.currentCallbacks?.onSyncStatusChange?.('syncing');

    try {
      // 1. Forçar busca do histórico completo de treinos concluídos com PSE
      const completedRef = collection(db, 'users', targetUid, 'completedWorkouts');
      const completedSnap = await getDocs(completedRef);
      const completedList: CompletedWorkoutRecord[] = [];
      completedSnap.forEach((docSnap) => {
        completedList.push(docSnap.data() as CompletedWorkoutRecord);
      });
      completedList.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
      if (completedList.length > 0) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('ironcoach_completed_workouts_v1', JSON.stringify(completedList));
        }
        this.currentCallbacks?.onCompletedWorkoutsChange?.(completedList);
      }

      // 2. Forçar busca de snapshots de exercícios ("Concluir e Recolher" com PSE)
      const snapshotsRef = collection(db, 'users', targetUid, 'exerciseSnapshots');
      const snapshotsSnap = await getDocs(snapshotsRef);
      if (!snapshotsSnap.empty) {
        const snapList: ExerciseFinishedSnapshot[] = [];
        snapshotsSnap.forEach((docSnap) => {
          snapList.push(docSnap.data() as ExerciseFinishedSnapshot);
        });
        storage.mergeExerciseSnapshots(snapList);
        this.currentCallbacks?.onExerciseSnapshotsChange?.(snapList);
      }

      // 3. Forçar busca de alunos
      const clientsRef = collection(db, 'users', targetUid, 'clients');
      const clientsSnap = await getDocs(clientsRef);
      if (!clientsSnap.empty) {
        const clientsList: Client[] = [];
        clientsSnap.forEach((docSnap) => {
          clientsList.push(docSnap.data() as Client);
        });
        storage.saveClients(clientsList);
        this.currentCallbacks?.onClientsChange?.(clientsList);
      }

      // 4. Forçar busca de fichas de treino
      const workoutsRef = collection(db, 'users', targetUid, 'workouts');
      const workoutsSnap = await getDocs(workoutsRef);
      if (!workoutsSnap.empty) {
        const workoutsList: WorkoutProgram[] = [];
        workoutsSnap.forEach((docSnap) => {
          workoutsList.push(docSnap.data() as WorkoutProgram);
        });
        storage.saveWorkouts(workoutsList);
        this.currentCallbacks?.onWorkoutsChange?.(workoutsList);
      }

      // 5. Forçar busca da agenda
      const calendarRef = collection(db, 'users', targetUid, 'calendar');
      const calendarSnap = await getDocs(calendarRef);
      if (!calendarSnap.empty) {
        const calendarList: CalendarEvent[] = [];
        calendarSnap.forEach((docSnap) => {
          calendarList.push(docSnap.data() as CalendarEvent);
        });
        storage.saveCalendarEvents(calendarList);
        this.currentCallbacks?.onCalendarChange?.(calendarList);
      }

      // 6. Forçar busca da sessão ativa
      const sessionDocRef = doc(db, 'users', targetUid, 'settings', 'activeSession');
      const sessionSnap = await getDoc(sessionDocRef);
      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        const session = (data?.session as ActiveWorkoutSession | null) ?? null;
        if (!(session && Date.now() - this.lastSessionClearedAt < 5000)) {
          storage.saveActiveSession(session);
          this.currentCallbacks?.onActiveSessionChange?.(session);
        }
      }

      // 7. Forçar busca do banco de exercícios customizados
      const exercisesRef = collection(db, 'users', targetUid, 'customExercises');
      const exercisesSnap = await getDocs(exercisesRef);
      if (!exercisesSnap.empty) {
        const exercisesList: DatabaseExercise[] = [];
        exercisesSnap.forEach((docSnap) => {
          const data = docSnap.data() as DatabaseExercise;
          if (data && data.isCustom) {
            exercisesList.push(data);
          }
        });
        storage.saveExerciseDatabase(exercisesList);
        this.currentCallbacks?.onExerciseDbChange?.(storage.getExerciseDatabase());
      }

      this.lastSyncTimestamp = Date.now();
      this.currentCallbacks?.onSyncStatusChange?.('synced');

      // Disparar evento global para todos os componentes reagirem à atualização
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('ironcoach:data-synced', {
            detail: { timestamp: new Date().toISOString(), userId: targetUid },
          })
        );
      }

      return { success: true, count: completedList.length };
    } catch (err) {
      console.error('Error during forceSync with Firestore:', err);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return { success: false, error: String(err) };
    } finally {
      this.isSyncingNow = false;
    }
  }
}

export const cloudSync = new FirestoreSyncService();
