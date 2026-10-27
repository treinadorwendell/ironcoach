export type Gender = 'Feminino' | 'Masculino';
export type ContractCategory = 'Presencial' | 'Online';
export type PresencialSubPlan = 'Mensal' | 'Semanal' | 'Avulsa';
export type OnlineSubPlan = 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';

export type ContractType =
  | 'Presencial - Mensal'
  | 'Presencial - Semanal'
  | 'Presencial - Avulsa'
  | 'Online - Mensal'
  | 'Online - Trimestral'
  | 'Online - Semestral'
  | 'Online - Anual'
  | 'Avulsa'
  | 'Semanal'
  | 'Mensal'
  | 'Online';

export interface TrainerProfile {
  name: string;
  logoDataUrl?: string;
  isProfileCompleted?: boolean;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  birthDate: string; // DD/MM/AAAA
  gender: Gender;
  weight: number; // KG
  height: number; // CM
  bodyFatPercent?: number; // % BF opcional
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

export interface RawJsonExercise {
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
  id: string;
}

export interface DatabaseExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  equipment?: string | null;
  level?: string;
  mechanic?: string | null;
  force?: string | null;
  category?: string;
  instructions?: string[];
  images?: string[];
  videoUrl?: string;
  gifUrl?: string;
  mediaType?: 'video_upload' | 'video_link' | 'gif' | 'images';
  isCustom?: boolean;
  isModified?: boolean;
  createdAt?: string;
}

export interface CustomWorkoutMethodSubSetTemplate {
  subSetNumber: number;
  repZone: string;
  note: string;
}

export interface CustomWorkoutMethod {
  id: string;
  name: string;
  hasSubSets: boolean;
  subSetsTemplate?: CustomWorkoutMethodSubSetTemplate[];
  createdAt: string;
}

export const WORKOUT_METHODS = [
  'Normal',
  '3/7',
  'Bi-set',
  'Cluster-Set',
  'Dead Stop',
  'Dead Stop + Pico de Contração',
  'Drop-Set Tradicional',
  'Drop-Set Adaptado',
  'Duplo Recrutamento',
  'Excêntrico',
  'FST-7',
  'GVT',
  'Ondulatório',
  'Ondulatório 28',
  'Parcial',
  'Pico de Contração + Drop-Set',
  'Pico de Contração + Excêntrica',
  'Pico de Contração Intra-repetições',
  'Pirâmide crescente',
  'Pirâmide Decrescente',
  'Ponto Zero',
  'Pré-Exaustão',
  'Progressão de Volume Linear',
  'Rest-Pause',
  'Super-série',
  'Tri-set',
] as const;

export type WorkoutMethod = (typeof WORKOUT_METHODS)[number] | string;

export interface ExerciseSubSetDetail {
  id: string;
  subSetNumber: number; // 1, 2, 3...
  repZone: string; // e.g. "4 reps", "Até a falha", "8-10"
  suggestedWeightKg?: number; // Carga sugerida em kg
  note?: string; // Instrução/observação (ex: "-20% carga", "sem descanso", "pausa 15s")
}

export interface ExerciseSetDetail {
  id: string;
  setNumber: number;
  repZone: string; // e.g. "8-12", "10", "15"
  suggestedWeightKg?: number; // Carga sugerida em kg
  method: string; // Método avançado específico desta série
  notes?: string;
  subSets?: ExerciseSubSetDetail[]; // Subséries disparadas por métodos como 3/7, Drop-set, Cluster, etc.
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
  method: string; // 'Normal' | 'Bi-set' | 'Drop-Set Tradicional' | etc.
  observations: string;
  extraBlocks: ExtraBlock[];
  setDetails?: ExerciseSetDetail[]; // Séries individuais configuráveis
  combinationGroupId?: string; // ID único do grupo de combinação (ex: combo-123)
  combinationLabel?: string; // Ex: "Bi-set", "Tri-set", "Super-série", "Combinado"
  combinationOrder?: number; // Ordem na sequência da combinação (1, 2, 3...)
  substituteExerciseName?: string; // Exercício substituto do mesmo grupo muscular
  substituteMuscleGroup?: MuscleGroup;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  equipment?: string | null;
  level?: string;
  mechanic?: string | null;
  force?: string | null;
  category?: string;
  instructions?: string[];
  images?: string[];
  videoUrl?: string;
  gifUrl?: string;
  mediaType?: 'video_upload' | 'video_link' | 'gif' | 'images';
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

export interface ExecutionSubSet {
  id: string;
  subSetNumber: number;
  repZone: string;
  targetReps: number;
  completedReps: number;
  weightKg?: number | null;
  completed: boolean;
  note?: string;
}

export interface ExecutionSet {
  setNumber: number;
  repZone: string;
  targetReps: number;
  completedReps: number;
  weightKg?: number | null;
  completed: boolean;
  completedAt?: string;
  extraVariation?: string;
  method?: string;
  pse?: number | null;
  subSets?: ExecutionSubSet[];
}

export interface ExecutionExerciseState {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  method: string;
  observations: string;
  restSeconds: number;
  sets: ExecutionSet[];
  combinationGroupId?: string;
  combinationLabel?: string;
  combinationOrder?: number;
  exerciseComment?: string;
  substituteExerciseName?: string;
  substituteMuscleGroup?: MuscleGroup;
  isUsingSubstitute?: boolean;
  originalExerciseName?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  equipment?: string | null;
  level?: string;
  mechanic?: string | null;
  force?: string | null;
  category?: string;
  instructions?: string[];
  images?: string[];
  videoUrl?: string;
  gifUrl?: string;
  mediaType?: 'video_upload' | 'video_link' | 'gif' | 'images';
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
  trainerNotes?: string;
}

export interface ExerciseHistoricalEntry {
  date: string; // e.g. "12/09", "19/09", "26/09", "03/10"
  weightKg: number;
  reps: number;
  setsCompleted: number;
}

export type CalendarEventStatus =
  | 'confirmado'
  | 'realizado'
  | 'reagendado'
  | 'falta'
  | 'cancelado';

export interface CalendarEvent {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "07:00"
  endTime: string; // "08:00"
  recurringDays?: number[]; // [1, 3, 5] for Mon, Wed, Fri
  recurringEndDate?: string; // YYYY-MM-DD até qual data a recorrência fica ativa
  recurringExceptions?: string[]; // Array of YYYY-MM-DD dates where this recurring event was overridden
  recurringParentId?: string; // ID of the parent recurring event if this event is an isolated override
  notes?: string;
  status: CalendarEventStatus;
  rescheduledDate?: string;
  rescheduledTime?: string;
}

export type AgendaViewMode = 'dia' | 'semana' | 'mes' | 'ano' | 'programacao';

export type MainNavSection = 'cliente' | 'agenda' | 'criar-treino' | 'execucao';

export interface CompletedSubSetRecord {
  subSetNumber: number;
  completedReps: number;
  weightKg?: number | null;
  repZone?: string;
  completed: boolean;
  note?: string;
}

export interface CompletedSetRecord {
  setNumber: number;
  completedReps: number;
  weightKg?: number | null;
  repZone?: string;
  completed: boolean;
  method?: string;
  pse?: number | null;
  subSets?: CompletedSubSetRecord[];
}

export interface CompletedExerciseRecord {
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  method?: string;
  observations?: string;
  sets: CompletedSetRecord[];
}

export interface ExerciseImprovementItem {
  exerciseName: string;
  muscleGroup?: MuscleGroup;
  hasPreviousHistory: boolean;
  previousDate?: string;
  previousMaxWeightKg: number;
  currentMaxWeightKg: number;
  weightDiffKg: number;
  weightDiffPercent: number;
  previousTotalReps: number;
  currentTotalReps: number;
  repsDiff: number;
  repsDiffPercent: number;
  previousVolumeKg: number;
  currentVolumeKg: number;
  volumeDiffKg: number;
  volumeDiffPercent: number;
  previousAvgPse: number | null;
  currentAvgPse: number | null;
  pseDiff: number | null;
  pseLoadRelationship: string;
  pseLoadStatus: 'improved' | 'progressed' | 'maintained' | 'demanding';
  hasAnyImprovement: boolean;
  improvementsSummary: string[];
}

export interface WorkoutFeedbackReport {
  id: string;
  generatedAt: string;
  comparedWorkoutId?: string;
  comparedWorkoutDate?: string;
  previousTotalVolumeKg: number;
  currentTotalVolumeKg: number;
  totalVolumeDiffKg: number;
  totalVolumeDiffPercent: number;
  previousTotalReps: number;
  currentTotalReps: number;
  totalRepsDiff: number;
  previousAvgPse: number | null;
  currentAvgPse: number | null;
  avgWeightDiffPercent: number;
  exercisesImprovedCount: number;
  totalComparedExercises: number;
  exerciseComparisons: ExerciseImprovementItem[];
  nextWorkoutGoal?: string;
}

export interface CompletedWorkoutRecord {
  id: string;
  clientId: string;
  clientName: string;
  programId?: string;
  programName: string;
  splitId?: string;
  splitName: string;
  date: string; // e.g. "04/10/2026"
  time?: string; // e.g. "15:30"
  completedAt: string; // ISO
  durationSeconds: number;
  durationFormatted: string; // e.g. "52m 10s"
  totalVolumeKg: number;
  exercises: CompletedExerciseRecord[];
  trainerNotes?: string;
  feedbackReport?: WorkoutFeedbackReport;
  nextWorkoutGoal?: string;
}

export interface ExerciseFinishedSnapshotSet {
  setNumber: number;
  weightKg: number | null;
  completedReps: number;
  volumeKg?: number;
  completed: boolean;
  pse?: number | null;
}

export interface ExerciseFinishedSnapshot {
  id: string;
  clientId: string;
  exerciseName: string;
  date: string;
  timestamp: string;
  sets: ExerciseFinishedSnapshotSet[];
  userId?: string;
}

export interface ExerciseCommentRecord {
  id: string;
  clientId: string;
  exerciseName: string;
  comment: string;
  date: string; // e.g. "04/10/2026"
  timestamp: string; // ISO
}

// ============================================================================
// NUTRITION & DIET PRESCRIPTION MODULE TYPES
// ============================================================================

export type MetabolicFormulaId =
  | 'mifflin'
  | 'harris'
  | 'cunningham'
  | 'katch'
  | 'fao'
  | 'tinsley_weight'
  | 'tinsley_lbm';

export type ActivityLevelId =
  | 'sedentario'
  | 'leve'
  | 'moderado'
  | 'intenso'
  | 'atleta';

export type DietGoalType = 'deficit' | 'manutencao' | 'superavit';

export interface ClientMetabolicConfig {
  formula: MetabolicFormulaId;
  bodyFatPercent?: number; // % de gordura corporal para Cunningham, Katch-McArdle e Tinsley MLG
  activityLevel: ActivityLevelId;
  activityFactor: number; // ex: 1.2, 1.375, 1.55, 1.725, 1.9
  workoutCalories: number; // kcal extras do treino no dia
  goalType: DietGoalType;
  goalDeltaKcal: number; // ex: -400, 0, +350
  proteinGPerKg: number; // ex: 2.0 g/kg
  fatGPerKg: number; // ex: 0.9 g/kg
  fiberTargetG: number; // ex: 30 g
}

export interface NutrientProfile {
  energyKcal: number;
  proteinG: number;
  carbohydrateG: number;
  lipidG: number;
  fiberG: number;
  cholesterolMg: number;
  saturatedG: number;
  monounsaturatedG: number;
  polyunsaturatedG: number;
  calciumMg: number;
  magnesiumMg: number;
  manganeseMg: number;
  phosphorusMg: number;
  ironMg: number;
  sodiumMg: number;
  potassiumMg: number;
  copperMg: number;
  zincMg: number;
  retinolMcg: number;
  thiamineMg: number;
  riboflavinMg: number;
  pyridoxineMg: number;
  niacinMg: number;
  vitaminCMg: number;
}

export interface HouseholdMeasureOption {
  id: string;
  label: string; // ex: "★ Colher de arroz/servir · Cozido(a) — 45g (Arroz cozido - colher de arroz cheia)"
  unitName: string; // ex: "Colher de arroz/servir", "Colher de sopa", "g", "ml", "L"
  grams: number; // Peso equivalente em gramas para 1 unidade desta medida
  source: 'universal' | 'pof' | 'custom';
  preparation?: string; // ex: "Cozido(a)", "Grelhado(a)/Brasa", "Cru(a)"
  sourceDescription?: string; // descricao_fonte oficial da POF, ex: "Arroz cozido - colher de arroz cheia"
  pofFoodCode?: string; // codigo_alimento da POF, ex: "6300101"
  pofFoodDescription?: string; // descricao_alimento da POF, ex: "ARROZ (POLIDO, PARBOILIZADO)"
  pofMeasureCode?: string; // codigo_medida da POF, ex: "12"
  isReferenceMeasure?: boolean; // true se codigo_medida === codigo_medida_referencia
  isPreparationMatch?: boolean; // true se o preparo da medida coincide com o preparo do alimento
}

export interface NutritionFoodItem {
  id: string;
  name: string;
  category: string;
  isCustom?: boolean;
  origin?: 'taco' | 'pof' | 'custom';
  pofCode?: string;
  pofDescription?: string;
  preparationMethod?: string;
  baseUnit: '100g' | '100ml';
  nutrientsPer100: NutrientProfile;
  measures: HouseholdMeasureOption[];
  createdAt?: string;
}

export type RecipeCategory =
  | 'Café da Manhã'
  | 'Almoço & Jantar'
  | 'Lanches & Pré/Pós-Treino'
  | 'Sobremesas Fit'
  | 'Bebidas & Smoothies'
  | 'Outros';

export const RECIPE_CATEGORIES: RecipeCategory[] = [
  'Café da Manhã',
  'Almoço & Jantar',
  'Lanches & Pré/Pós-Treino',
  'Sobremesas Fit',
  'Bebidas & Smoothies',
  'Outros',
];

export interface NutritionRecipeIngredient {
  id: string;
  foodId: string;
  foodName: string;
  measureId: string;
  measureLabel: string;
  quantity: number;
  gramsEquivalent: number;
  nutrients: NutrientProfile;
}

export interface NutritionRecipe {
  id: string;
  name: string;
  category: RecipeCategory;
  servings: number;
  servingWeightG: number;
  prepTimeMinutes: number;
  instructions: string;
  ingredients: NutritionRecipeIngredient[];
  nutrientsPerServing: NutrientProfile;
  nutrientsTotal: NutrientProfile;
  isSystemDefault?: boolean;
  createdAt: string;
}

export type SubstitutionEquivalenceMode =
  | 'auto_kcal'
  | 'auto_carb'
  | 'auto_protein'
  | 'auto_fat'
  | 'fixed_portion';

export interface DietItemSubstitution {
  id: string;
  targetType: 'food' | 'recipe';
  targetId: string;
  targetName: string;
  category: string;
  measureId: string;
  measureLabel: string;
  quantity: number;
  gramsEquivalent: number;
  equivalenceMode: SubstitutionEquivalenceMode;
  nutrients: NutrientProfile;
}

export interface DietMealItem {
  id: string;
  sourceType: 'food' | 'recipe';
  sourceId: string;
  name: string;
  category: string;
  measureId: string;
  measureLabel: string;
  quantity: number;
  gramsEquivalent: number;
  nutrients: NutrientProfile;
  notes?: string;
  substitutions: DietItemSubstitution[];
}

export interface DietMeal {
  id: string;
  time: string; // ex: "07:30"
  name: string; // ex: "Café da Manhã"
  notes?: string;
  items: DietMealItem[];
  mealSubstitutions: DietItemSubstitution[]; // Troca da refeição inteira por receitas do sistema/profissional
}

export interface DietDaySchedule {
  id: string;
  name: string; // ex: "Dias de Treino (Seg a Sex)"
  weekDays: number[]; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  meals: DietMeal[];
}

export interface PredefinedMealTemplate {
  id: string;
  name: string;
  category: string;
  defaultTime: string;
  notes?: string;
  items: DietMealItem[];
  nutrientsTotal: NutrientProfile;
  createdAt: string;
}

export interface CustomPortionRecord {
  id: string;
  name: string; // ex: "1 Scoop Whey Padrão"
  unitName: string; // ex: "Scoop"
  grams: number; // ex: 30
  applicableCategory?: string; // ex: "Suplementos" ou "Todos"
  foodId?: string; // Opcional: vinculado a um alimento específico
  createdAt: string;
}

export interface NutritionProfessionalLibrary {
  customFoods: NutritionFoodItem[];
  recipes: NutritionRecipe[];
  mealTemplates: PredefinedMealTemplate[];
  customPortions: CustomPortionRecord[];
  updatedAt: string;
}

export interface ClientDietPlan {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  metabolicConfig: ClientMetabolicConfig;
  schedules: DietDaySchedule[];
  activeScheduleId: string;
  createdAt: string;
  updatedAt: string;
}


