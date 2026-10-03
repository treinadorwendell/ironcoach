export type Gender = 'Feminino' | 'Masculino';
export type ContractType = 'Avulsa' | 'Semanal' | 'Mensal';

export interface Client {
  id: string;
  name: string;
  birthDate: string; // DD/MM/AAAA
  gender: Gender;
  weight: number; // KG
  height: number; // CM
  email: string;
  contractType: ContractType;
  contractValue: number; // R$
  phone?: string;
  notes?: string;
  createdAt: string;
}

export type MuscleGroup =
  | 'Peitoral'
  | 'Dorsal'
  | 'Deltóide Anterior'
  | 'Deltóide Lateral'
  | 'Deltóide Posterior'
  | 'Tríceps'
  | 'Bíceps'
  | 'Quadríceps'
  | 'Ísquios'
  | 'Glúteo'
  | 'Panturrilha'
  | 'Trapézio'
  | 'Abdômen';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Peitoral',
  'Dorsal',
  'Deltóide Anterior',
  'Deltóide Lateral',
  'Deltóide Posterior',
  'Tríceps',
  'Bíceps',
  'Quadríceps',
  'Ísquios',
  'Glúteo',
  'Panturrilha',
  'Trapézio',
  'Abdômen',
];

export interface DatabaseExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  isCustom?: boolean;
  createdAt?: string;
}

export interface ExtraBlock {
  id: string;
  type: 'Drop-set' | 'Repetições Parciais' | 'Isometria' | 'Rest-Pause' | 'Outro';
  repsText: string;
  note: string;
}

export interface ExerciseItem {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  sets: number;
  repZone: string; // e.g. "8-12"
  restSeconds: number; // in seconds, e.g. 60, 90
  method: string; // 'Normal' | 'Bi-set' | 'Rest-Pause' | 'Drop-set' | 'Pirâmide'
  observations: string;
  extraBlocks: ExtraBlock[];
}

export interface WorkoutSplit {
  id: string;
  name: string; // e.g. "Treino A - Peitoral e Tríceps"
  weekDays: number[]; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  exercises: ExerciseItem[];
}

export interface WorkoutProgram {
  id: string;
  clientId: string;
  name: string; // e.g. "Programa Hipertrofia A/B"
  goal: string; // e.g. "Hipertrofia", "Definição", "Força"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  splits: WorkoutSplit[]; // Treinos vinculados aos dias da semana
  weekDays?: number[]; // Para compatibilidade retroativa
  exercises?: ExerciseItem[]; // Para compatibilidade retroativa
  createdAt: string;
}

export interface ExecutionSet {
  setNumber: number;
  repZone: string;
  targetReps: number;
  completedReps: number;
  weightKg: number;
  completed: boolean;
  completedAt?: string;
  extraVariation?: string;
}

export interface ExecutionExerciseState {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  method: string;
  observations: string;
  restSeconds: number;
  sets: ExecutionSet[];
}

export interface ActiveWorkoutSession {
  programId: string;
  clientId: string;
  clientName: string;
  programName: string;
  startTime: string; // ISO
  elapsedSeconds: number;
  isPaused: boolean;
  isStarted?: boolean;
  exercises: ExecutionExerciseState[];
}

export interface ExerciseHistoricalEntry {
  date: string; // e.g. "12/09", "19/09", "26/09", "03/10"
  weightKg: number;
  reps: number;
  setsCompleted: number;
}

export interface CalendarEvent {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "07:00"
  endTime: string; // "08:00"
  recurringDays?: number[]; // [1, 3, 5] for Mon, Wed, Fri
  notes?: string;
  status: 'confirmado' | 'realizado' | 'cancelado';
}

export type AgendaViewMode = 'dia' | 'semana' | 'mes' | 'ano' | 'programacao';

export type MainNavSection = 'cliente' | 'agenda' | 'criar-treino' | 'execucao';
