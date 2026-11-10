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
  disableNetwork,
  enableNetwork,
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
  ClientDietPlan,
  NutritionProfessionalLibrary,
  StudentAccessAccount,
  StudentSessionContext,
  PendingSyncOperation,
} from '@/types';
import { storage, isStudentAccessComplete } from './storage';

export function normalizeStudentEmailKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '');
}

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

let isFirestoreQuotaExhausted = false;
let hasLoggedQuotaExhaustedNotice = false;

export function isQuotaExhaustedError(error: unknown): boolean {
  if (!error) return false;
  const code = (error as { code?: string })?.code || '';
  const msg = error instanceof Error ? error.message : String(error);
  return (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded')
  );
}

function triggerQuotaCircuitBreaker() {
  if (!isFirestoreQuotaExhausted) {
    isFirestoreQuotaExhausted = true;
    disableNetwork(db).catch(() => {});
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('ironcoach:quota-exhausted', {
          detail: { timestamp: new Date().toISOString() },
        })
      );
    }
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  shouldThrow: boolean = false
) {
  if (isQuotaExhaustedError(error)) {
    triggerQuotaCircuitBreaker();
    if (!hasLoggedQuotaExhaustedNotice) {
      hasLoggedQuotaExhaustedNotice = true;
      console.warn(
        'Limite diário gratuito do Firestore atingido (resource-exhausted). Operando em modo Local-First (localStorage) sem retentativas em loop.'
      );
    }
    return;
  }

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

export async function loginExclusiveStudent(
  email: string,
  password: string
): Promise<{ user: User; studentSession: StudentSessionContext }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();
  const emailKey = normalizeStudentEmailKey(cleanEmail);

  if (!emailKey || !cleanEmail.includes('@')) {
    throw new Error('Informe o e-mail válido cadastrado pelo seu treinador.');
  }
  if (!cleanPassword || cleanPassword.length < 6) {
    throw new Error('Informe a senha gerada pelo seu treinador (mínimo de 6 caracteres).');
  }

  // 1. Consultar registro do aluno no diretório na nuvem (studentAccounts) ou no armazenamento local
  let accountRecord: StudentAccessAccount | null = null;
  try {
    const snap = await getDoc(doc(db, 'studentAccounts', emailKey));
    if (snap.exists()) {
      accountRecord = snap.data() as StudentAccessAccount;
    }
  } catch (err) {
    console.warn('Could not query studentAccounts from Firestore, checking local clients:', err);
  }

  // Fallback / verificação complementar na lista local de clientes
  if (!accountRecord) {
    const localClients = storage.getClients();
    const matchedLocal = localClients.find(
      (c) => c.email.trim().toLowerCase() === cleanEmail
    );
    if (matchedLocal) {
      if (!isStudentAccessComplete(matchedLocal)) {
        throw new Error(
          'Seu cadastro ainda está incompleto. O treinador precisa preencher Nome completo, Data de nascimento, E-mail, Telefone e gerar sua senha de acesso.'
        );
      }
      accountRecord = {
        clientId: matchedLocal.id,
        trainerUid: matchedLocal.trainerUid || auth.currentUser?.uid || 'local-trainer',
        name: matchedLocal.name.trim(),
        birthDate: matchedLocal.birthDate.trim(),
        email: matchedLocal.email.trim().toLowerCase(),
        phone: (matchedLocal.phone || '').trim(),
        accessPassword: (matchedLocal.accessPassword || '').trim(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  if (!accountRecord) {
    throw new Error(
      'Acesso negado: Este e-mail não foi encontrado. Você só pode acessar a plataforma após o Treinador cadastrar seu Nome completo, Data de nascimento, E-mail, Telefone e gerar sua senha.'
    );
  }

  // 2. Validar obrigatoriamente os 4 dados cadastrais + senha gerada pelo treinador
  const hasAllFourFields =
    Boolean(accountRecord.name && accountRecord.name.trim().length >= 3) &&
    Boolean(accountRecord.birthDate && accountRecord.birthDate.trim().length >= 8) &&
    Boolean(accountRecord.email && accountRecord.email.includes('@')) &&
    Boolean(accountRecord.phone && accountRecord.phone.replace(/\D/g, '').length >= 8) &&
    Boolean(accountRecord.accessPassword && accountRecord.accessPassword.trim().length >= 6);

  if (!hasAllFourFields) {
    throw new Error(
      'Seu cadastro está pendente de conclusão pelo treinador. Solicite que ele confira seu Nome completo, Data de nascimento, E-mail, Telefone e Senha.'
    );
  }

  if (accountRecord.accessPassword.trim() !== cleanPassword) {
    throw new Error('Senha incorreta. Utilize a senha exclusiva gerada pelo seu treinador.');
  }

  // 3. Autenticar ou provisionar sessão no Firebase Auth para sincronização em tempo real
  let authenticatedUser: User | null = null;
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
    authenticatedUser = cred.user;
  } catch (signInErr: unknown) {
    const errCode = (signInErr as { code?: string })?.code || '';
    if (
      errCode === 'auth/user-not-found' ||
      errCode === 'auth/invalid-credential' ||
      errCode === 'auth/wrong-password'
    ) {
      try {
        const created = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        try {
          await updateProfile(created.user, { displayName: accountRecord.name });
        } catch {
          // ignore displayName error
        }
        authenticatedUser = created.user;
      } catch (createErr: unknown) {
        const createCode = (createErr as { code?: string })?.code || '';
        // Se o e-mail já existe no Firebase Auth com outra senha anterior (ex: treinador gerou nova senha)
        if (createCode === 'auth/email-already-in-use' && auth.currentUser) {
          authenticatedUser = auth.currentUser;
        } else if (createCode === 'auth/email-already-in-use') {
          throw new Error(
            'A senha foi atualizada pelo treinador, mas este e-mail já possuía uma senha anterior no Firebase Auth. Use a senha original ou peça ao treinador para usar um novo e-mail.'
          );
        } else {
          throw createErr;
        }
      }
    } else {
      throw signInErr;
    }
  }

  if (!authenticatedUser) {
    throw new Error('Não foi possível estabelecer a sessão do aluno.');
  }

  const studentSession: StudentSessionContext = {
    clientId: accountRecord.clientId,
    trainerUid: accountRecord.trainerUid,
    email: accountRecord.email,
    name: accountRecord.name,
    birthDate: accountRecord.birthDate,
    phone: accountRecord.phone,
  };

  storage.saveStudentSession(studentSession);
  storage.saveAppRole('student');
  storage.saveActiveStudentId(accountRecord.clientId);

  return { user: authenticatedUser, studentSession };
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
  private isProcessingQueue: boolean = false;
  private lastSessionClearedAt: number = 0;
  private queueRetryTimer: ReturnType<typeof setInterval> | null = null;
  private activeSessionDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastWrittenPayloadHashes: Map<string, string> = new Map();
  private seededUserIds: Set<string> = new Set();
  private syncedTrainerProfileUserIds: Set<string> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (isFirestoreQuotaExhausted) return;
        this.processPendingQueue().then(() => {
          if (this.currentUserId && !isFirestoreQuotaExhausted) {
            this.forceSync(this.currentUserId);
          }
        });
      });

      this.queueRetryTimer = setInterval(() => {
        if (
          !isFirestoreQuotaExhausted &&
          typeof navigator !== 'undefined' &&
          navigator.onLine &&
          (this.currentUserId || auth.currentUser?.uid) &&
          storage.getPendingOperations().length > 0
        ) {
          this.processPendingQueue();
        }
      }, 60000);
    }
  }

  public isQuotaExhausted(): boolean {
    return isFirestoreQuotaExhausted;
  }

  public async resetQuotaCircuitBreaker(): Promise<void> {
    isFirestoreQuotaExhausted = false;
    hasLoggedQuotaExhaustedNotice = false;
    await enableNetwork(db).catch(() => {});
  }

  private isNetworkOnline(): boolean {
    if (isFirestoreQuotaExhausted) return false;
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  }

  private normalizeForHash(payload: unknown): string {
    try {
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const { updatedAt: _u, userId: _uid, ...rest } = payload as Record<string, unknown>;
        return JSON.stringify(rest);
      }
      return JSON.stringify(payload);
    } catch {
      return '';
    }
  }

  private hasPayloadChanged(docKey: string, payload: unknown): boolean {
    const serialized = this.normalizeForHash(payload);
    if (!serialized) return true;
    return this.lastWrittenPayloadHashes.get(docKey) !== serialized;
  }

  private recordPayloadHash(docKey: string, payload: unknown): void {
    const serialized = this.normalizeForHash(payload);
    if (serialized) {
      this.lastWrittenPayloadHashes.set(docKey, serialized);
    }
  }

  public getPendingQueueCount(): number {
    return storage.getPendingOperations().length;
  }

  public subscribe(userId: string, callbacks: CloudSyncCallbacks) {
    this.unsubscribe();
    this.currentUserId = userId;
    this.currentCallbacks = callbacks;

    if (isFirestoreQuotaExhausted) {
      callbacks.onSyncStatusChange?.('offline');
      return;
    }

    callbacks.onSyncStatusChange?.('syncing');

    // Flush any pending offline operations first when subscribing
    if (this.isNetworkOnline() && storage.getPendingOperations().length > 0) {
      this.processPendingQueue(userId);
    }

    try {
      // 1. Clients listener (merged with offline queue)
      const clientsRef = collection(db, 'users', userId, 'clients');
      const unsubClients = onSnapshot(
        clientsRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Client[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as Client;
              this.recordPayloadHash(`users/${userId}/clients/${data.id}`, data);
              list.push(data);
            });
            const merged = storage.mergeClients(list);
            callbacks.onClientsChange?.(merged);
          } else if (
            !snapshot.metadata.fromCache &&
            !this.seededUserIds.has(userId) &&
            !isFirestoreQuotaExhausted
          ) {
            // First time cloud sync: seed local data to cloud once
            this.seededUserIds.add(userId);
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

      // 2. Workouts listener (merged with offline queue)
      const workoutsRef = collection(db, 'users', userId, 'workouts');
      const unsubWorkouts = onSnapshot(
        workoutsRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: WorkoutProgram[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as WorkoutProgram;
              this.recordPayloadHash(`users/${userId}/workouts/${data.id}`, data);
              list.push(data);
            });
            const merged = storage.mergeWorkouts(list);
            callbacks.onWorkoutsChange?.(merged);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${userId}/workouts`);
        }
      );
      this.activeUnsubscribers.push(unsubWorkouts);

      // 3. Calendar listener (merged with offline queue)
      const calendarRef = collection(db, 'users', userId, 'calendar');
      const unsubCalendar = onSnapshot(
        calendarRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: CalendarEvent[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as CalendarEvent;
              this.recordPayloadHash(`users/${userId}/calendar/${data.id}`, data);
              list.push(data);
            });
            const merged = storage.mergeCalendarEvents(list);
            callbacks.onCalendarChange?.(merged);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${userId}/calendar`);
        }
      );
      this.activeUnsubscribers.push(unsubCalendar);

      // 4. Completed Workouts History listener (merged with local Data Persist & offline queue)
      const completedRef = collection(db, 'users', userId, 'completedWorkouts');
      const unsubCompleted = onSnapshot(
        completedRef,
        (snapshot) => {
          const list: CompletedWorkoutRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as CompletedWorkoutRecord;
            this.recordPayloadHash(`users/${userId}/completedWorkouts/${data.id}`, data);
            list.push(data);
          });
          const merged = storage.mergeCompletedWorkouts(list);
          if (merged.length > 0) {
            callbacks.onCompletedWorkoutsChange?.(merged);
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
            this.recordPayloadHash(`users/${userId}/settings/activeSession`, session);
            if (session && Date.now() - this.lastSessionClearedAt < 5000) {
              return;
            }
            const localCurrent = storage.getActiveSession();
            if (localCurrent && localCurrent.isStarted) {
              return;
            }
            storage.saveActiveSession(session);
            callbacks.onActiveSessionChange?.(session);
          } else {
            this.recordPayloadHash(`users/${userId}/settings/activeSession`, null);
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

      // 8. Diet Plans listener (so students receive their prescribed diet in real time)
      const dietPlansRef = collection(db, 'users', userId, 'dietPlans');
      const unsubDietPlans = onSnapshot(
        dietPlansRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const plans: ClientDietPlan[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as ClientDietPlan;
              this.recordPayloadHash(`users/${userId}/dietPlans/${data.id}`, data);
              plans.push(data);
            });
            storage.saveDietPlans(plans);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('ironcoach:data-synced'));
            }
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${userId}/dietPlans`);
        }
      );
      this.activeUnsubscribers.push(unsubDietPlans);

      // 9. Trainer Profile listener
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
            if (
              !docSnap.metadata.fromCache &&
              !this.syncedTrainerProfileUserIds.has(userId) &&
              !isFirestoreQuotaExhausted
            ) {
              this.syncedTrainerProfileUserIds.add(userId);
              this.syncTrainerProfile(localScoped);
            }
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
    if (!this.isNetworkOnline()) return;
    try {
      const localClients = storage.getClients();
      const localWorkouts = storage.getWorkouts();
      const localCalendar = storage.getCalendarEvents();
      const localCompleted = storage.getCompletedWorkouts();
      const localExercises = storage.getExerciseDatabase().filter((ex) => ex.isCustom);

      const hasAnyData =
        localClients.length > 0 ||
        localWorkouts.length > 0 ||
        localCalendar.length > 0 ||
        localCompleted.length > 0 ||
        localExercises.length > 0;

      if (!hasAnyData) return;

      const batch = writeBatch(db);

      localClients.forEach((client) => {
        const ref = doc(db, 'users', userId, 'clients', client.id);
        batch.set(
          ref,
          sanitizeForFirestore({ ...client, userId, trainerUid: userId, updatedAt: new Date().toISOString() }),
          { merge: true }
        );
        if (isStudentAccessComplete(client)) {
          const emailKey = normalizeStudentEmailKey(client.email);
          if (emailKey) {
            const studentRef = doc(db, 'studentAccounts', emailKey);
            const studentAcc: StudentAccessAccount = {
              clientId: client.id,
              trainerUid: userId,
              name: client.name.trim(),
              birthDate: client.birthDate.trim(),
              email: client.email.trim().toLowerCase(),
              phone: (client.phone || '').trim(),
              accessPassword: (client.accessPassword || '').trim(),
              updatedAt: new Date().toISOString(),
            };
            batch.set(studentRef, sanitizeForFirestore(studentAcc), { merge: true });
          }
        }
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

      localExercises.forEach((ex) => {
        const ref = doc(db, 'users', userId, 'customExercises', ex.id);
        batch.set(ref, sanitizeForFirestore({ ...ex, userId }), { merge: true });
      });

      await batch.commit();
      console.log('Local data successfully seeded to Firestore cloud');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/seed`);
    }
  }

  // Cloud Write Methods with Write-Ahead Offline Queueing
  private async writeClientToFirestore(
    targetUid: string,
    client: Client,
    previousEmail?: string
  ) {
    await setDoc(
      doc(db, 'users', targetUid, 'clients', client.id),
      sanitizeForFirestore({
        ...client,
        userId: targetUid,
        trainerUid: targetUid,
        updatedAt: new Date().toISOString(),
      })
    );

    if (
      previousEmail &&
      previousEmail.trim().toLowerCase() !== client.email.trim().toLowerCase()
    ) {
      const oldKey = normalizeStudentEmailKey(previousEmail);
      if (oldKey) {
        await deleteDoc(doc(db, 'studentAccounts', oldKey)).catch(() => {});
      }
    }

    const emailKey = normalizeStudentEmailKey(client.email);
    if (emailKey && isStudentAccessComplete(client)) {
      const studentAcc: StudentAccessAccount = {
        clientId: client.id,
        trainerUid: targetUid,
        name: client.name.trim(),
        birthDate: client.birthDate.trim(),
        email: client.email.trim().toLowerCase(),
        phone: (client.phone || '').trim(),
        accessPassword: (client.accessPassword || '').trim(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'studentAccounts', emailKey), sanitizeForFirestore(studentAcc));
    }
  }

  public async syncClient(client: Client, previousEmail?: string) {
    const targetUid = this.currentUserId || client.trainerUid || auth.currentUser?.uid;
    const path = targetUid ? `users/${targetUid}/clients/${client.id}` : '';
    if (path && !previousEmail && !this.hasPayloadChanged(path, client)) {
      return;
    }

    const queuedOp = storage.enqueuePendingOperation({
      type: 'UPSERT_CLIENT',
      entityId: client.id,
      payload: client,
      previousEmail,
    });

    if (!targetUid || !this.isNetworkOnline()) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return;
    }

    try {
      await this.writeClientToFirestore(targetUid, client, previousEmail);
      this.recordPayloadHash(path, client);
      storage.removePendingOperation(queuedOp.id);
    } catch (error) {
      storage.markPendingOperationAttempt(queuedOp.id);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async removeClient(clientId: string, clientEmail?: string) {
    const queuedOp = storage.enqueuePendingOperation({
      type: 'DELETE_CLIENT',
      entityId: clientId,
      payload: { clientId, clientEmail },
      clientEmail,
    });

    const targetUid = this.currentUserId || auth.currentUser?.uid;
    if (!targetUid || !this.isNetworkOnline()) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return;
    }

    const path = `users/${targetUid}/clients/${clientId}`;
    try {
      await deleteDoc(doc(db, 'users', targetUid, 'clients', clientId));
      if (clientEmail) {
        const emailKey = normalizeStudentEmailKey(clientEmail);
        if (emailKey) {
          await deleteDoc(doc(db, 'studentAccounts', emailKey)).catch(() => {});
        }
      }
      this.lastWrittenPayloadHashes.delete(path);
      storage.removePendingOperation(queuedOp.id);
    } catch (error) {
      storage.markPendingOperationAttempt(queuedOp.id);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  public async syncWorkout(workout: WorkoutProgram) {
    const targetUid = this.currentUserId || auth.currentUser?.uid;
    const path = targetUid ? `users/${targetUid}/workouts/${workout.id}` : '';
    if (path && !this.hasPayloadChanged(path, workout)) {
      return;
    }

    const queuedOp = storage.enqueuePendingOperation({
      type: 'UPSERT_WORKOUT',
      entityId: workout.id,
      payload: workout,
    });

    if (!targetUid || !this.isNetworkOnline()) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return;
    }

    try {
      await setDoc(
        doc(db, 'users', targetUid, 'workouts', workout.id),
        sanitizeForFirestore({
          ...workout,
          userId: targetUid,
          updatedAt: new Date().toISOString(),
        })
      );
      this.recordPayloadHash(path, workout);
      storage.removePendingOperation(queuedOp.id);
    } catch (error) {
      storage.markPendingOperationAttempt(queuedOp.id);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async removeWorkout(workoutId: string) {
    const queuedOp = storage.enqueuePendingOperation({
      type: 'DELETE_WORKOUT',
      entityId: workoutId,
      payload: { workoutId },
    });

    const targetUid = this.currentUserId || auth.currentUser?.uid;
    if (!targetUid || !this.isNetworkOnline()) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return;
    }

    const path = `users/${targetUid}/workouts/${workoutId}`;
    try {
      await deleteDoc(doc(db, 'users', targetUid, 'workouts', workoutId));
      this.lastWrittenPayloadHashes.delete(path);
      storage.removePendingOperation(queuedOp.id);
    } catch (error) {
      storage.markPendingOperationAttempt(queuedOp.id);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  public async syncCalendarEvent(event: CalendarEvent) {
    const targetUid = this.currentUserId || auth.currentUser?.uid;
    const path = targetUid ? `users/${targetUid}/calendar/${event.id}` : '';
    if (path && !this.hasPayloadChanged(path, event)) {
      return;
    }

    const queuedOp = storage.enqueuePendingOperation({
      type: 'UPSERT_CALENDAR_EVENT',
      entityId: event.id,
      payload: event,
    });

    if (!targetUid || !this.isNetworkOnline()) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return;
    }

    try {
      await setDoc(
        doc(db, 'users', targetUid, 'calendar', event.id),
        sanitizeForFirestore({
          ...event,
          userId: targetUid,
          updatedAt: new Date().toISOString(),
        })
      );
      this.recordPayloadHash(path, event);
      storage.removePendingOperation(queuedOp.id);
    } catch (error) {
      storage.markPendingOperationAttempt(queuedOp.id);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async syncCalendarEventsBatch(events: CalendarEvent[]) {
    if (!events || events.length === 0) return;
    if (events.length === 1) {
      await this.syncCalendarEvent(events[0]);
      return;
    }

    const targetUid = this.currentUserId || auth.currentUser?.uid;
    const changedEvents = events.filter((evt) => {
      if (!targetUid) return true;
      return this.hasPayloadChanged(`users/${targetUid}/calendar/${evt.id}`, evt);
    });
    if (changedEvents.length === 0) return;

    const queuedOps = changedEvents.map((evt) =>
      storage.enqueuePendingOperation({
        type: 'UPSERT_CALENDAR_EVENT',
        entityId: evt.id,
        payload: evt,
      })
    );

    if (!targetUid || !this.isNetworkOnline()) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return;
    }

    const path = `users/${targetUid}/calendar/batch`;
    try {
      const batch = writeBatch(db);
      const nowIso = new Date().toISOString();
      changedEvents.forEach((evt) => {
        const ref = doc(db, 'users', targetUid, 'calendar', evt.id);
        batch.set(
          ref,
          sanitizeForFirestore({
            ...evt,
            userId: targetUid,
            updatedAt: nowIso,
          })
        );
      });
      await batch.commit();
      changedEvents.forEach((evt) => {
        this.recordPayloadHash(`users/${targetUid}/calendar/${evt.id}`, evt);
      });
      queuedOps.forEach((op) => storage.removePendingOperation(op.id));
    } catch (error) {
      queuedOps.forEach((op) => storage.markPendingOperationAttempt(op.id));
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async removeCalendarEvent(eventId: string) {
    const queuedOp = storage.enqueuePendingOperation({
      type: 'DELETE_CALENDAR_EVENT',
      entityId: eventId,
      payload: { eventId },
    });

    const targetUid = this.currentUserId || auth.currentUser?.uid;
    if (!targetUid || !this.isNetworkOnline()) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return;
    }

    const path = `users/${targetUid}/calendar/${eventId}`;
    try {
      await deleteDoc(doc(db, 'users', targetUid, 'calendar', eventId));
      this.lastWrittenPayloadHashes.delete(path);
      storage.removePendingOperation(queuedOp.id);
    } catch (error) {
      storage.markPendingOperationAttempt(queuedOp.id);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  public async syncCompletedWorkout(record: CompletedWorkoutRecord) {
    const targetUid = this.currentUserId || auth.currentUser?.uid;
    const path = targetUid ? `users/${targetUid}/completedWorkouts/${record.id}` : '';
    if (path && !this.hasPayloadChanged(path, record)) {
      return;
    }

    const queuedOp = storage.enqueuePendingOperation({
      type: 'UPSERT_COMPLETED_WORKOUT',
      entityId: record.id,
      payload: record,
    });

    if (!targetUid || !this.isNetworkOnline()) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return;
    }

    try {
      await setDoc(
        doc(db, 'users', targetUid, 'completedWorkouts', record.id),
        sanitizeForFirestore({
          ...record,
          userId: targetUid,
        })
      );
      this.recordPayloadHash(path, record);
      storage.removePendingOperation(queuedOp.id);
    } catch (error) {
      storage.markPendingOperationAttempt(queuedOp.id);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async removeCompletedWorkout(workoutId: string) {
    const queuedOp = storage.enqueuePendingOperation({
      type: 'DELETE_COMPLETED_WORKOUT',
      entityId: workoutId,
      payload: { workoutId },
    });

    const targetUid = this.currentUserId || auth.currentUser?.uid;
    if (!targetUid || !this.isNetworkOnline()) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return;
    }

    const path = `users/${targetUid}/completedWorkouts/${workoutId}`;
    try {
      await deleteDoc(doc(db, 'users', targetUid, 'completedWorkouts', workoutId));
      this.lastWrittenPayloadHashes.delete(path);
      storage.removePendingOperation(queuedOp.id);
    } catch (error) {
      storage.markPendingOperationAttempt(queuedOp.id);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  public async syncActiveSession(
    session: ActiveWorkoutSession | null,
    _immediate: boolean = false
  ) {
    if (!session) {
      this.lastSessionClearedAt = Date.now();
    } else {
      this.lastSessionClearedAt = 0;
    }

    if (this.activeSessionDebounceTimer) {
      clearTimeout(this.activeSessionDebounceTimer);
      this.activeSessionDebounceTimer = null;
    }

    // Active workout execution is saved 100% locally in localStorage;
    // Only clear cloud activeSession if one previously existed in Firestore.
    if (session !== null) {
      return;
    }

    const targetUid = this.currentUserId || auth.currentUser?.uid;
    const path = targetUid ? `users/${targetUid}/settings/activeSession` : '';
    const lastHash = path ? this.lastWrittenPayloadHashes.get(path) : undefined;
    if (!lastHash || lastHash === 'null') {
      return;
    }

    const queuedOp = storage.enqueuePendingOperation({
      type: 'UPSERT_ACTIVE_SESSION',
      entityId: 'activeSession',
      payload: null,
    });

    if (!targetUid || !this.isNetworkOnline()) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return;
    }

    try {
      await setDoc(
        doc(db, 'users', targetUid, 'settings', 'activeSession'),
        sanitizeForFirestore({
          session: null,
          userId: targetUid,
          updatedAt: new Date().toISOString(),
        })
      );
      this.recordPayloadHash(path, null);
      storage.removePendingOperation(queuedOp.id);
    } catch (error) {
      storage.markPendingOperationAttempt(queuedOp.id);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async syncExerciseDatabase(exercise: DatabaseExercise) {
    const queuedOp = storage.enqueuePendingOperation({
      type: 'UPSERT_CUSTOM_EXERCISE',
      entityId: exercise.id,
      payload: exercise,
    });

    const targetUid = this.currentUserId || auth.currentUser?.uid;
    if (!targetUid || !this.isNetworkOnline()) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return;
    }

    const path = `users/${targetUid}/customExercises/${exercise.id}`;
    try {
      await setDoc(
        doc(db, 'users', targetUid, 'customExercises', exercise.id),
        sanitizeForFirestore({
          ...exercise,
          userId: targetUid,
        })
      );
      storage.removePendingOperation(queuedOp.id);
    } catch (error) {
      storage.markPendingOperationAttempt(queuedOp.id);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async removeExerciseFromDatabase(exerciseId: string) {
    const queuedOp = storage.enqueuePendingOperation({
      type: 'DELETE_CUSTOM_EXERCISE',
      entityId: exerciseId,
      payload: { exerciseId },
    });

    const targetUid = this.currentUserId || auth.currentUser?.uid;
    if (!targetUid || !this.isNetworkOnline()) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return;
    }

    const path = `users/${targetUid}/customExercises/${exerciseId}`;
    try {
      await deleteDoc(doc(db, 'users', targetUid, 'customExercises', exerciseId));
      storage.removePendingOperation(queuedOp.id);
    } catch (error) {
      storage.markPendingOperationAttempt(queuedOp.id);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  public async syncFinishedExerciseSnapshot(snapshot: ExerciseFinishedSnapshot) {
    const queuedOp = storage.enqueuePendingOperation({
      type: 'UPSERT_EXERCISE_SNAPSHOT',
      entityId: snapshot.id,
      payload: snapshot,
    });

    const targetUid = this.currentUserId || auth.currentUser?.uid;
    if (!targetUid || !this.isNetworkOnline()) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return;
    }

    const path = `users/${targetUid}/exerciseSnapshots/${snapshot.id}`;
    try {
      await setDoc(
        doc(db, 'users', targetUid, 'exerciseSnapshots', snapshot.id),
        sanitizeForFirestore({
          ...snapshot,
          userId: targetUid,
        })
      );
      storage.removePendingOperation(queuedOp.id);
    } catch (error) {
      storage.markPendingOperationAttempt(queuedOp.id);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async syncTrainerProfile(profile: TrainerProfile) {
    const queuedOp = storage.enqueuePendingOperation({
      type: 'UPSERT_TRAINER_PROFILE',
      entityId: 'trainerProfile',
      payload: profile,
    });

    const targetUid = this.currentUserId || auth.currentUser?.uid;
    if (!targetUid || !this.isNetworkOnline()) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return;
    }

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
      storage.removePendingOperation(queuedOp.id);
    } catch (error) {
      storage.markPendingOperationAttempt(queuedOp.id);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async syncDietPlan(plan: ClientDietPlan) {
    const targetUid = this.currentUserId || auth.currentUser?.uid;
    const path = targetUid ? `users/${targetUid}/dietPlans/${plan.id}` : '';
    if (path && !this.hasPayloadChanged(path, plan)) {
      return;
    }

    const queuedOp = storage.enqueuePendingOperation({
      type: 'UPSERT_DIET_PLAN',
      entityId: plan.id,
      payload: plan,
    });

    if (!targetUid || !this.isNetworkOnline()) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return;
    }

    try {
      await setDoc(
        doc(db, 'users', targetUid, 'dietPlans', plan.id),
        sanitizeForFirestore({
          ...plan,
          userId: targetUid,
          updatedAt: new Date().toISOString(),
        })
      );
      this.recordPayloadHash(path, plan);
      storage.removePendingOperation(queuedOp.id);
    } catch (error) {
      storage.markPendingOperationAttempt(queuedOp.id);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async removeDietPlan(planId: string) {
    const queuedOp = storage.enqueuePendingOperation({
      type: 'DELETE_DIET_PLAN',
      entityId: planId,
      payload: { planId },
    });

    const targetUid = this.currentUserId || auth.currentUser?.uid;
    if (!targetUid || !this.isNetworkOnline()) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return;
    }

    const path = `users/${targetUid}/dietPlans/${planId}`;
    try {
      await deleteDoc(doc(db, 'users', targetUid, 'dietPlans', planId));
      storage.removePendingOperation(queuedOp.id);
    } catch (error) {
      storage.markPendingOperationAttempt(queuedOp.id);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  public async syncNutritionLibrary(library: NutritionProfessionalLibrary) {
    const queuedOp = storage.enqueuePendingOperation({
      type: 'UPSERT_NUTRITION_LIBRARY',
      entityId: 'nutritionLibrary',
      payload: library,
    });

    const targetUid = this.currentUserId || auth.currentUser?.uid;
    if (!targetUid || !this.isNetworkOnline()) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return;
    }

    const path = `users/${targetUid}/settings/nutritionLibrary`;
    try {
      await setDoc(
        doc(db, 'users', targetUid, 'settings', 'nutritionLibrary'),
        sanitizeForFirestore({
          library,
          userId: targetUid,
          updatedAt: new Date().toISOString(),
        })
      );
      storage.removePendingOperation(queuedOp.id);
    } catch (error) {
      storage.markPendingOperationAttempt(queuedOp.id);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Executa uma operação individual da fila pendente no Firestore.
   */
  private async executeQueuedOperation(
    op: PendingSyncOperation,
    targetUid: string
  ): Promise<void> {
    switch (op.type) {
      case 'UPSERT_CLIENT': {
        const client = op.payload as Client;
        const resolvedUid = client.trainerUid || targetUid;
        await this.writeClientToFirestore(resolvedUid, client, op.previousEmail);
        break;
      }
      case 'DELETE_CLIENT': {
        const clientId = op.entityId;
        await deleteDoc(doc(db, 'users', targetUid, 'clients', clientId));
        if (op.clientEmail) {
          const emailKey = normalizeStudentEmailKey(op.clientEmail);
          if (emailKey) {
            await deleteDoc(doc(db, 'studentAccounts', emailKey)).catch(() => {});
          }
        }
        break;
      }
      case 'UPSERT_WORKOUT': {
        const workout = op.payload as WorkoutProgram;
        await setDoc(
          doc(db, 'users', targetUid, 'workouts', workout.id),
          sanitizeForFirestore({
            ...workout,
            userId: targetUid,
            updatedAt: new Date().toISOString(),
          })
        );
        break;
      }
      case 'DELETE_WORKOUT': {
        await deleteDoc(doc(db, 'users', targetUid, 'workouts', op.entityId));
        break;
      }
      case 'UPSERT_CALENDAR_EVENT': {
        const event = op.payload as CalendarEvent;
        await setDoc(
          doc(db, 'users', targetUid, 'calendar', event.id),
          sanitizeForFirestore({
            ...event,
            userId: targetUid,
            updatedAt: new Date().toISOString(),
          })
        );
        break;
      }
      case 'DELETE_CALENDAR_EVENT': {
        await deleteDoc(doc(db, 'users', targetUid, 'calendar', op.entityId));
        break;
      }
      case 'UPSERT_COMPLETED_WORKOUT': {
        const record = op.payload as CompletedWorkoutRecord;
        await setDoc(
          doc(db, 'users', targetUid, 'completedWorkouts', record.id),
          sanitizeForFirestore({
            ...record,
            userId: targetUid,
          })
        );
        break;
      }
      case 'DELETE_COMPLETED_WORKOUT': {
        await deleteDoc(doc(db, 'users', targetUid, 'completedWorkouts', op.entityId));
        break;
      }
      case 'UPSERT_ACTIVE_SESSION': {
        const session = (op.payload as ActiveWorkoutSession | null) ?? null;
        await setDoc(
          doc(db, 'users', targetUid, 'settings', 'activeSession'),
          sanitizeForFirestore({
            session,
            userId: targetUid,
            updatedAt: new Date().toISOString(),
          })
        );
        break;
      }
      case 'UPSERT_EXERCISE_SNAPSHOT': {
        const snapshot = op.payload as ExerciseFinishedSnapshot;
        await setDoc(
          doc(db, 'users', targetUid, 'exerciseSnapshots', snapshot.id),
          sanitizeForFirestore({
            ...snapshot,
            userId: targetUid,
          })
        );
        break;
      }
      case 'UPSERT_CUSTOM_EXERCISE': {
        const exercise = op.payload as DatabaseExercise;
        await setDoc(
          doc(db, 'users', targetUid, 'customExercises', exercise.id),
          sanitizeForFirestore({
            ...exercise,
            userId: targetUid,
          })
        );
        break;
      }
      case 'DELETE_CUSTOM_EXERCISE': {
        await deleteDoc(doc(db, 'users', targetUid, 'customExercises', op.entityId));
        break;
      }
      case 'UPSERT_DIET_PLAN': {
        const plan = op.payload as ClientDietPlan;
        await setDoc(
          doc(db, 'users', targetUid, 'dietPlans', plan.id),
          sanitizeForFirestore({
            ...plan,
            userId: targetUid,
            updatedAt: new Date().toISOString(),
          })
        );
        break;
      }
      case 'DELETE_DIET_PLAN': {
        await deleteDoc(doc(db, 'users', targetUid, 'dietPlans', op.entityId));
        break;
      }
      case 'UPSERT_TRAINER_PROFILE': {
        const profile = op.payload as TrainerProfile;
        await setDoc(
          doc(db, 'users', targetUid, 'settings', 'trainerProfile'),
          sanitizeForFirestore({
            profile,
            userId: targetUid,
            updatedAt: new Date().toISOString(),
          })
        );
        break;
      }
      case 'UPSERT_NUTRITION_LIBRARY': {
        const library = op.payload as NutritionProfessionalLibrary;
        await setDoc(
          doc(db, 'users', targetUid, 'settings', 'nutritionLibrary'),
          sanitizeForFirestore({
            library,
            userId: targetUid,
            updatedAt: new Date().toISOString(),
          })
        );
        break;
      }
    }
  }

  /**
   * Processa e sincroniza todas as operações pendentes da fila offline com o Firestore.
   */
  public async processPendingQueue(
    userId?: string
  ): Promise<{ processed: number; remaining: number }> {
    const studentSession = storage.getStudentSession();
    const targetUid =
      userId ||
      this.currentUserId ||
      (studentSession?.trainerUid && studentSession.trainerUid !== 'local-trainer'
        ? studentSession.trainerUid
        : auth.currentUser?.uid);

    const initialQueue = storage.getPendingOperations();
    if (!targetUid || !this.isNetworkOnline() || initialQueue.length === 0) {
      return { processed: 0, remaining: initialQueue.length };
    }

    if (this.isProcessingQueue) {
      return { processed: 0, remaining: initialQueue.length };
    }

    this.isProcessingQueue = true;
    this.currentCallbacks?.onSyncStatusChange?.('syncing');
    let processedCount = 0;

    try {
      for (const op of initialQueue) {
        if (!this.isNetworkOnline() || isFirestoreQuotaExhausted) break;
        // Skip operations that have already failed repeatedly to avoid infinite write loops
        if ((op.retryCount || 0) >= 3) {
          storage.removePendingOperation(op.id);
          continue;
        }
        try {
          await this.executeQueuedOperation(op, targetUid);
          storage.removePendingOperation(op.id);
          processedCount++;
        } catch (err) {
          if (isQuotaExhaustedError(err)) {
            handleFirestoreError(err, OperationType.WRITE, `queue/${op.type}/${op.entityId}`);
            break;
          }
          storage.markPendingOperationAttempt(op.id);
          console.warn(`Error flushing queued op ${op.type} (${op.entityId}):`, err);
        }
      }

      const remaining = storage.getPendingOperations().length;
      if (remaining === 0 && !isFirestoreQuotaExhausted) {
        this.lastSyncTimestamp = Date.now();
        this.currentCallbacks?.onSyncStatusChange?.('synced');
        if (typeof window !== 'undefined' && processedCount > 0) {
          window.dispatchEvent(
            new CustomEvent('ironcoach:data-synced', {
              detail: {
                timestamp: new Date().toISOString(),
                userId: targetUid,
                flushedCount: processedCount,
              },
            })
          );
        }
      } else {
        this.currentCallbacks?.onSyncStatusChange?.('offline');
      }

      return { processed: processedCount, remaining };
    } finally {
      this.isProcessingQueue = false;
    }
  }

  public getLastSyncTimestamp(): number {
    return this.lastSyncTimestamp;
  }

  public isSyncing(): boolean {
    return this.isSyncingNow || this.isProcessingQueue;
  }

  /**
   * Força a sincronização imediata de todos os dados com o Firestore:
   * 1. Esvazia a fila de operações offline pendentes (queue)
   * 2. Recarrega e mescla treinos, clientes, agenda e histórico de exercícios com PSE sem regravar documentos já existentes.
   */
  public async forceSync(userId?: string): Promise<{ success: boolean; error?: string; count?: number }> {
    const studentSession = storage.getStudentSession();
    const targetUid =
      userId ||
      this.currentUserId ||
      (studentSession?.trainerUid && studentSession.trainerUid !== 'local-trainer'
        ? studentSession.trainerUid
        : auth.currentUser?.uid);
    if (!targetUid) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    if (!this.isNetworkOnline() || isFirestoreQuotaExhausted) {
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return {
        success: false,
        error: isFirestoreQuotaExhausted
          ? 'Cota diária gratuita do Firestore atingida. Dados seguros localmente.'
          : 'Sem conexão com a internet',
      };
    }

    if (this.isSyncingNow) {
      return { success: true };
    }

    this.isSyncingNow = true;
    this.currentCallbacks?.onSyncStatusChange?.('syncing');

    try {
      // 0. Primeiro processar toda a fila de operações offline pendentes
      if (storage.getPendingOperations().length > 0) {
        await this.processPendingQueue(targetUid);
      }

      if (isFirestoreQuotaExhausted) {
        this.currentCallbacks?.onSyncStatusChange?.('offline');
        return {
          success: false,
          error: 'Cota diária gratuita do Firestore atingida. Dados seguros localmente.',
        };
      }

      // 1. Forçar busca e mesclagem do histórico completo de treinos concluídos com PSE (somente leitura; escritas pendentes já vão pela fila)
      const completedRef = collection(db, 'users', targetUid, 'completedWorkouts');
      const completedSnap = await getDocs(completedRef);
      const completedList: CompletedWorkoutRecord[] = [];
      completedSnap.forEach((docSnap) => {
        completedList.push(docSnap.data() as CompletedWorkoutRecord);
      });
      const mergedCompleted = storage.mergeCompletedWorkouts(completedList);
      if (mergedCompleted.length > 0) {
        this.currentCallbacks?.onCompletedWorkoutsChange?.(mergedCompleted);
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

      // 3. Forçar busca e mesclagem de alunos
      const clientsRef = collection(db, 'users', targetUid, 'clients');
      const clientsSnap = await getDocs(clientsRef);
      if (!clientsSnap.empty) {
        const clientsList: Client[] = [];
        clientsSnap.forEach((docSnap) => {
          clientsList.push(docSnap.data() as Client);
        });
        const mergedClients = storage.mergeClients(clientsList);
        this.currentCallbacks?.onClientsChange?.(mergedClients);
      }

      // 4. Forçar busca e mesclagem de fichas de treino
      const workoutsRef = collection(db, 'users', targetUid, 'workouts');
      const workoutsSnap = await getDocs(workoutsRef);
      if (!workoutsSnap.empty) {
        const workoutsList: WorkoutProgram[] = [];
        workoutsSnap.forEach((docSnap) => {
          workoutsList.push(docSnap.data() as WorkoutProgram);
        });
        const mergedWorkouts = storage.mergeWorkouts(workoutsList);
        this.currentCallbacks?.onWorkoutsChange?.(mergedWorkouts);
      }

      // 5. Forçar busca e mesclagem da agenda
      const calendarRef = collection(db, 'users', targetUid, 'calendar');
      const calendarSnap = await getDocs(calendarRef);
      if (!calendarSnap.empty) {
        const calendarList: CalendarEvent[] = [];
        calendarSnap.forEach((docSnap) => {
          calendarList.push(docSnap.data() as CalendarEvent);
        });
        const mergedCalendar = storage.mergeCalendarEvents(calendarList);
        this.currentCallbacks?.onCalendarChange?.(mergedCalendar);
      }

      // 6. Forçar busca da sessão ativa (somente leitura para evitar gravações redundantes no forceSync)
      const localActiveSession = storage.getActiveSession();
      const hasLocalStarted = Boolean(localActiveSession && localActiveSession.isStarted);
      const sessionDocRef = doc(db, 'users', targetUid, 'settings', 'activeSession');
      const sessionSnap = await getDoc(sessionDocRef);
      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        const cloudSession = (data?.session as ActiveWorkoutSession | null) ?? null;
        if (!hasLocalStarted && !(cloudSession && Date.now() - this.lastSessionClearedAt < 5000)) {
          storage.saveActiveSession(cloudSession);
          this.currentCallbacks?.onActiveSessionChange?.(cloudSession);
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

      return { success: true, count: mergedCompleted.length };
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${targetUid}/forceSync`);
      this.currentCallbacks?.onSyncStatusChange?.('offline');
      return { success: false, error: String(err) };
    } finally {
      this.isSyncingNow = false;
    }
  }
}

export const cloudSync = new FirestoreSyncService();
