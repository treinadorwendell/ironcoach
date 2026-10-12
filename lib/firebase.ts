import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  getFirestore,
  doc,
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
  path: string | null
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
  throw new Error(JSON.stringify(errInfo));
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
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-Out Error:', error);
    throw error;
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
  onSyncStatusChange?: (status: 'synced' | 'syncing' | 'offline' | 'unauthenticated') => void;
}

class FirestoreSyncService {
  private activeUnsubscribers: Unsubscribe[] = [];
  private currentUserId: string | null = null;
  private isInitialSyncDone = false;

  public subscribe(userId: string, callbacks: CloudSyncCallbacks) {
    this.unsubscribe();
    this.currentUserId = userId;
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
            const session = data?.session as ActiveWorkoutSession | null;
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
              list.push(docSnap.data() as DatabaseExercise);
            });
            storage.saveExerciseDatabase(list);
            callbacks.onExerciseDbChange?.(list);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${userId}/customExercises`);
        }
      );
      this.activeUnsubscribers.push(unsubExercises);

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
        batch.set(ref, { ...client, userId, updatedAt: new Date().toISOString() }, { merge: true });
      });

      localWorkouts.forEach((w) => {
        const ref = doc(db, 'users', userId, 'workouts', w.id);
        batch.set(ref, { ...w, userId, updatedAt: new Date().toISOString() }, { merge: true });
      });

      localCalendar.forEach((evt) => {
        const ref = doc(db, 'users', userId, 'calendar', evt.id);
        batch.set(ref, { ...evt, userId, updatedAt: new Date().toISOString() }, { merge: true });
      });

      localCompleted.forEach((rec) => {
        const ref = doc(db, 'users', userId, 'completedWorkouts', rec.id);
        batch.set(ref, { ...rec, userId }, { merge: true });
      });

      localExercises.forEach((ex) => {
        const ref = doc(db, 'users', userId, 'customExercises', ex.id);
        batch.set(ref, { ...ex, userId }, { merge: true });
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
      await setDoc(doc(db, 'users', this.currentUserId, 'clients', client.id), {
        ...client,
        userId: this.currentUserId,
        updatedAt: new Date().toISOString(),
      });
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
      await setDoc(doc(db, 'users', this.currentUserId, 'workouts', workout.id), {
        ...workout,
        userId: this.currentUserId,
        updatedAt: new Date().toISOString(),
      });
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
      await setDoc(doc(db, 'users', this.currentUserId, 'calendar', event.id), {
        ...event,
        userId: this.currentUserId,
        updatedAt: new Date().toISOString(),
      });
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
      await setDoc(doc(db, 'users', this.currentUserId, 'completedWorkouts', record.id), {
        ...record,
        userId: this.currentUserId,
      });
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
    if (!this.currentUserId) return;
    const path = `users/${this.currentUserId}/settings/activeSession`;
    try {
      await setDoc(doc(db, 'users', this.currentUserId, 'settings', 'activeSession'), {
        session: session || null,
        userId: this.currentUserId,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async syncExerciseDatabase(exercise: DatabaseExercise) {
    if (!this.currentUserId) return;
    const path = `users/${this.currentUserId}/customExercises/${exercise.id}`;
    try {
      await setDoc(doc(db, 'users', this.currentUserId, 'customExercises', exercise.id), {
        ...exercise,
        userId: this.currentUserId,
      });
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
}

export const cloudSync = new FirestoreSyncService();
