import { DatabaseExercise, MuscleGroup, RawJsonExercise } from '@/types';
import rawExercisesData from '@/public/assets/aistudio/exercises-ptbr-full-translation_30f0c4ed.json';

export const EXERCISE_IMAGE_BASE_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

export function getExerciseImageUrl(imagePath: string): string {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('/')) {
    return imagePath;
  }
  return `${EXERCISE_IMAGE_BASE_URL}${imagePath}`;
}

export const ANATOMY_MUSCLE_LABELS: Record<string, string> = {
  abdominais: 'Abdominais',
  abdutores: 'Abdutores',
  adutores: 'Adutores',
  antebracos: 'Antebraços',
  biceps: 'Bíceps',
  dorsais: 'Dorsais',
  gluteos: 'Glúteos',
  'inferior-das-costas': 'Lombar (Inferior das Costas)',
  isquiotibiais: 'Isquiotibiais (Posterior)',
  'meio-das-costas': 'Meio das Costas',
  ombros: 'Ombros (Deltóides)',
  panturrilhas: 'Panturrilhas',
  peito: 'Peitoral',
  pescoco: 'Pescoço',
  quadriceps: 'Quadríceps',
  trapezio: 'Trapézio',
  triceps: 'Tríceps',
};

export const EQUIPMENT_LABELS: Record<string, string> = {
  barra: 'Barra Reta / Olímpica',
  'barra-w': 'Barra W (EZ)',
  'bola-de-exercicio': 'Bola Suíça / Exercício',
  'bola-medicinal': 'Bola Medicinal',
  cabo: 'Cabo / Polia',
  faixas: 'Faixas Elásticas',
  halteres: 'Halteres',
  kettlebell: 'Kettlebell',
  maquina: 'Máquina',
  'peso-do-corpo': 'Peso do Corpo (Calistenia)',
  'rolo-de-espuma': 'Rolo de Espuma (Liberação)',
  outros: 'Outros Equipamentos',
};

export const LEVEL_LABELS: Record<string, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
};

export const MECHANIC_LABELS: Record<string, string> = {
  composto: 'Multiarticular (Composto)',
  isolado: 'Uniarticular (Isolado)',
};

export const FORCE_LABELS: Record<string, string> = {
  push: 'Empurrar (Push)',
  pull: 'Puxar (Pull)',
  static: 'Isométrico / Estático',
};

export const CATEGORY_LABELS: Record<string, string> = {
  forca: 'Força / Hipertrofia',
  alongamento: 'Alongamento / Mobilidade',
  pliometria: 'Pliometria / Potência',
  strongman: 'Strongman',
  powerlifting: 'Powerlifting',
  cardio: 'Cardio / Condicionamento',
  'levantamento-olimpico': 'Levantamento Olímpico',
};

export function formatAnatomyMuscle(slug?: string | null): string {
  if (!slug) return '';
  return ANATOMY_MUSCLE_LABELS[slug] || slug;
}

export function formatEquipment(slug?: string | null): string {
  if (!slug) return 'Sem Equipamento';
  return EQUIPMENT_LABELS[slug] || slug;
}

export function formatLevel(slug?: string | null): string {
  if (!slug) return '';
  return LEVEL_LABELS[slug] || slug;
}

export function formatMechanic(slug?: string | null): string {
  if (!slug) return '';
  return MECHANIC_LABELS[slug] || slug;
}

export function formatForce(slug?: string | null): string {
  if (!slug) return '';
  return FORCE_LABELS[slug] || slug;
}

export function formatCategory(slug?: string | null): string {
  if (!slug) return '';
  return CATEGORY_LABELS[slug] || slug;
}

export function mapPrimaryMuscleToMuscleGroup(
  primaryMuscles?: string[],
  name?: string
): MuscleGroup {
  const first = primaryMuscles?.[0]?.toLowerCase() || '';
  const lowerName = (name || '').toLowerCase();

  switch (first) {
    case 'peito':
      return 'Peitoral';
    case 'dorsais':
    case 'meio-das-costas':
    case 'inferior-das-costas':
      return 'Dorsal';
    case 'ombros':
    case 'pescoco':
      if (lowerName.includes('posterior') || lowerName.includes('inverso') || lowerName.includes('invertido') || lowerName.includes('face pull')) {
        return 'Deltóide Posterior';
      }
      if (lowerName.includes('frontal') || lowerName.includes('militar')) {
        return 'Deltóide Anterior';
      }
      return 'Deltóide Lateral';
    case 'triceps':
      return 'Tríceps';
    case 'biceps':
    case 'antebracos':
      return 'Bíceps';
    case 'quadriceps':
      return 'Quadríceps';
    case 'isquiotibiais':
      return 'Ísquios';
    case 'gluteos':
    case 'abdutores':
    case 'adutores':
      return 'Glúteo';
    case 'panturrilhas':
      return 'Panturrilha';
    case 'trapezio':
      return 'Trapézio';
    case 'abdominais':
      return 'Abdômen';
    default:
      return 'Peitoral';
  }
}

const typedRawExercises = rawExercisesData as RawJsonExercise[];

export const INITIAL_EXERCISE_DATABASE: DatabaseExercise[] = typedRawExercises.map(
  (item) => ({
    id: item.id,
    name: item.name.trim(),
    muscleGroup: mapPrimaryMuscleToMuscleGroup(item.primaryMuscles, item.name),
    primaryMuscles: item.primaryMuscles || [],
    secondaryMuscles: item.secondaryMuscles || [],
    equipment: item.equipment || null,
    level: item.level || 'iniciante',
    mechanic: item.mechanic || null,
    force: item.force || null,
    category: item.category || 'forca',
    instructions: item.instructions || [],
    images: item.images || [],
    isCustom: false,
  })
);

export const PRIMARY_MUSCLE_OPTIONS: { value: string; label: string; count: number }[] =
  Object.entries(ANATOMY_MUSCLE_LABELS)
    .map(([value, label]) => ({
      value,
      label,
      count: INITIAL_EXERCISE_DATABASE.filter((ex) =>
        ex.primaryMuscles?.includes(value)
      ).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

export const SECONDARY_MUSCLE_OPTIONS: { value: string; label: string; count: number }[] =
  Object.entries(ANATOMY_MUSCLE_LABELS)
    .map(([value, label]) => ({
      value,
      label,
      count: INITIAL_EXERCISE_DATABASE.filter((ex) =>
        ex.secondaryMuscles?.includes(value)
      ).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

export const EQUIPMENT_OPTIONS: { value: string; label: string; count: number }[] =
  Object.entries(EQUIPMENT_LABELS)
    .map(([value, label]) => ({
      value,
      label,
      count: INITIAL_EXERCISE_DATABASE.filter((ex) => ex.equipment === value).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

// Fast lookup map by lowercase name and ID
const exerciseByNameMap = new Map<string, DatabaseExercise>();
const exerciseByIdMap = new Map<string, DatabaseExercise>();

INITIAL_EXERCISE_DATABASE.forEach((ex) => {
  exerciseByNameMap.set(ex.name.toLowerCase(), ex);
  exerciseByIdMap.set(ex.id.toLowerCase(), ex);
});

export function findExerciseMetadata(
  nameOrId?: string | null,
  customList?: DatabaseExercise[]
): DatabaseExercise | undefined {
  if (!nameOrId) return undefined;
  const clean = nameOrId.trim().toLowerCase();
  if (!clean) return undefined;

  let listToSearch = customList;
  if ((!listToSearch || listToSearch.length === 0) && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('ironcoach_exercise_db_v3_json');
      if (raw) {
        listToSearch = JSON.parse(raw);
      }
    } catch {
      // ignore
    }
  }

  if (listToSearch && listToSearch.length > 0) {
    const fromCustom = listToSearch.find(
      (item) =>
        item &&
        (item.name.trim().toLowerCase() === clean ||
          item.id.trim().toLowerCase() === clean)
    );
    if (
      fromCustom &&
      (fromCustom.isCustom ||
        fromCustom.isModified ||
        fromCustom.videoUrl ||
        fromCustom.gifUrl ||
        fromCustom.images?.length ||
        fromCustom.instructions?.length ||
        fromCustom.primaryMuscles?.length)
    ) {
      return fromCustom;
    }
  }

  return exerciseByNameMap.get(clean) || exerciseByIdMap.get(clean);
}

