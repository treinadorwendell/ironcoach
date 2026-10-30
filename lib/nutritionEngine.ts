import {
  ActivityLevelId,
  Client,
  ClientDietPlan,
  ClientMetabolicConfig,
  CustomPortionRecord,
  DietDaySchedule,
  DietItemSubstitution,
  DietMeal,
  DietMealItem,
  Gender,
  HouseholdMeasureOption,
  MetabolicFormulaId,
  NutrientProfile,
  NutritionFoodItem,
  NutritionProfessionalLibrary,
  NutritionRecipe,
  PredefinedMealTemplate,
  SubstitutionEquivalenceMode,
} from '@/types';

export const EMPTY_NUTRIENT_PROFILE: NutrientProfile = {
  energyKcal: 0,
  proteinG: 0,
  carbohydrateG: 0,
  lipidG: 0,
  fiberG: 0,
  cholesterolMg: 0,
  saturatedG: 0,
  monounsaturatedG: 0,
  polyunsaturatedG: 0,
  calciumMg: 0,
  magnesiumMg: 0,
  manganeseMg: 0,
  phosphorusMg: 0,
  ironMg: 0,
  sodiumMg: 0,
  potassiumMg: 0,
  copperMg: 0,
  zincMg: 0,
  retinolMcg: 0,
  thiamineMg: 0,
  riboflavinMg: 0,
  pyridoxineMg: 0,
  niacinMg: 0,
  vitaminCMg: 0,
};

export const METABOLIC_FORMULAS_META: {
  id: MetabolicFormulaId;
  name: string;
  subtitle: string;
  badge: string;
  requiresBodyFat: boolean;
}[] = [
  {
    id: 'mifflin',
    name: 'Mifflin-St Jeor (1990)',
    subtitle: 'Padrão ouro clínico geral e recomposição corporal',
    badge: 'Clínico & Fitness',
    requiresBodyFat: false,
  },
  {
    id: 'harris',
    name: 'Harris-Benedict Revisada (1984)',
    subtitle: 'Clássica de Roza & Shizgal para indivíduos ativos',
    badge: 'Tradicional',
    requiresBodyFat: false,
  },
  {
    id: 'cunningham',
    name: 'Cunningham (1980)',
    subtitle: 'Baseada na Massa Livre de Gordura (MLG) para praticantes avançados',
    badge: 'Usa % Gordura',
    requiresBodyFat: true,
  },
  {
    id: 'katch',
    name: 'Katch-McArdle (1996)',
    subtitle: 'Equação de precisão por Massa Magra (LBM)',
    badge: 'Usa % Gordura',
    requiresBodyFat: true,
  },
  {
    id: 'fao',
    name: 'FAO / OMS (2004)',
    subtitle: 'Equação internacional estratificada por faixa etária e sexo',
    badge: 'Diretriz OMS',
    requiresBodyFat: false,
  },
  {
    id: 'tinsley_weight',
    name: 'Tinsley — Peso Total (2018)',
    subtitle: 'Desenvolvida especificamente para atletas de força e hipertrofia',
    badge: 'Atletas / Hipertrofia',
    requiresBodyFat: false,
  },
  {
    id: 'tinsley_lbm',
    name: 'Tinsley — Massa Magra (2018)',
    subtitle: 'Fórmula de alta precisão para fisiculturismo e baixo %BF',
    badge: 'Atletas + %BF',
    requiresBodyFat: true,
  },
];

export const ACTIVITY_LEVELS_META: {
  id: ActivityLevelId;
  label: string;
  factor: number;
  description: string;
}[] = [
  {
    id: 'sedentario',
    label: 'Sedentário / Leve Rotina',
    factor: 1.2,
    description: 'Trabalho sentado, pouco deslocamento diário',
  },
  {
    id: 'leve',
    label: 'Levemente Ativo',
    factor: 1.375,
    description: 'Treino leve 1 a 3 dias/semana ou caminhadas',
  },
  {
    id: 'moderado',
    label: 'Moderadamente Ativo',
    factor: 1.55,
    description: 'Musculação intensa 3 a 5 dias/semana',
  },
  {
    id: 'intenso',
    label: 'Muito Ativo',
    factor: 1.725,
    description: 'Treinos intensos 6 a 7 dias/semana ou rotina física ativa',
  },
  {
    id: 'atleta',
    label: 'Atleta / Alto Rendimento',
    factor: 1.9,
    description: 'Treinos duplos diários ou trabalho braçal pesado + treino',
  },
];

export const WEEK_DAYS_SHORT: { day: number; short: string; full: string }[] = [
  { day: 1, short: 'Seg', full: 'Segunda-feira' },
  { day: 2, short: 'Ter', full: 'Terça-feira' },
  { day: 3, short: 'Qua', full: 'Quarta-feira' },
  { day: 4, short: 'Qui', full: 'Quinta-feira' },
  { day: 5, short: 'Sex', full: 'Sexta-feira' },
  { day: 6, short: 'Sáb', full: 'Sábado' },
  { day: 0, short: 'Dom', full: 'Domingo' },
];

export function parseNumericNutrient(val: unknown): number {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? Number(val.toFixed(2)) : 0;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === 'NA' || trimmed === 'Tr' || trimmed === '*' || trimmed === '-') {
      return 0;
    }
    const parsed = parseFloat(trimmed.replace(',', '.'));
    return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
  }
  return 0;
}

export function scaleNutrients(basePer100: NutrientProfile, grams: number): NutrientProfile {
  const ratio = Math.max(0, grams) / 100;
  return {
    energyKcal: Number((basePer100.energyKcal * ratio).toFixed(1)),
    proteinG: Number((basePer100.proteinG * ratio).toFixed(1)),
    carbohydrateG: Number((basePer100.carbohydrateG * ratio).toFixed(1)),
    lipidG: Number((basePer100.lipidG * ratio).toFixed(1)),
    fiberG: Number((basePer100.fiberG * ratio).toFixed(1)),
    cholesterolMg: Number((basePer100.cholesterolMg * ratio).toFixed(1)),
    saturatedG: Number((basePer100.saturatedG * ratio).toFixed(2)),
    monounsaturatedG: Number((basePer100.monounsaturatedG * ratio).toFixed(2)),
    polyunsaturatedG: Number((basePer100.polyunsaturatedG * ratio).toFixed(2)),
    calciumMg: Number((basePer100.calciumMg * ratio).toFixed(1)),
    magnesiumMg: Number((basePer100.magnesiumMg * ratio).toFixed(1)),
    manganeseMg: Number((basePer100.manganeseMg * ratio).toFixed(2)),
    phosphorusMg: Number((basePer100.phosphorusMg * ratio).toFixed(1)),
    ironMg: Number((basePer100.ironMg * ratio).toFixed(2)),
    sodiumMg: Number((basePer100.sodiumMg * ratio).toFixed(1)),
    potassiumMg: Number((basePer100.potassiumMg * ratio).toFixed(1)),
    copperMg: Number((basePer100.copperMg * ratio).toFixed(2)),
    zincMg: Number((basePer100.zincMg * ratio).toFixed(2)),
    retinolMcg: Number((basePer100.retinolMcg * ratio).toFixed(1)),
    thiamineMg: Number((basePer100.thiamineMg * ratio).toFixed(2)),
    riboflavinMg: Number((basePer100.riboflavinMg * ratio).toFixed(2)),
    pyridoxineMg: Number((basePer100.pyridoxineMg * ratio).toFixed(2)),
    niacinMg: Number((basePer100.niacinMg * ratio).toFixed(2)),
    vitaminCMg: Number((basePer100.vitaminCMg * ratio).toFixed(1)),
  };
}

export function sumNutrientProfiles(profiles: NutrientProfile[]): NutrientProfile {
  const acc: NutrientProfile = { ...EMPTY_NUTRIENT_PROFILE };
  for (const p of profiles) {
    if (!p) continue;
    acc.energyKcal += p.energyKcal || 0;
    acc.proteinG += p.proteinG || 0;
    acc.carbohydrateG += p.carbohydrateG || 0;
    acc.lipidG += p.lipidG || 0;
    acc.fiberG += p.fiberG || 0;
    acc.cholesterolMg += p.cholesterolMg || 0;
    acc.saturatedG += p.saturatedG || 0;
    acc.monounsaturatedG += p.monounsaturatedG || 0;
    acc.polyunsaturatedG += p.polyunsaturatedG || 0;
    acc.calciumMg += p.calciumMg || 0;
    acc.magnesiumMg += p.magnesiumMg || 0;
    acc.manganeseMg += p.manganeseMg || 0;
    acc.phosphorusMg += p.phosphorusMg || 0;
    acc.ironMg += p.ironMg || 0;
    acc.sodiumMg += p.sodiumMg || 0;
    acc.potassiumMg += p.potassiumMg || 0;
    acc.copperMg += p.copperMg || 0;
    acc.zincMg += p.zincMg || 0;
    acc.retinolMcg += p.retinolMcg || 0;
    acc.thiamineMg += p.thiamineMg || 0;
    acc.riboflavinMg += p.riboflavinMg || 0;
    acc.pyridoxineMg += p.pyridoxineMg || 0;
    acc.niacinMg += p.niacinMg || 0;
    acc.vitaminCMg += p.vitaminCMg || 0;
  }

  return {
    energyKcal: Number(acc.energyKcal.toFixed(1)),
    proteinG: Number(acc.proteinG.toFixed(1)),
    carbohydrateG: Number(acc.carbohydrateG.toFixed(1)),
    lipidG: Number(acc.lipidG.toFixed(1)),
    fiberG: Number(acc.fiberG.toFixed(1)),
    cholesterolMg: Number(acc.cholesterolMg.toFixed(1)),
    saturatedG: Number(acc.saturatedG.toFixed(2)),
    monounsaturatedG: Number(acc.monounsaturatedG.toFixed(2)),
    polyunsaturatedG: Number(acc.polyunsaturatedG.toFixed(2)),
    calciumMg: Number(acc.calciumMg.toFixed(1)),
    magnesiumMg: Number(acc.magnesiumMg.toFixed(1)),
    manganeseMg: Number(acc.manganeseMg.toFixed(2)),
    phosphorusMg: Number(acc.phosphorusMg.toFixed(1)),
    ironMg: Number(acc.ironMg.toFixed(2)),
    sodiumMg: Number(acc.sodiumMg.toFixed(1)),
    potassiumMg: Number(acc.potassiumMg.toFixed(1)),
    copperMg: Number(acc.copperMg.toFixed(2)),
    zincMg: Number(acc.zincMg.toFixed(2)),
    retinolMcg: Number(acc.retinolMcg.toFixed(1)),
    thiamineMg: Number(acc.thiamineMg.toFixed(2)),
    riboflavinMg: Number(acc.riboflavinMg.toFixed(2)),
    pyridoxineMg: Number(acc.pyridoxineMg.toFixed(2)),
    niacinMg: Number(acc.niacinMg.toFixed(2)),
    vitaminCMg: Number(acc.vitaminCMg.toFixed(1)),
  };
}

export function calculateAgeFromBirthDate(birthDate: string): number {
  if (!birthDate) return 28;
  const parts = birthDate.split('/');
  if (parts.length !== 3) return 28;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year || year < 1900) return 28;
  const today = new Date();
  let age = today.getFullYear() - year;
  const m = today.getMonth() + 1 - month;
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }
  return Math.max(12, Math.min(100, age));
}

export interface MetabolicCalculationResult {
  age: number;
  weightKg: number;
  heightCm: number;
  gender: Gender;
  bodyFatPercent: number;
  isBodyFatEstimated: boolean;
  leanBodyMassKg: number;
  fatMassKg: number;
  bmi: number;
  allFormulasBmr: Record<MetabolicFormulaId, number>;
  selectedFormulaBmr: number;
  tdeeGet: number; // Gasto Energético Total (GET)
  targetCalories: number; // Meta final com déficit/superávit
  targetProteinG: number;
  targetFatG: number;
  targetCarbG: number;
  targetFiberG: number;
  proteinKcal: number;
  fatKcal: number;
  carbKcal: number;
}

export function calculateMetabolicMetrics(
  client: Client,
  config: ClientMetabolicConfig
): MetabolicCalculationResult {
  const weightKg = Math.max(30, Number(client.weight) || 70);
  const heightCm = Math.max(120, Number(client.height) || 170);
  const age = calculateAgeFromBirthDate(client.birthDate);
  const gender: Gender = client.gender || 'Masculino';
  const isMale = gender === 'Masculino';

  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));

  const explicitBf =
    config.bodyFatPercent !== undefined && config.bodyFatPercent > 2 && config.bodyFatPercent < 65
      ? config.bodyFatPercent
      : client.bodyFatPercent !== undefined && client.bodyFatPercent > 2 && client.bodyFatPercent < 65
      ? client.bodyFatPercent
      : null;

  // Estimativa fisiológica caso o treinador ainda não tenha preenchido o %BF
  const estimatedBf = isMale ? 15 : 23;
  const bodyFatPercent = Number((explicitBf ?? estimatedBf).toFixed(1));
  const isBodyFatEstimated = explicitBf === null;

  const fatMassKg = Number(((weightKg * bodyFatPercent) / 100).toFixed(1));
  const leanBodyMassKg = Number((weightKg - fatMassKg).toFixed(1));

  // 1. Mifflin-St Jeor (1990)
  const mifflin = Math.round(
    10 * weightKg + 6.25 * heightCm - 5 * age + (isMale ? 5 : -161)
  );

  // 2. Harris-Benedict Revisada (Roza & Shizgal, 1984)
  const harris = Math.round(
    isMale
      ? 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age
      : 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age
  );

  // 3. Cunningham (1980)
  const cunningham = Math.round(500 + 22 * leanBodyMassKg);

  // 4. Katch-McArdle (1996)
  const katch = Math.round(370 + 21.6 * leanBodyMassKg);

  // 5. FAO / OMS (2004)
  let fao = mifflin;
  if (isMale) {
    if (age < 18) fao = Math.round(17.686 * weightKg + 658.2);
    else if (age <= 30) fao = Math.round(15.057 * weightKg + 692.2);
    else if (age <= 60) fao = Math.round(11.472 * weightKg + 873.1);
    else fao = Math.round(11.711 * weightKg + 587.7);
  } else {
    if (age < 18) fao = Math.round(13.384 * weightKg + 692.6);
    else if (age <= 30) fao = Math.round(14.818 * weightKg + 486.6);
    else if (age <= 60) fao = Math.round(8.126 * weightKg + 845.6);
    else fao = Math.round(9.082 * weightKg + 658.5);
  }

  // 6. Tinsley (2018) - Atletas e Hipertrofia (Peso Total e MLG)
  const tinsley_weight = Math.round(24.8 * weightKg + 10);
  const tinsley_lbm = Math.round(25.9 * leanBodyMassKg + 284);

  const allFormulasBmr: Record<MetabolicFormulaId, number> = {
    mifflin,
    harris,
    cunningham,
    katch,
    fao,
    tinsley_weight,
    tinsley_lbm,
  };

  const selectedFormulaBmr = allFormulasBmr[config.formula] || mifflin;
  const activityFactor = Number(config.activityFactor) || 1.55;
  const workoutCalories = Number(config.workoutCalories) || 0;

  const tdeeGet = Math.round(selectedFormulaBmr * activityFactor + workoutCalories);
  const targetCalories = Math.max(1000, Math.round(tdeeGet + (Number(config.goalDeltaKcal) || 0)));

  const proteinGPerKg = Math.max(0.8, Number(config.proteinGPerKg) || 2.0);
  const fatGPerKg = Math.max(0.4, Number(config.fatGPerKg) || 0.9);

  const targetProteinG = Math.round(weightKg * proteinGPerKg);
  const targetFatG = Math.round(weightKg * fatGPerKg);

  const proteinKcal = targetProteinG * 4;
  const fatKcal = targetFatG * 9;
  const remainingKcalForCarbs = Math.max(200, targetCalories - proteinKcal - fatKcal);
  const targetCarbG = Math.round(remainingKcalForCarbs / 4);
  const carbKcal = targetCarbG * 4;
  const targetFiberG = Math.max(15, Number(config.fiberTargetG) || 30);

  return {
    age,
    weightKg,
    heightCm,
    gender,
    bodyFatPercent,
    isBodyFatEstimated,
    leanBodyMassKg,
    fatMassKg,
    bmi,
    allFormulasBmr,
    selectedFormulaBmr,
    tdeeGet,
    targetCalories,
    targetProteinG,
    targetFatG,
    targetCarbG,
    targetFiberG,
    proteinKcal,
    fatKcal,
    carbKcal,
  };
}

export interface MicronutrientIDRItem {
  key: keyof NutrientProfile;
  label: string;
  unit: string;
  group: 'Minerais' | 'Vitaminas' | 'Perfil Lipídico & Colesterol';
  idrTarget: number;
  currentValue: number;
  percentOfIdr: number;
  isUpperLimit?: boolean; // ex: Sódio, Colesterol, Gordura Saturada
}

export function getMicronutrientIDRComparison(
  totals: NutrientProfile,
  gender: Gender,
  targetCalories: number
): MicronutrientIDRItem[] {
  const isMale = gender === 'Masculino';
  // Limite recomendado OMS para gordura saturada (~10% das kcal totais)
  const saturatedLimitG = Math.round((targetCalories * 0.1) / 9);

  const specs: {
    key: keyof NutrientProfile;
    label: string;
    unit: string;
    group: 'Minerais' | 'Vitaminas' | 'Perfil Lipídico & Colesterol';
    idrTarget: number;
    isUpperLimit?: boolean;
  }[] = [
    // Minerais
    { key: 'calciumMg', label: 'Cálcio (Ca)', unit: 'mg', group: 'Minerais', idrTarget: 1000 },
    {
      key: 'magnesiumMg',
      label: 'Magnésio (Mg)',
      unit: 'mg',
      group: 'Minerais',
      idrTarget: isMale ? 400 : 310,
    },
    { key: 'phosphorusMg', label: 'Fósforo (P)', unit: 'mg', group: 'Minerais', idrTarget: 700 },
    {
      key: 'ironMg',
      label: 'Ferro (Fe)',
      unit: 'mg',
      group: 'Minerais',
      idrTarget: isMale ? 8 : 18,
    },
    {
      key: 'potassiumMg',
      label: 'Potássio (K)',
      unit: 'mg',
      group: 'Minerais',
      idrTarget: isMale ? 3400 : 2600,
    },
    {
      key: 'sodiumMg',
      label: 'Sódio (Na) — Teto OMS',
      unit: 'mg',
      group: 'Minerais',
      idrTarget: 2000,
      isUpperLimit: true,
    },
    {
      key: 'zincMg',
      label: 'Zinco (Zn)',
      unit: 'mg',
      group: 'Minerais',
      idrTarget: isMale ? 11 : 8,
    },
    { key: 'copperMg', label: 'Cobre (Cu)', unit: 'mg', group: 'Minerais', idrTarget: 0.9 },
    {
      key: 'manganeseMg',
      label: 'Manganês (Mn)',
      unit: 'mg',
      group: 'Minerais',
      idrTarget: isMale ? 2.3 : 1.8,
    },
    // Vitaminas
    {
      key: 'vitaminCMg',
      label: 'Vitamina C (Ácido Ascórbico)',
      unit: 'mg',
      group: 'Vitaminas',
      idrTarget: isMale ? 90 : 75,
    },
    {
      key: 'retinolMcg',
      label: 'Vitamina A (Retinol)',
      unit: 'mcg',
      group: 'Vitaminas',
      idrTarget: isMale ? 900 : 700,
    },
    {
      key: 'thiamineMg',
      label: 'Vitamina B1 (Tiamina)',
      unit: 'mg',
      group: 'Vitaminas',
      idrTarget: isMale ? 1.2 : 1.1,
    },
    {
      key: 'riboflavinMg',
      label: 'Vitamina B2 (Riboflavina)',
      unit: 'mg',
      group: 'Vitaminas',
      idrTarget: isMale ? 1.3 : 1.1,
    },
    {
      key: 'niacinMg',
      label: 'Vitamina B3 (Niacina)',
      unit: 'mg',
      group: 'Vitaminas',
      idrTarget: isMale ? 16 : 14,
    },
    {
      key: 'pyridoxineMg',
      label: 'Vitamina B6 (Piridoxina)',
      unit: 'mg',
      group: 'Vitaminas',
      idrTarget: 1.3,
    },
    // Perfil Lipídico
    {
      key: 'saturatedG',
      label: 'Gorduras Saturadas (Máx 10% kcal)',
      unit: 'g',
      group: 'Perfil Lipídico & Colesterol',
      idrTarget: Math.max(15, saturatedLimitG),
      isUpperLimit: true,
    },
    {
      key: 'monounsaturatedG',
      label: 'Gorduras Monoinsaturadas',
      unit: 'g',
      group: 'Perfil Lipídico & Colesterol',
      idrTarget: Math.max(15, Math.round((targetCalories * 0.12) / 9)),
    },
    {
      key: 'polyunsaturatedG',
      label: 'Gorduras Poliinsaturadas',
      unit: 'g',
      group: 'Perfil Lipídico & Colesterol',
      idrTarget: Math.max(10, Math.round((targetCalories * 0.08) / 9)),
    },
    {
      key: 'cholesterolMg',
      label: 'Colesterol Alimentar (Teto)',
      unit: 'mg',
      group: 'Perfil Lipídico & Colesterol',
      idrTarget: 300,
      isUpperLimit: true,
    },
  ];

  return specs.map((s) => {
    const currentValue = Number((totals[s.key] || 0).toFixed(2));
    const percentOfIdr =
      s.idrTarget > 0 ? Math.round((currentValue / s.idrTarget) * 100) : 0;
    return {
      ...s,
      currentValue,
      percentOfIdr,
    };
  });
}

// ============================================================================
// UNIVERSAL & POF/IBGE HOUSEHOLD MEASURES LOADER
// ============================================================================

export function getUniversalMeasures(isLiquid: boolean = false): HouseholdMeasureOption[] {
  if (isLiquid) {
    return [
      {
        id: 'univ-ml',
        label: 'Mililitros (ml) — 1 ml',
        unitName: 'ml',
        grams: 1,
        source: 'universal',
      },
      {
        id: 'univ-l',
        label: 'Litros (L) — 1000 ml',
        unitName: 'L',
        grams: 1000,
        source: 'universal',
      },
      {
        id: 'univ-copo-200',
        label: 'Copo Americano (200 ml)',
        unitName: 'Copo americano',
        grams: 200,
        source: 'universal',
      },
      {
        id: 'univ-xicara-240',
        label: 'Xícara Padrão (240 ml)',
        unitName: 'Xícara',
        grams: 240,
        source: 'universal',
      },
      {
        id: 'univ-g',
        label: 'Gramas (g) — 1 g',
        unitName: 'g',
        grams: 1,
        source: 'universal',
      },
    ];
  }

  return [
    {
      id: 'univ-g',
      label: 'Gramas (g) — 1 g',
      unitName: 'g',
      grams: 1,
      source: 'universal',
    },
    {
      id: 'univ-porcao-100g',
      label: 'Porção de 100 g',
      unitName: 'Porção (100g)',
      grams: 100,
      source: 'universal',
    },
    {
      id: 'univ-kg',
      label: 'Quilogramas (kg) — 1000 g',
      unitName: 'kg',
      grams: 1000,
      source: 'universal',
    },
    {
      id: 'univ-ml',
      label: 'Mililitros (ml) — 1 ml',
      unitName: 'ml',
      grams: 1,
      source: 'universal',
    },
    {
      id: 'univ-l',
      label: 'Litros (L) — 1000 ml',
      unitName: 'L',
      grams: 1000,
      source: 'universal',
    },
  ];
}

export type PofPrepKey =
  | 'cru'
  | 'cozido'
  | 'grelhado'
  | 'assado'
  | 'frito'
  | 'milanesa'
  | 'refogado'
  | 'ensopado'
  | 'sopa'
  | 'mingau'
  | 'molho'
  | 'na';

export interface RawPofMeasureRow {
  foodCode: string;
  foodDesc: string;
  prepCode: string;
  prepDesc: string;
  formattedPrep: string;
  prepKey: PofPrepKey;
  measureCode: string;
  measureDesc: string;
  refMeasureCode: string;
  refMeasureDesc: string;
  grams: number;
  sourceCode: string;
  sourceDesc: string;
  isReference: boolean;
}

export interface PofFoodGroup {
  foodCode: string;
  foodDesc: string;
  normDesc: string;
  tokens: string[];
  categoryName: string;
  rows: RawPofMeasureRow[];
}

function normalizeFoodToken(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatPofPreparation(rawPrep: string): string {
  const clean = (rawPrep || '').trim().toUpperCase();
  if (!clean || clean === 'NAO SE APLICA') return '';
  if (clean === 'CRU(A)') return 'Cru(a)';
  if (clean === 'CROZIDO(A)' || clean === 'COZIDO(A)') return 'Cozido(a)';
  if (clean.includes('GRELHADO')) return 'Grelhado(a)/Churrasco';
  if (clean === 'ASSADO(A)') return 'Assado(a)';
  if (clean === 'FRITO(A)') return 'Frito(a)';
  if (clean.includes('MILANESA') || clean.includes('EMPANADO')) return 'À Milanesa/Empanado';
  if (clean === 'REFOGADO(A)') return 'Refogado(a)';
  if (clean === 'MOLHO VERMELHO') return 'Molho Vermelho';
  if (clean === 'MOLHO BRANCO') return 'Molho Branco';
  if (clean === 'AO ALHO E OLEO') return 'Alho e Óleo';
  if (clean === 'COM MANTEIGA/OLEO') return 'Com Manteiga/Óleo';
  if (clean === 'AO VINAGRETE') return 'Ao Vinagrete';
  if (clean === 'ENSOPADO') return 'Ensopado';
  if (clean === 'MINGAU') return 'Mingau';
  if (clean === 'SOPA') return 'Sopa';
  return clean.charAt(0) + clean.slice(1).toLowerCase();
}

export function detectPreparationKey(text: string): PofPrepKey {
  const norm = normalizeFoodToken(text);
  if (!norm) return 'na';
  if (/\b(grelhad[oa]|brasa|churrasco)\b/.test(norm)) return 'grelhado';
  if (/\b(milanesa|empanad[oa])\b/.test(norm)) return 'milanesa';
  if (/\b(frit[oa]|palito)\b/.test(norm)) return 'frito';
  if (/\b(assad[oa]|forno)\b/.test(norm)) return 'assado';
  if (/\b(refogad[oa])\b/.test(norm)) return 'refogado';
  if (/\b(ensopad[oa])\b/.test(norm)) return 'ensopado';
  if (/\b(cozid[oa]|crozid[oa]|vapor)\b/.test(norm)) return 'cozido';
  if (/\b(cru|crua|in natura|fresc[oa])\b/.test(norm)) return 'cru';
  if (/\b(mingau)\b/.test(norm)) return 'mingau';
  if (/\b(sopa)\b/.test(norm)) return 'sopa';
  if (/\b(molho)\b/.test(norm)) return 'molho';
  return 'na';
}

function inferPofCategoryFromCode(code: string): string {
  const prefix = code.slice(0, 2);
  switch (prefix) {
    case '63':
      return 'Cereais e Leguminosas (POF)';
    case '64':
      return 'Tubérculos e Raízes (POF)';
    case '65':
      return 'Farinhas, Féculas e Massas (POF)';
    case '66':
      return 'Cocos, Castanhas e Nozes (POF)';
    case '67':
      return 'Hortaliças e Folhosos (POF)';
    case '68':
      return 'Frutas (POF)';
    case '69':
      return 'Açúcares e Preparações Doces (POF)';
    case '70':
      return 'Sais e Condimentos (POF)';
    case '71':
      return 'Carnes e Vísceras (POF)';
    case '72':
    case '74':
    case '76':
      return 'Pescados e Frutos do Mar (POF)';
    case '77':
      return 'Enlatados e Conservas (POF)';
    case '78':
      return 'Aves e Ovos (POF)';
    case '79':
      return 'Laticínios e Queijos (POF)';
    case '80':
      return 'Panificados, Pães e Bolos (POF)';
    case '81':
      return 'Carnes Industrializadas e Embutidos (POF)';
    case '82':
    case '83':
      return 'Bebidas e Infusões (POF)';
    case '84':
      return 'Óleos e Gorduras (POF)';
    case '85':
    case '88':
      return 'Preparações e Pratos Prontos (POF)';
    default:
      return 'Alimentos POF/IBGE';
  }
}

const STOP_WORDS_FOR_MATCH = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'com',
  'sem',
  'em',
  'ou',
  'ao',
  'na',
  'no',
  'tipo',
  'qualquer',
  'marca',
  'sabor',
  'nao',
  'especificado',
  'especificada',
  'cru',
  'crua',
  'cozido',
  'cozida',
  'crozido',
  'grelhado',
  'grelhada',
  'assado',
  'assada',
  'frito',
  'frita',
  'refogado',
  'refogada',
  'ensopado',
  'ensopada',
  'milanesa',
  'empanado',
  'gordura',
  'pele',
  'sal',
  'acucar',
]);

// Mapa explícito de regras de correlação de alta prioridade (TACO -> código POF)
function getExplicitPofCodeForTaco(normTaco: string): string | null {
  if (normTaco.includes('arroz') && normTaco.includes('integral')) return '6300201';
  if (normTaco.startsWith('arroz ') || normTaco === 'arroz') return '6300101';
  if (normTaco.includes('batata') && normTaco.includes('doce')) return '6400401';
  if (normTaco.includes('batata') && (normTaco.includes('baroa') || normTaco.includes('mandioquinha')))
    return '6400303';
  if (normTaco.includes('mandioquinha')) return '6400303';
  if (normTaco.includes('batata') && normTaco.includes('palha')) return '8501503';
  if (normTaco.includes('batata')) return '6400101';
  if (normTaco.includes('mandioca') && normTaco.includes('farinha')) return '6501401';
  if (normTaco.includes('mandioca') || normTaco.includes('aipim') || normTaco.includes('macaxeira'))
    return '6400601';
  if (normTaco.includes('aveia') && normTaco.includes('farinha')) return '6500301';
  if (normTaco.includes('aveia')) return '6500401';
  if (normTaco.includes('feijao') && normTaco.includes('fradinho')) return '6301603';
  if (normTaco.includes('feijao') && normTaco.includes('corda')) return '6301603';
  if (normTaco.includes('feijao') && normTaco.includes('tropeiro')) return '8506101';
  if (normTaco.includes('feijao')) return '6303102';
  if (normTaco.includes('lentilha')) return '6302901';
  if (normTaco.includes('grao de bico')) return '6302801';
  if (normTaco.includes('ervilha') && normTaco.includes('vagem')) return '6705501';
  if (normTaco.includes('ervilha')) return '6301101';
  if (normTaco.includes('linhaca')) return '6302001';
  if (normTaco.includes('quinoa')) return '6304901';
  if (normTaco.includes('tapioca') || normTaco.includes('goma')) return '6501516';
  if (normTaco.includes('cuscuz')) return '6902901';
  if (normTaco.includes('granola')) return '6504101';
  if (normTaco.includes('macarrao') && normTaco.includes('instantaneo')) return '6504802';
  if (normTaco.includes('macarrao')) return '6503401';
  if (normTaco.includes('pao') && normTaco.includes('queijo')) return '8000801';
  if (normTaco.includes('pao') && normTaco.includes('forma') && normTaco.includes('integral'))
    return '8001401';
  if (normTaco.includes('pao') && normTaco.includes('integral')) return '8001401';
  if (normTaco.includes('pao') && normTaco.includes('forma')) return '8000501';
  if (normTaco.includes('pao') && normTaco.includes('hamburguer')) return '8000103';
  if (normTaco.includes('pao') && (normTaco.includes('frances') || normTaco.includes('sal')))
    return '8000105';
  if (normTaco.includes('pao') && normTaco.includes('milho')) return '8001101';
  if (normTaco.includes('pao') && normTaco.includes('doce')) return '8000201';
  if (normTaco.includes('torrada')) return '8001901';
  // Carnes Bovinas
  if (normTaco.includes('contra file') || normTaco.includes('contrafile')) return '7100201';
  if (normTaco.includes('file mignon') || normTaco.includes('file mingnon')) return '7100101';
  if (normTaco.includes('patinho')) return '7100501';
  if (normTaco.includes('alcatra') && normTaco.includes('suina')) return '7106501';
  if (normTaco.includes('alcatra')) return '7100301';
  if (normTaco.includes('maminha')) return '7100303';
  if (normTaco.includes('picanha')) return '7100304';
  if (normTaco.includes('acem')) return '7100801';
  if (normTaco.includes('lagarto')) return '7106401';
  if (normTaco.includes('musculo')) return '7101001';
  if (normTaco.includes('cupim')) return '7102601';
  if (normTaco.includes('fraldinha') || normTaco.includes('capa de file')) return '7101202';
  if (normTaco.includes('costela') && (normTaco.includes('suina') || normTaco.includes('porco')))
    return '7103501';
  if (normTaco.includes('costela')) return '7101301';
  if (normTaco.includes('paleta')) return '7100905';
  if (normTaco.includes('peito') && normTaco.includes('bovin')) return '7101101';
  if (normTaco.includes('figado') && normTaco.includes('bovin')) return '7102501';
  if (normTaco.includes('lingua') && normTaco.includes('bovin')) return '7102701';
  if (normTaco.includes('coracao') && (normTaco.includes('frango') || normTaco.includes('galinha')))
    return '7801202';
  if (normTaco.includes('coracao') && normTaco.includes('bovin')) return '7101901';
  if (normTaco.includes('charque')) return '8100102';
  if (normTaco.includes('carne') && normTaco.includes('seca')) return '8100101';
  if (normTaco.includes('carne') && normTaco.includes('sol')) return '8100201';
  if (normTaco.includes('carne') && normTaco.includes('moida')) return '7104301';
  if (normTaco.includes('almondega')) return '7702602';
  // Aves e Ovos
  if ((normTaco.includes('frango') || normTaco.includes('galinha')) && normTaco.includes('file'))
    return '7800402';
  if ((normTaco.includes('frango') || normTaco.includes('galinha')) && normTaco.includes('peito'))
    return '7800401';
  if ((normTaco.includes('frango') || normTaco.includes('galinha')) && normTaco.includes('asa'))
    return '7800701';
  if ((normTaco.includes('frango') || normTaco.includes('galinha')) && normTaco.includes('figado'))
    return '7801301';
  if ((normTaco.includes('frango') || normTaco.includes('galinha')) && normTaco.includes('moela'))
    return '7801101';
  if (normTaco.includes('frango') || normTaco.includes('galinha')) return '7800302';
  if (normTaco.includes('peru') && normTaco.includes('blanquet')) return '8102801';
  if (normTaco.includes('peru')) return '7801801';
  if (normTaco.includes('ovo') && normTaco.includes('codorna')) return '7803501';
  if (normTaco.includes('ovo')) return '7803301';
  if (normTaco.includes('omelete')) return '8506501';
  // Suínos e Embutidos
  if ((normTaco.includes('porco') || normTaco.includes('suin')) && normTaco.includes('bisteca'))
    return '7103305';
  if ((normTaco.includes('porco') || normTaco.includes('suin')) && normTaco.includes('lombo'))
    return '7103701';
  if ((normTaco.includes('porco') || normTaco.includes('suin')) && normTaco.includes('pernil'))
    return '7103401';
  if (normTaco.includes('porco') || normTaco.includes('suin')) return '7104101';
  if (normTaco.includes('linguica') && normTaco.includes('frango')) return '8102207';
  if (normTaco.includes('linguica')) return '8102204';
  if (normTaco.includes('salsicha')) return '8102101';
  if (normTaco.includes('presunto') || normTaco.includes('apresuntado')) return '8102901';
  if (normTaco.includes('mortadela')) return '8102601';
  if (normTaco.includes('salame')) return '8102701';
  if (normTaco.includes('bacon') || normTaco.includes('toucinho')) return '8101005';
  // Pescados
  if (normTaco.includes('atum') && normTaco.includes('conserva')) return '7703402';
  if (normTaco.includes('sardinha') && normTaco.includes('conserva')) return '7703002';
  if (normTaco.includes('bacalhau')) return '7270401';
  if (normTaco.includes('camarao')) return '7260101';
  if (
    normTaco.includes('pescada') ||
    normTaco.includes('merluza') ||
    normTaco.includes('corvina') ||
    normTaco.includes('salmao') ||
    normTaco.includes('sardinha') ||
    normTaco.includes('atum') ||
    normTaco.includes('cacao') ||
    normTaco.includes('tainha') ||
    normTaco.includes('abadejo') ||
    normTaco.includes('linguado') ||
    normTaco.includes('peixe')
  ) {
    return '7200101';
  }
  if (
    normTaco.includes('pintado') ||
    normTaco.includes('tilapia') ||
    normTaco.includes('lambari') ||
    normTaco.includes('pacu') ||
    normTaco.includes('tucunare') ||
    normTaco.includes('dourada') ||
    normTaco.includes('traíra') ||
    normTaco.includes('traira')
  ) {
    return '7400101';
  }
  // Laticínios
  if (normTaco.includes('leite') && normTaco.includes('po') && normTaco.includes('desnatado'))
    return '7900710';
  if (normTaco.includes('leite') && normTaco.includes('po')) return '7900601';
  if (normTaco.includes('leite') && normTaco.includes('condensado')) return '7900901';
  if (normTaco.includes('leite') && normTaco.includes('coco')) return '7003801';
  if (normTaco.includes('creme de leite')) return '7901001';
  if (normTaco.includes('leite') && normTaco.includes('desnatado')) return '7903601';
  if (normTaco.includes('leite') && normTaco.includes('semidesnatado')) return '7903702';
  if (normTaco.includes('leite')) return '7900101';
  if (normTaco.includes('iogurte') && normTaco.includes('desnatado')) return '7901203';
  if (normTaco.includes('iogurte')) return '7901204';
  if (normTaco.includes('queijo') && normTaco.includes('minas') && normTaco.includes('light'))
    return '7906001';
  if (normTaco.includes('queijo') && normTaco.includes('minas')) return '7902001';
  if (normTaco.includes('queijo') && normTaco.includes('prato')) return '7901701';
  if (normTaco.includes('queijo') && (normTaco.includes('mozarela') || normTaco.includes('mussarela')))
    return '7901803';
  if (normTaco.includes('queijo') && normTaco.includes('ricota') && normTaco.includes('light'))
    return '7906201';
  if (normTaco.includes('queijo') && normTaco.includes('ricota')) return '7902201';
  if (normTaco.includes('queijo') && normTaco.includes('parmesao')) return '7902403';
  if (normTaco.includes('queijo') && normTaco.includes('provolone')) return '7902501';
  if (normTaco.includes('queijo') && normTaco.includes('coalho')) return '7902005';
  if (normTaco.includes('requeijao') && normTaco.includes('light')) return '7906501';
  if (normTaco.includes('requeijao')) return '7902901';
  if (normTaco.includes('manteiga')) return '7901501';
  if (normTaco.includes('margarina')) return '7901602';
  // Hortaliças & Frutas
  if (normTaco.includes('couve') && normTaco.includes('flor')) return '6700601';
  if (normTaco.includes('couve')) return '6700501';
  if (normTaco.includes('brocolis') || normTaco.includes('brocolo')) return '6701704';
  if (normTaco.includes('alface')) return '6700101';
  if (normTaco.includes('rucula')) return '6702001';
  if (normTaco.includes('agriao')) return '6701301';
  if (normTaco.includes('espinafre')) return '6700701';
  if (normTaco.includes('repolho')) return '6700901';
  if (normTaco.includes('cenoura')) return '6401201';
  if (normTaco.includes('beterraba')) return '6401101';
  if (normTaco.includes('abobrinha')) return '6703701';
  if (normTaco.includes('abobora') || normTaco.includes('moranga') || normTaco.includes('jerimum'))
    return '6703901';
  if (normTaco.includes('chuchu')) return '6704101';
  if (normTaco.includes('pepino')) return '6704001';
  if (normTaco.includes('tomate')) return '6705101';
  if (normTaco.includes('banana')) return '6801101';
  if (normTaco.includes('maca')) return '6803001';
  if (normTaco.includes('laranja')) return '6801801';
  if (normTaco.includes('mamao') || normTaco.includes('papaia')) return '6803101';
  if (normTaco.includes('manga')) return '6803201';
  if (normTaco.includes('abacaxi')) return '6802601';
  if (normTaco.includes('abacate')) return '6802701';
  if (normTaco.includes('melancia')) return '6803401';
  if (normTaco.includes('melao')) return '6803501';
  if (normTaco.includes('morango')) return '6805201';
  if (normTaco.includes('uva') && normTaco.includes('passa')) return '6803912';
  if (normTaco.includes('uva')) return '6803901';
  if (normTaco.includes('pera')) return '6803601';
  if (normTaco.includes('kiwi')) return '6807801';
  if (normTaco.includes('goiaba')) return '6804201';
  if (normTaco.includes('acai')) return '6601706';
  if (normTaco.includes('azeite')) return '8400101';
  if (normTaco.includes('mel') && !normTaco.includes('melancia') && !normTaco.includes('melao'))
    return '6901602';
  return null;
}

function correlateTacoWithPofGroup(
  tacoName: string,
  pofGroupsByCode: Map<string, PofFoodGroup>,
  allPofGroups: PofFoodGroup[]
): PofFoodGroup | null {
  const normTaco = normalizeFoodToken(tacoName);
  const explicitCode = getExplicitPofCodeForTaco(normTaco);
  if (explicitCode && pofGroupsByCode.has(explicitCode)) {
    return pofGroupsByCode.get(explicitCode)!;
  }

  const tacoTokens = normTaco
    .split(' ')
    .filter((t) => t.length >= 3 && !STOP_WORDS_FOR_MATCH.has(t));

  if (tacoTokens.length === 0) return null;

  let bestGroup: PofFoodGroup | null = null;
  let bestScore = 0;

  for (const group of allPofGroups) {
    let score = 0;
    // Bônus alto se o primeiro token significativo coincidir
    if (group.tokens[0] && tacoTokens[0] === group.tokens[0]) {
      score += 18;
    } else if (group.tokens.includes(tacoTokens[0])) {
      score += 10;
    }

    let matchedTokenCount = 0;
    for (const tk of tacoTokens) {
      if (group.tokens.includes(tk)) {
        score += 12;
        matchedTokenCount++;
      }
    }

    // Penalizar se o grupo POF for "light" ou "diet" mas o item TACO não for
    const tacoIsLightOrDiet = normTaco.includes('light') || normTaco.includes('diet');
    const pofIsLightOrDiet =
      group.normDesc.includes('light') || group.normDesc.includes('diet');
    if (tacoIsLightOrDiet !== pofIsLightOrDiet) {
      score -= 10;
    }

    if (matchedTokenCount > 0 && score > bestScore) {
      bestScore = score;
      bestGroup = group;
    }
  }

  return bestScore >= 12 ? bestGroup : null;
}

function formatMeasureTitleCase(raw: string): string {
  const clean = (raw || '').trim();
  if (!clean) return 'Porção';
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

export function buildPrioritizedPofMeasures(
  group: PofFoodGroup,
  targetPrepKey: PofPrepKey,
  isLiquid: boolean
): HouseholdMeasureOption[] {
  // Se o alimento tem um preparo específico (ex: 'cozido', 'grelhado'), verificamos se o grupo POF tem linhas desse preparo
  const hasTargetPrepRows =
    targetPrepKey !== 'na' && group.rows.some((r) => r.prepKey === targetPrepKey);

  // Construir e classificar opções POF
  const scoredOptions: {
    option: HouseholdMeasureOption;
    priorityBucket: number;
  }[] = [];

  const seenKeySet = new Set<string>();

  for (const row of group.rows) {
    const isPrepMatch = hasTargetPrepRows
      ? row.prepKey === targetPrepKey
      : row.prepKey === 'na' || row.prepKey === targetPrepKey;

    const cleanMeasure = formatMeasureTitleCase(row.measureDesc);
    const prepLabel = row.formattedPrep;
    const sourceDetail = row.sourceDesc ? row.sourceDesc.trim() : '';

    // Chave de deduplicação por nome da medida + preparo + gramatura
    const dedupKey = `${cleanMeasure.toLowerCase()}|${row.prepKey}|${Math.round(row.grams * 10)}`;
    if (seenKeySet.has(dedupKey)) continue;
    seenKeySet.add(dedupKey);

    const refStar = row.isReference ? '★ ' : '';
    const prepBadge = prepLabel ? ` · ${prepLabel}` : '';
    const sourceSuffix = sourceDetail ? ` — ${sourceDetail}` : '';

    // Rótulo completo com nome da medida, preparo, gramas e detalhe da fonte
    const fullLabel = `${refStar}${cleanMeasure}${prepBadge} (${row.grams}g${sourceSuffix})`;

    // Nome compacto para exibição na linha do item prescrito
    const unitNameWithPrep =
      prepLabel && !isPrepMatch ? `${cleanMeasure} (${prepLabel})` : cleanMeasure;

    let priorityBucket = 5;
    if (isPrepMatch && row.isReference) {
      priorityBucket = 1; // 1º: Medida de referência POF do mesmo preparo
    } else if (isPrepMatch) {
      priorityBucket = 2; // 2º: Demais medidas do mesmo preparo
    } else if (row.isReference && row.prepKey === 'na') {
      priorityBucket = 3; // 3º: Medida de referência geral
    } else if (row.prepKey === 'na') {
      priorityBucket = 4; // 4º: Medidas gerais (Não se aplica) como apoio
    } else {
      priorityBucket = 5; // 5º: Outros modos de preparo como apoio
    }

    scoredOptions.push({
      priorityBucket,
      option: {
        id: `pof-${group.foodCode}-${row.prepCode}-${row.measureCode}-${Math.round(row.grams * 10)}`,
        unitName: unitNameWithPrep,
        label: fullLabel,
        grams: row.grams,
        source: 'pof',
        preparation: prepLabel || undefined,
        sourceDescription: sourceDetail || undefined,
        pofFoodCode: group.foodCode,
        pofFoodDescription: group.foodDesc,
        pofMeasureCode: row.measureCode,
        isReferenceMeasure: row.isReference,
        isPreparationMatch: isPrepMatch,
      },
    });
  }

  scoredOptions.sort((a, b) => {
    if (a.priorityBucket !== b.priorityBucket) {
      return a.priorityBucket - b.priorityBucket;
    }
    return a.option.unitName.localeCompare(b.option.unitName);
  });

  const sortedPofOptions = scoredOptions.slice(0, 28).map((s) => s.option);
  return [...sortedPofOptions, ...getUniversalMeasures(isLiquid)];
}

// Estima perfil nutricional por 100g para alimentos exclusivos da POF não presentes diretamente na TACO
function estimateNutrientsForPofExclusiveFood(
  group: PofFoodGroup,
  tacoFoods: NutritionFoodItem[]
): NutrientProfile {
  // Tentar encontrar alimento da mesma família na TACO para herdar perfil de macro e micronutrientes
  const norm = group.normDesc;
  const firstToken = group.tokens[0];
  if (firstToken) {
    const matchedTaco = tacoFoods.find((tf) =>
      normalizeFoodToken(tf.name).split(' ').includes(firstToken)
    );
    if (matchedTaco) {
      return { ...matchedTaco.nutrientsPer100 };
    }
  }

  const prefix = group.foodCode.slice(0, 2);
  if (norm.includes('tapioca') || norm.includes('goma') || norm.includes('beiju')) {
    return {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 240,
      carbohydrateG: 58.5,
      proteinG: 0.6,
      lipidG: 0.2,
      fiberG: 0.4,
      calciumMg: 12,
      ironMg: 0.5,
    };
  }
  if (norm.includes('cuscuz')) {
    return {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 113,
      carbohydrateG: 25.3,
      proteinG: 2.2,
      lipidG: 0.7,
      fiberG: 2.1,
      magnesiumMg: 18,
    };
  }
  if (norm.includes('granola') || norm.includes('musli') || norm.includes('cereal matinal')) {
    return {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 421,
      carbohydrateG: 71.4,
      proteinG: 9.8,
      lipidG: 10.6,
      fiberG: 7.5,
      ironMg: 3.4,
      magnesiumMg: 92,
    };
  }
  if (norm.includes('proteina de soja') || norm.includes('carne de soja')) {
    return {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 336,
      carbohydrateG: 28.5,
      proteinG: 50.0,
      lipidG: 1.8,
      fiberG: 16.5,
      calciumMg: 240,
      ironMg: 8.2,
    };
  }
  if (norm.includes('acai')) {
    return {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 110,
      carbohydrateG: 16.2,
      proteinG: 1.5,
      lipidG: 4.4,
      fiberG: 2.6,
      calciumMg: 35,
      potassiumMg: 124,
    };
  }

  switch (prefix) {
    case '63':
    case '65':
      return {
        ...EMPTY_NUTRIENT_PROFILE,
        energyKcal: 135,
        carbohydrateG: 27.5,
        proteinG: 4.2,
        lipidG: 1.1,
        fiberG: 3.2,
      };
    case '64':
      return {
        ...EMPTY_NUTRIENT_PROFILE,
        energyKcal: 92,
        carbohydrateG: 21.4,
        proteinG: 1.4,
        lipidG: 0.2,
        fiberG: 2.2,
      };
    case '66':
      return {
        ...EMPTY_NUTRIENT_PROFILE,
        energyKcal: 570,
        carbohydrateG: 16.0,
        proteinG: 15.5,
        lipidG: 50.0,
        fiberG: 7.2,
      };
    case '67':
      return {
        ...EMPTY_NUTRIENT_PROFILE,
        energyKcal: 26,
        carbohydrateG: 4.8,
        proteinG: 1.6,
        lipidG: 0.2,
        fiberG: 2.4,
      };
    case '68':
      return {
        ...EMPTY_NUTRIENT_PROFILE,
        energyKcal: 58,
        carbohydrateG: 14.2,
        proteinG: 0.8,
        lipidG: 0.2,
        fiberG: 2.1,
      };
    case '71':
    case '78':
    case '81':
      return {
        ...EMPTY_NUTRIENT_PROFILE,
        energyKcal: 185,
        carbohydrateG: 0.5,
        proteinG: 26.8,
        lipidG: 8.4,
        fiberG: 0,
      };
    case '72':
    case '74':
    case '76':
      return {
        ...EMPTY_NUTRIENT_PROFILE,
        energyKcal: 132,
        carbohydrateG: 0,
        proteinG: 22.5,
        lipidG: 4.2,
        fiberG: 0,
      };
    case '79':
      return {
        ...EMPTY_NUTRIENT_PROFILE,
        energyKcal: 148,
        carbohydrateG: 4.5,
        proteinG: 9.6,
        lipidG: 10.2,
        fiberG: 0,
        calciumMg: 290,
      };
    case '80':
      return {
        ...EMPTY_NUTRIENT_PROFILE,
        energyKcal: 285,
        carbohydrateG: 52.0,
        proteinG: 8.2,
        lipidG: 4.8,
        fiberG: 2.6,
      };
    default:
      return {
        ...EMPTY_NUTRIENT_PROFILE,
        energyKcal: 140,
        carbohydrateG: 18.0,
        proteinG: 6.5,
        lipidG: 4.5,
        fiberG: 1.8,
      };
  }
}

let cachedTacoAndPofFoods: NutritionFoodItem[] | null = null;
let cachedPofGroups: PofFoodGroup[] | null = null;
let loadingPromise: Promise<NutritionFoodItem[]> | null = null;

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function getLoadedPofGroups(): PofFoodGroup[] {
  return cachedPofGroups || [];
}

export async function loadOfficialNutritionDatabase(): Promise<NutritionFoodItem[]> {
  if (cachedTacoAndPofFoods) {
    return cachedTacoAndPofFoods;
  }
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      const [tacoRes, pofRes] = await Promise.all([
        fetch('/assets/aistudio/tabela_alimentos_9df259cc.json'),
        fetch('/assets/aistudio/pof_medidas_caseiras_baf30028.csv'),
      ]);

      const rawTaco: Record<string, unknown>[] = tacoRes.ok ? await tacoRes.json() : [];
      const pofText: string = pofRes.ok ? await pofRes.text() : '';

      // 1. Parsear todas as 11 colunas da tabela POF/IBGE agrupadas por codigo_alimento
      const pofGroupsByCode = new Map<string, PofFoodGroup>();

      if (pofText) {
        const lines = pofText.split(/\r?\n/);
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          const cols = parseCsvRow(line);
          if (cols.length < 9) continue;

          const foodCode = (cols[0] || '').trim();
          const foodDesc = (cols[1] || '').trim();
          const prepCode = (cols[2] || '').trim();
          const prepDesc = (cols[3] || '').trim();
          const measureCode = (cols[4] || '').trim();
          const measureDesc = (cols[5] || '').trim();
          const refMeasureCode = (cols[6] || '').trim();
          const refMeasureDesc = (cols[7] || '').trim();
          const gramsVal = parseFloat(cols[8] || '0');
          const sourceCode = (cols[9] || '').trim();
          const sourceDesc = (cols[10] || '').trim();

          if (!foodCode || !foodDesc || !measureDesc || !Number.isFinite(gramsVal) || gramsVal <= 0) {
            continue;
          }
          // Ignorar Grama e Quilo duplicados da POF pois já incluímos nas medidas universais
          if (measureDesc === 'GRAMA' || measureDesc === 'QUILO') continue;

          const isReference =
            Number.isFinite(parseFloat(measureCode)) &&
            Number.isFinite(parseFloat(refMeasureCode)) &&
            Math.round(parseFloat(measureCode)) === Math.round(parseFloat(refMeasureCode));

          const formattedPrep = formatPofPreparation(prepDesc);
          const prepKey = detectPreparationKey(prepDesc);

          let group = pofGroupsByCode.get(foodCode);
          if (!group) {
            const normDesc = normalizeFoodToken(foodDesc);
            const tokens = normDesc
              .split(' ')
              .filter((t) => t.length >= 2 && !STOP_WORDS_FOR_MATCH.has(t));
            group = {
              foodCode,
              foodDesc,
              normDesc,
              tokens,
              categoryName: inferPofCategoryFromCode(foodCode),
              rows: [],
            };
            pofGroupsByCode.set(foodCode, group);
          }

          group.rows.push({
            foodCode,
            foodDesc,
            prepCode,
            prepDesc,
            formattedPrep,
            prepKey,
            measureCode,
            measureDesc,
            refMeasureCode,
            refMeasureDesc,
            grams: gramsVal,
            sourceCode,
            sourceDesc,
            isReference,
          });
        }
      }

      const allPofGroups = Array.from(pofGroupsByCode.values());
      cachedPofGroups = allPofGroups;

      // 2. Processar alimentos TACO e correlacionar com o grupo POF + modo de preparo
      const parsedTacoFoods: NutritionFoodItem[] = rawTaco.map((item, idx) => {
        const name = String(item.description || `Alimento ${idx + 1}`).trim();
        const category = String(item.category || 'Outros').trim();
        const isLiquid =
          category.toLowerCase().includes('bebida') ||
          category.toLowerCase().includes('leite') ||
          name.toLowerCase().includes('suco') ||
          name.toLowerCase().includes('água') ||
          name.toLowerCase().includes('leite,');

        const detectedPrep = detectPreparationKey(name);
        const correlatedGroup = correlateTacoWithPofGroup(
          name,
          pofGroupsByCode,
          allPofGroups
        );

        let measures: HouseholdMeasureOption[];
        if (correlatedGroup && correlatedGroup.rows.length > 0) {
          measures = buildPrioritizedPofMeasures(correlatedGroup, detectedPrep, isLiquid);
        } else {
          measures = [
            {
              id: 'std-colher-sopa',
              unitName: 'Colher de sopa',
              label: '★ Colher de sopa média (25g — Medida caseira padrão)',
              grams: 25,
              source: 'pof',
              sourceDescription: 'Medida caseira padrão — colher de sopa média',
              isReferenceMeasure: true,
              isPreparationMatch: true,
            },
            {
              id: 'std-colher-servir',
              unitName: 'Colher de arroz/servir',
              label: 'Colher de arroz/servir (50g — Medida caseira padrão)',
              grams: 50,
              source: 'pof',
              sourceDescription: 'Medida caseira padrão — colher de servir',
            },
            {
              id: 'std-unidade-media',
              unitName: 'Unidade / Porção',
              label: 'Unidade / Porção média (80g — Medida caseira padrão)',
              grams: 80,
              source: 'pof',
              sourceDescription: 'Medida caseira padrão — porção média',
            },
            ...getUniversalMeasures(isLiquid),
          ];
        }

        const nutrientsPer100: NutrientProfile = {
          energyKcal: parseNumericNutrient(item.energy_kcal),
          proteinG: parseNumericNutrient(item.protein_g),
          carbohydrateG: parseNumericNutrient(item.carbohydrate_g),
          lipidG: parseNumericNutrient(item.lipid_g),
          fiberG: parseNumericNutrient(item.fiber_g),
          cholesterolMg: parseNumericNutrient(item.cholesterol_mg),
          saturatedG: parseNumericNutrient(item.saturated_g),
          monounsaturatedG: parseNumericNutrient(item.monounsaturated_g),
          polyunsaturatedG: parseNumericNutrient(item.polyunsaturated_g),
          calciumMg: parseNumericNutrient(item.calcium_mg),
          magnesiumMg: parseNumericNutrient(item.magnesium_mg),
          manganeseMg: parseNumericNutrient(item.manganese_mg),
          phosphorusMg: parseNumericNutrient(item.phosphorus_mg),
          ironMg: parseNumericNutrient(item.iron_mg),
          sodiumMg: parseNumericNutrient(item.sodium_mg),
          potassiumMg: parseNumericNutrient(item.potassium_mg),
          copperMg: parseNumericNutrient(item.copper_mg),
          zincMg: parseNumericNutrient(item.zinc_mg),
          retinolMcg: parseNumericNutrient(item.retinol_mcg),
          thiamineMg: parseNumericNutrient(item.thiamine_mg),
          riboflavinMg: parseNumericNutrient(item.riboflavin_mg),
          pyridoxineMg: parseNumericNutrient(item.pyridoxine_mg),
          niacinMg: parseNumericNutrient(item.niacin_mg),
          vitaminCMg: parseNumericNutrient(item.vitaminC_mg),
        };

        return {
          id: `taco-${item.id ?? idx + 1}`,
          name,
          category,
          isCustom: false,
          origin: 'taco',
          pofCode: correlatedGroup?.foodCode,
          pofDescription: correlatedGroup?.foodDesc,
          preparationMethod:
            detectedPrep !== 'na'
              ? detectedPrep.charAt(0).toUpperCase() + detectedPrep.slice(1)
              : undefined,
          baseUnit: isLiquid ? '100ml' : '100g',
          nutrientsPer100,
          measures,
        };
      });

      // 3. Cadastrar todos os alimentos e preparações da POF como alimentos selecionáveis no banco nutricional
      const existingNormNames = new Set(
        parsedTacoFoods.map((f) => normalizeFoodToken(f.name))
      );

      const pofStandaloneFoods: NutritionFoodItem[] = [];
      for (const group of allPofGroups) {
        if (group.rows.length === 0) continue;
        if (existingNormNames.has(group.normDesc)) continue;

        const isLiquid =
          group.foodCode.startsWith('79') ||
          group.foodCode.startsWith('82') ||
          group.foodCode.startsWith('83') ||
          group.normDesc.includes('suco') ||
          group.normDesc.includes('vitamina') ||
          group.normDesc.includes('refresco') ||
          group.normDesc.includes('agua') ||
          group.normDesc.includes('cafe') ||
          group.normDesc.includes('leite');

        const readableName =
          group.foodDesc.charAt(0).toUpperCase() +
          group.foodDesc.slice(1).toLowerCase();

        const pofMeasures = buildPrioritizedPofMeasures(group, 'na', isLiquid);
        const estimatedNutrients = estimateNutrientsForPofExclusiveFood(
          group,
          parsedTacoFoods
        );

        pofStandaloneFoods.push({
          id: `pof-food-${group.foodCode}`,
          name: `${readableName} (POF #${group.foodCode})`,
          category: group.categoryName,
          isCustom: false,
          origin: 'pof',
          pofCode: group.foodCode,
          pofDescription: group.foodDesc,
          baseUnit: isLiquid ? '100ml' : '100g',
          nutrientsPer100: estimatedNutrients,
          measures: pofMeasures,
        });
      }

      const combinedDatabase = [...parsedTacoFoods, ...pofStandaloneFoods];
      cachedTacoAndPofFoods = combinedDatabase;
      return combinedDatabase;
    } catch (error) {
      console.error('Error loading official nutrition database:', error);
      return [];
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

// ============================================================================
// DYNAMIC SUBSTITUTION & EQUIVALENCE CALCULATOR
// ============================================================================

export interface SubstitutionComparisonResult {
  mode: SubstitutionEquivalenceMode;
  suggestedQuantity: number;
  suggestedGrams: number;
  measureLabel: string;
  originalNutrients: NutrientProfile;
  substituteNutrients: NutrientProfile;
  diffs: {
    energyKcal: number;
    carbohydrateG: number;
    proteinG: number;
    lipidG: number;
    fiberG: number;
  };
}

export function calculateSubstitutionComparison(params: {
  originalNutrients: NutrientProfile;
  targetType: 'food' | 'recipe';
  foodItem?: NutritionFoodItem;
  selectedMeasure?: HouseholdMeasureOption;
  recipe?: NutritionRecipe;
  mode: SubstitutionEquivalenceMode;
  manualQuantity?: number;
}): SubstitutionComparisonResult {
  const {
    originalNutrients,
    targetType,
    foodItem,
    selectedMeasure,
    recipe,
    mode,
    manualQuantity,
  } = params;

  let suggestedQuantity = manualQuantity && manualQuantity > 0 ? manualQuantity : 1;
  let suggestedGrams = 100;
  let measureLabel = 'Porção';
  let substituteNutrients: NutrientProfile = { ...EMPTY_NUTRIENT_PROFILE };

  if (targetType === 'food' && foodItem) {
    const measure = selectedMeasure || foodItem.measures[0] || {
      id: 'univ-g',
      unitName: 'g',
      label: 'Gramas (g)',
      grams: 1,
      source: 'universal',
    };
    measureLabel = measure.unitName;

    if (mode === 'fixed_portion') {
      suggestedQuantity =
        manualQuantity && manualQuantity > 0
          ? manualQuantity
          : measure.unitName === 'g' || measure.unitName === 'ml'
          ? 100
          : 1;
      suggestedGrams = Number((suggestedQuantity * measure.grams).toFixed(1));
    } else {
      // Cálculo de equivalência automática baseado em 100g do alimento alvo
      const per100 = foodItem.nutrientsPer100;
      let targetGrams = 100;

      if (mode === 'auto_kcal' && per100.energyKcal > 0) {
        targetGrams = (originalNutrients.energyKcal / per100.energyKcal) * 100;
      } else if (mode === 'auto_carb' && per100.carbohydrateG > 0.5) {
        targetGrams = (originalNutrients.carbohydrateG / per100.carbohydrateG) * 100;
      } else if (mode === 'auto_protein' && per100.proteinG > 0.5) {
        targetGrams = (originalNutrients.proteinG / per100.proteinG) * 100;
      } else if (mode === 'auto_fat' && per100.lipidG > 0.5) {
        targetGrams = (originalNutrients.lipidG / per100.lipidG) * 100;
      } else if (per100.energyKcal > 0) {
        targetGrams = (originalNutrients.energyKcal / per100.energyKcal) * 100;
      }

      targetGrams = Math.max(5, Math.min(1200, targetGrams));
      if (measure.grams <= 1) {
        suggestedQuantity = Math.round(targetGrams);
        suggestedGrams = suggestedQuantity;
      } else {
        // Arredondar para múltiplos de 0.5 da medida caseira para praticidade clínica
        suggestedQuantity = Math.max(
          0.5,
          Math.round((targetGrams / measure.grams) * 2) / 2
        );
        suggestedGrams = Number((suggestedQuantity * measure.grams).toFixed(1));
      }
    }

    substituteNutrients = scaleNutrients(foodItem.nutrientsPer100, suggestedGrams);
  } else if (targetType === 'recipe' && recipe) {
    measureLabel = 'Porção da Receita';
    const perServing = recipe.nutrientsPerServing;
    const baseServingWeight = recipe.servingWeightG || 180;

    if (mode === 'fixed_portion') {
      suggestedQuantity = manualQuantity && manualQuantity > 0 ? manualQuantity : 1;
    } else {
      let ratio = 1;
      if (mode === 'auto_kcal' && perServing.energyKcal > 0) {
        ratio = originalNutrients.energyKcal / perServing.energyKcal;
      } else if (mode === 'auto_carb' && perServing.carbohydrateG > 0.5) {
        ratio = originalNutrients.carbohydrateG / perServing.carbohydrateG;
      } else if (mode === 'auto_protein' && perServing.proteinG > 0.5) {
        ratio = originalNutrients.proteinG / perServing.proteinG;
      } else if (mode === 'auto_fat' && perServing.lipidG > 0.5) {
        ratio = originalNutrients.lipidG / perServing.lipidG;
      } else if (perServing.energyKcal > 0) {
        ratio = originalNutrients.energyKcal / perServing.energyKcal;
      }
      // Arredondar porções para intervalos de 0.25 porção
      suggestedQuantity = Math.max(0.25, Math.min(6, Math.round(ratio * 4) / 4));
    }

    suggestedGrams = Math.round(suggestedQuantity * baseServingWeight);
    substituteNutrients = scaleNutrients(perServing, suggestedQuantity * 100);
  }

  return {
    mode,
    suggestedQuantity,
    suggestedGrams,
    measureLabel,
    originalNutrients,
    substituteNutrients,
    diffs: {
      energyKcal: Number(
        (substituteNutrients.energyKcal - originalNutrients.energyKcal).toFixed(1)
      ),
      carbohydrateG: Number(
        (substituteNutrients.carbohydrateG - originalNutrients.carbohydrateG).toFixed(1)
      ),
      proteinG: Number(
        (substituteNutrients.proteinG - originalNutrients.proteinG).toFixed(1)
      ),
      lipidG: Number((substituteNutrients.lipidG - originalNutrients.lipidG).toFixed(1)),
      fiberG: Number((substituteNutrients.fiberG - originalNutrients.fiberG).toFixed(1)),
    },
  };
}

// ============================================================================
// DEFAULT PROFESSIONAL LIBRARY (CUSTOM FOODS, CATEGORIZED RECIPES, TEMPLATES)
// ============================================================================

export const DEFAULT_CUSTOM_PORTIONS: CustomPortionRecord[] = [
  {
    id: 'cp-scoop-whey',
    name: '1 Scoop Padrão de Whey (30g)',
    unitName: 'Scoop (30g)',
    grams: 30,
    applicableCategory: 'Suplementos',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cp-fatia-pao',
    name: '1 Fatia de Pão de Forma (25g)',
    unitName: 'Fatia (25g)',
    grams: 25,
    applicableCategory: 'Cereais e derivados',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cp-file-medio',
    name: '1 Filé Médio Grelhado (120g)',
    unitName: 'Filé médio (120g)',
    grams: 120,
    applicableCategory: 'Carnes e derivados',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const DEFAULT_CUSTOM_FOODS: NutritionFoodItem[] = [
  {
    id: 'custom-whey-concentrado',
    name: 'Whey Protein Concentrado 80% (Padrão)',
    category: 'Suplementos Esportivos',
    isCustom: true,
    baseUnit: '100g',
    nutrientsPer100: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 400,
      proteinG: 80,
      carbohydrateG: 8.5,
      lipidG: 5.5,
      fiberG: 0,
      calciumMg: 420,
      sodiumMg: 190,
      potassiumMg: 480,
      magnesiumMg: 65,
      phosphorusMg: 310,
    },
    measures: [
      {
        id: 'm-scoop-30',
        unitName: 'Scoop (30g)',
        label: 'Scoop dosador padrão (30g)',
        grams: 30,
        source: 'custom',
      },
      ...getUniversalMeasures(false),
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'custom-pasta-amendoim',
    name: 'Pasta de Amendoim Integral sem Açúcar',
    category: 'Gorduras & Oleaginosas',
    isCustom: true,
    baseUnit: '100g',
    nutrientsPer100: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 595,
      proteinG: 26.5,
      carbohydrateG: 18.0,
      lipidG: 49.0,
      fiberG: 8.2,
      monounsaturatedG: 24.5,
      polyunsaturatedG: 15.2,
      saturatedG: 6.8,
      magnesiumMg: 168,
      potassiumMg: 650,
      zincMg: 3.3,
      ironMg: 1.9,
      niacinMg: 12.0,
    },
    measures: [
      {
        id: 'm-colher-sopa-15',
        unitName: 'Colher de sopa (15g)',
        label: 'Colher de sopa rasa (15g)',
        grams: 15,
        source: 'custom',
      },
      {
        id: 'm-colher-sopa-cheia-25',
        unitName: 'Colher de sopa cheia (25g)',
        label: 'Colher de sopa cheia (25g)',
        grams: 25,
        source: 'custom',
      },
      ...getUniversalMeasures(false),
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const DEFAULT_SYSTEM_RECIPES: NutritionRecipe[] = [
  {
    id: 'rec-crepioca-frango',
    name: 'Crepioca Proteica com Frango Desfiado e Ricota',
    category: 'Café da Manhã',
    servings: 1,
    servingWeightG: 185,
    prepTimeMinutes: 10,
    instructions:
      'Bata 1 ovo inteiro com 2 colheres de sopa de goma de tapioca e uma pitada de sal. Doure na frigideira antiaderente e recheie com 80g de peito de frango desfiado e 30g de creme de ricota light.',
    ingredients: [
      {
        id: 'ing-1',
        foodId: 'taco-ovo',
        foodName: 'Ovo de galinha inteiro',
        measureId: 'unid',
        measureLabel: 'Unidade (50g)',
        quantity: 1,
        gramsEquivalent: 50,
        nutrients: {
          ...EMPTY_NUTRIENT_PROFILE,
          energyKcal: 72,
          proteinG: 6.5,
          carbohydrateG: 0.6,
          lipidG: 4.8,
          cholesterolMg: 186,
          calciumMg: 24,
          ironMg: 0.8,
        },
      },
      {
        id: 'ing-2',
        foodId: 'taco-tapioca',
        foodName: 'Goma de tapioca hidratada',
        measureId: 'colher-sopa',
        measureLabel: 'Colher de sopa (20g)',
        quantity: 2,
        gramsEquivalent: 40,
        nutrients: {
          ...EMPTY_NUTRIENT_PROFILE,
          energyKcal: 96,
          proteinG: 0.1,
          carbohydrateG: 24.0,
          lipidG: 0,
          fiberG: 0.4,
        },
      },
      {
        id: 'ing-3',
        foodId: 'taco-frango',
        foodName: 'Peito de frango cozido desfiado',
        measureId: 'univ-g',
        measureLabel: 'Gramas (g)',
        quantity: 80,
        gramsEquivalent: 80,
        nutrients: {
          ...EMPTY_NUTRIENT_PROFILE,
          energyKcal: 130,
          proteinG: 25.2,
          carbohydrateG: 0,
          lipidG: 2.6,
          phosphorusMg: 180,
          potassiumMg: 210,
        },
      },
    ],
    nutrientsPerServing: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 338,
      proteinG: 34.5,
      carbohydrateG: 25.8,
      lipidG: 9.8,
      fiberG: 0.8,
      calciumMg: 98,
      ironMg: 1.4,
      phosphorusMg: 265,
      potassiumMg: 310,
      magnesiumMg: 38,
      zincMg: 1.8,
    },
    nutrientsTotal: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 338,
      proteinG: 34.5,
      carbohydrateG: 25.8,
      lipidG: 9.8,
      fiberG: 0.8,
      calciumMg: 98,
      ironMg: 1.4,
      phosphorusMg: 265,
      potassiumMg: 310,
      magnesiumMg: 38,
      zincMg: 1.8,
    },
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rec-panqueca-aveia-banana',
    name: 'Panqueca Funcional de Aveia, Banana e Ovos',
    category: 'Café da Manhã',
    servings: 1,
    servingWeightG: 200,
    prepTimeMinutes: 8,
    instructions:
      'Amasse 1 banana prata média, misture com 2 ovos inteiros, 30g de aveia em flocos finos e canela a gosto. Grelhe em fogo baixo dos dois lados.',
    ingredients: [],
    nutrientsPerServing: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 365,
      proteinG: 18.2,
      carbohydrateG: 44.5,
      lipidG: 12.4,
      fiberG: 5.2,
      potassiumMg: 485,
      magnesiumMg: 78,
      calciumMg: 68,
      ironMg: 2.6,
      zincMg: 2.1,
      vitaminCMg: 8.5,
    },
    nutrientsTotal: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 365,
      proteinG: 18.2,
      carbohydrateG: 44.5,
      lipidG: 12.4,
      fiberG: 5.2,
      potassiumMg: 485,
      magnesiumMg: 78,
      calciumMg: 68,
      ironMg: 2.6,
      zincMg: 2.1,
      vitaminCMg: 8.5,
    },
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rec-bowl-arroz-patinho',
    name: 'Bowl Performance: Arroz Integral, Patinho Moído e Brócolis',
    category: 'Almoço & Jantar',
    servings: 1,
    servingWeightG: 340,
    prepTimeMinutes: 20,
    instructions:
      'Monte o bowl com 130g de arroz integral cozido, 130g de patinho bovino magro grelhado/moído, 80g de brócolis no vapor e 1 colher de chá de azeite extra virgem.',
    ingredients: [],
    nutrientsPerServing: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 485,
      proteinG: 43.8,
      carbohydrateG: 39.2,
      lipidG: 15.6,
      fiberG: 6.4,
      ironMg: 4.8,
      zincMg: 6.9,
      magnesiumMg: 112,
      potassiumMg: 690,
      calciumMg: 62,
      vitaminCMg: 48.0,
    },
    nutrientsTotal: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 485,
      proteinG: 43.8,
      carbohydrateG: 39.2,
      lipidG: 15.6,
      fiberG: 6.4,
      ironMg: 4.8,
      zincMg: 6.9,
      magnesiumMg: 112,
      potassiumMg: 690,
      calciumMg: 62,
      vitaminCMg: 48.0,
    },
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rec-escondidinho-mandioca-frango',
    name: 'Escondidinho Fit de Mandioca com Frango Desfiado',
    category: 'Almoço & Jantar',
    servings: 1,
    servingWeightG: 300,
    prepTimeMinutes: 25,
    instructions:
      'Faça um purê rústico com 150g de mandioca cozida amassada e cubra 130g de peito de frango desfiado refogado com temperos naturais e tomate.',
    ingredients: [],
    nutrientsPerServing: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 412,
      proteinG: 38.4,
      carbohydrateG: 46.8,
      lipidG: 6.9,
      fiberG: 3.6,
      potassiumMg: 540,
      phosphorusMg: 310,
      magnesiumMg: 66,
      vitaminCMg: 24.0,
    },
    nutrientsTotal: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 412,
      proteinG: 38.4,
      carbohydrateG: 46.8,
      lipidG: 6.9,
      fiberG: 3.6,
      potassiumMg: 540,
      phosphorusMg: 310,
      magnesiumMg: 66,
      vitaminCMg: 24.0,
    },
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rec-overnight-oats-whey',
    name: 'Overnight Oats Proteico com Whey, Iogurte e Morangos',
    category: 'Lanches & Pré/Pós-Treino',
    servings: 1,
    servingWeightG: 260,
    prepTimeMinutes: 5,
    instructions:
      'Misture 170g de iogurte natural desnatado, 30g de Whey Protein, 30g de aveia em flocos e 50g de morangos picados. Deixe gelar.',
    ingredients: [],
    nutrientsPerServing: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 342,
      proteinG: 35.6,
      carbohydrateG: 36.4,
      lipidG: 5.2,
      fiberG: 4.5,
      calciumMg: 390,
      potassiumMg: 460,
      magnesiumMg: 72,
      vitaminCMg: 32.0,
    },
    nutrientsTotal: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 342,
      proteinG: 35.6,
      carbohydrateG: 36.4,
      lipidG: 5.2,
      fiberG: 4.5,
      calciumMg: 390,
      potassiumMg: 460,
      magnesiumMg: 72,
      vitaminCMg: 32.0,
    },
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rec-smoothie-hipertrofia',
    name: 'Smoothie Energético: Leite, Banana, Aveia, Whey e Pasta de Amendoim',
    category: 'Bebidas & Smoothies',
    servings: 1,
    servingWeightG: 400,
    prepTimeMinutes: 4,
    instructions:
      'Bata no liquidificador 200ml de leite desnatado, 1 banana média, 30g de aveia, 30g de Whey Protein e 15g de pasta de amendoim integral com gelo.',
    ingredients: [],
    nutrientsPerServing: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 495,
      proteinG: 38.2,
      carbohydrateG: 54.0,
      lipidG: 13.8,
      fiberG: 6.1,
      calciumMg: 480,
      potassiumMg: 820,
      magnesiumMg: 125,
      zincMg: 2.9,
    },
    nutrientsTotal: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 495,
      proteinG: 38.2,
      carbohydrateG: 54.0,
      lipidG: 13.8,
      fiberG: 6.1,
      calciumMg: 480,
      potassiumMg: 820,
      magnesiumMg: 125,
      zincMg: 2.9,
    },
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rec-mousse-abacate-cacau',
    name: 'Mousse Fit de Abacate, Cacau 100% e Whey Protein',
    category: 'Sobremesas Fit',
    servings: 1,
    servingWeightG: 160,
    prepTimeMinutes: 5,
    instructions:
      'Processe 100g de abacate maduro com 1 scoop (30g) de Whey sabor chocolate, 1 colher de sopa de cacau 100% e 2 colheres de sopa de água gelada.',
    ingredients: [],
    nutrientsPerServing: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 248,
      proteinG: 26.4,
      carbohydrateG: 11.2,
      lipidG: 11.5,
      fiberG: 6.8,
      monounsaturatedG: 7.4,
      magnesiumMg: 88,
      potassiumMg: 490,
      ironMg: 1.9,
    },
    nutrientsTotal: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 248,
      proteinG: 26.4,
      carbohydrateG: 11.2,
      lipidG: 11.5,
      fiberG: 6.8,
      monounsaturatedG: 7.4,
      magnesiumMg: 88,
      potassiumMg: 490,
      ironMg: 1.9,
    },
    isSystemDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const DEFAULT_MEAL_TEMPLATES: PredefinedMealTemplate[] = [
  {
    id: 'tpl-cafe-classico',
    name: 'Café da Manhã Clássico (Ovos + Pão Integral + Fruta)',
    category: 'Café da Manhã',
    defaultTime: '07:30',
    notes: 'Hidratar com 400ml de água ao acordar.',
    items: [
      {
        id: 'tpl-i-1',
        sourceType: 'food',
        sourceId: 'taco-ovo',
        name: 'Ovo, de galinha, inteiro, cozido/mexido',
        category: 'Ovos e derivados',
        measureId: 'unid-50',
        measureLabel: 'Unidade média (50g)',
        quantity: 3,
        gramsEquivalent: 150,
        nutrients: {
          ...EMPTY_NUTRIENT_PROFILE,
          energyKcal: 219,
          proteinG: 19.9,
          carbohydrateG: 0.9,
          lipidG: 14.3,
          cholesterolMg: 558,
          calciumMg: 72,
          ironMg: 2.3,
          zincMg: 1.7,
        },
        substitutions: [],
      },
      {
        id: 'tpl-i-2',
        sourceType: 'food',
        sourceId: 'taco-pao-integral',
        name: 'Pão, trigo, forma, integral',
        category: 'Cereais e derivados',
        measureId: 'fatia-25',
        measureLabel: 'Fatia (25g)',
        quantity: 2,
        gramsEquivalent: 50,
        nutrients: {
          ...EMPTY_NUTRIENT_PROFILE,
          energyKcal: 126.5,
          proteinG: 4.7,
          carbohydrateG: 24.9,
          lipidG: 1.8,
          fiberG: 3.4,
          magnesiumMg: 28,
          sodiumMg: 250,
        },
        substitutions: [],
      },
      {
        id: 'tpl-i-3',
        sourceType: 'food',
        sourceId: 'taco-mamao',
        name: 'Mamão, Papaia, cru',
        category: 'Frutas e derivados',
        measureId: 'fatia-120',
        measureLabel: 'Fatia média (120g)',
        quantity: 1,
        gramsEquivalent: 120,
        nutrients: {
          ...EMPTY_NUTRIENT_PROFILE,
          energyKcal: 48,
          proteinG: 0.6,
          carbohydrateG: 12.5,
          lipidG: 0.1,
          fiberG: 1.2,
          vitaminCMg: 98.6,
          potassiumMg: 266,
        },
        substitutions: [],
      },
    ],
    nutrientsTotal: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 393.5,
      proteinG: 25.2,
      carbohydrateG: 38.3,
      lipidG: 16.2,
      fiberG: 4.6,
      vitaminCMg: 98.6,
      potassiumMg: 266,
      calciumMg: 72,
      ironMg: 2.3,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl-almoco-hipertrofia',
    name: 'Almoço Padrão Hipertrofia (Arroz + Feijão + Frango + Salada)',
    category: 'Almoço & Jantar',
    defaultTime: '12:30',
    notes: 'Temperar a salada com limão e 1 colher de chá de azeite.',
    items: [
      {
        id: 'tpl-a-1',
        sourceType: 'food',
        sourceId: 'taco-1',
        name: 'Arroz, integral, cozido',
        category: 'Cereais e derivados',
        measureId: 'colher-arroz-63',
        measureLabel: 'Colher de arroz/servir (63g)',
        quantity: 2.5,
        gramsEquivalent: 157.5,
        nutrients: {
          ...EMPTY_NUTRIENT_PROFILE,
          energyKcal: 194.6,
          proteinG: 4.1,
          carbohydrateG: 40.6,
          lipidG: 1.6,
          fiberG: 4.3,
          magnesiumMg: 92.5,
          phosphorusMg: 166.7,
        },
        substitutions: [],
      },
      {
        id: 'tpl-a-2',
        sourceType: 'food',
        sourceId: 'taco-feijao',
        name: 'Feijão, carioca, cozido',
        category: 'Leguminosas e derivados',
        measureId: 'concha-100',
        measureLabel: 'Concha média (100g)',
        quantity: 1,
        gramsEquivalent: 100,
        nutrients: {
          ...EMPTY_NUTRIENT_PROFILE,
          energyKcal: 76.4,
          proteinG: 4.8,
          carbohydrateG: 13.6,
          lipidG: 0.5,
          fiberG: 8.5,
          ironMg: 1.3,
          potassiumMg: 255,
          magnesiumMg: 42,
        },
        substitutions: [],
      },
      {
        id: 'tpl-a-3',
        sourceType: 'food',
        sourceId: 'taco-frango-grelhado',
        name: 'Frango, peito, sem pele, grelhado',
        category: 'Carnes e derivados',
        measureId: 'univ-g',
        measureLabel: 'Gramas (g)',
        quantity: 150,
        gramsEquivalent: 150,
        nutrients: {
          ...EMPTY_NUTRIENT_PROFILE,
          energyKcal: 238.8,
          proteinG: 48.0,
          carbohydrateG: 0,
          lipidG: 3.8,
          phosphorusMg: 360,
          potassiumMg: 390,
          niacinMg: 16.5,
        },
        substitutions: [],
      },
    ],
    nutrientsTotal: {
      ...EMPTY_NUTRIENT_PROFILE,
      energyKcal: 509.8,
      proteinG: 56.9,
      carbohydrateG: 54.2,
      lipidG: 5.9,
      fiberG: 12.8,
      magnesiumMg: 134.5,
      phosphorusMg: 526.7,
      potassiumMg: 645,
      ironMg: 1.3,
      niacinMg: 16.5,
    },
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export function createInitialClientDietPlan(client: Client): ClientDietPlan {
  const scheduleId = `sched-${Date.now()}`;
  const defaultMeals: DietMeal[] = [
    {
      id: `meal-${Date.now()}-1`,
      time: '07:30',
      name: 'Café da Manhã',
      notes: '',
      items: [...DEFAULT_MEAL_TEMPLATES[0].items.map((it) => ({ ...it, id: `${it.id}-${Date.now()}` }))],
      mealSubstitutions: [
        {
          id: `msub-${Date.now()}-1`,
          targetType: 'recipe',
          targetId: DEFAULT_SYSTEM_RECIPES[0].id,
          targetName: DEFAULT_SYSTEM_RECIPES[0].name,
          category: DEFAULT_SYSTEM_RECIPES[0].category,
          measureId: 'porcao',
          measureLabel: 'Porção da Receita',
          quantity: 1,
          gramsEquivalent: DEFAULT_SYSTEM_RECIPES[0].servingWeightG,
          equivalenceMode: 'auto_kcal',
          nutrients: { ...DEFAULT_SYSTEM_RECIPES[0].nutrientsPerServing },
        },
      ],
    },
    {
      id: `meal-${Date.now()}-2`,
      time: '12:30',
      name: 'Almoço',
      notes: '',
      items: [...DEFAULT_MEAL_TEMPLATES[1].items.map((it) => ({ ...it, id: `${it.id}-${Date.now()}` }))],
      mealSubstitutions: [
        {
          id: `msub-${Date.now()}-2`,
          targetType: 'recipe',
          targetId: DEFAULT_SYSTEM_RECIPES[2].id,
          targetName: DEFAULT_SYSTEM_RECIPES[2].name,
          category: DEFAULT_SYSTEM_RECIPES[2].category,
          measureId: 'porcao',
          measureLabel: 'Porção da Receita',
          quantity: 1,
          gramsEquivalent: DEFAULT_SYSTEM_RECIPES[2].servingWeightG,
          equivalenceMode: 'auto_kcal',
          nutrients: { ...DEFAULT_SYSTEM_RECIPES[2].nutrientsPerServing },
        },
      ],
    },
    {
      id: `meal-${Date.now()}-3`,
      time: '16:30',
      name: 'Lanche da Tarde / Pré-Treino',
      notes: 'Consumir 60 a 90 minutos antes do treino.',
      items: [
        {
          id: `item-${Date.now()}-3`,
          sourceType: 'recipe',
          sourceId: DEFAULT_SYSTEM_RECIPES[4].id,
          name: DEFAULT_SYSTEM_RECIPES[4].name,
          category: DEFAULT_SYSTEM_RECIPES[4].category,
          measureId: 'porcao',
          measureLabel: 'Porção da Receita (260g)',
          quantity: 1,
          gramsEquivalent: 260,
          nutrients: { ...DEFAULT_SYSTEM_RECIPES[4].nutrientsPerServing },
          substitutions: [],
        },
      ],
      mealSubstitutions: [],
    },
    {
      id: `meal-${Date.now()}-4`,
      time: '20:30',
      name: 'Jantar',
      notes: '',
      items: [
        {
          id: `item-${Date.now()}-4`,
          sourceType: 'recipe',
          sourceId: DEFAULT_SYSTEM_RECIPES[3].id,
          name: DEFAULT_SYSTEM_RECIPES[3].name,
          category: DEFAULT_SYSTEM_RECIPES[3].category,
          measureId: 'porcao',
          measureLabel: 'Porção da Receita (300g)',
          quantity: 1,
          gramsEquivalent: 300,
          nutrients: { ...DEFAULT_SYSTEM_RECIPES[3].nutrientsPerServing },
          substitutions: [],
        },
      ],
      mealSubstitutions: [],
    },
  ];

  const mainSchedule: DietDaySchedule = {
    id: scheduleId,
    name: 'Cardápio Dias de Treino (Seg a Sex)',
    weekDays: [1, 2, 3, 4, 5],
    meals: defaultMeals,
  };

  const restSchedule: DietDaySchedule = {
    id: `${scheduleId}-rest`,
    name: 'Cardápio Fim de Semana / Descanso (Sáb e Dom)',
    weekDays: [0, 6],
    meals: defaultMeals.map((m) => ({
      ...m,
      id: `${m.id}-rest`,
      items: m.items.map((it) => ({ ...it, id: `${it.id}-rest` })),
    })),
  };

  return {
    id: `diet-${client.id}`,
    clientId: client.id,
    clientName: client.name,
    name: `Plano Nutricional — ${client.name}`,
    metabolicConfig: {
      formula: 'mifflin',
      bodyFatPercent: client.bodyFatPercent ?? (client.gender === 'Feminino' ? 22 : 14),
      activityLevel: 'moderado',
      activityFactor: 1.55,
      workoutCalories: 250,
      goalType: 'manutencao',
      goalDeltaKcal: 0,
      proteinGPerKg: 2.0,
      fatGPerKg: 0.9,
      fiberTargetG: 30,
    },
    hydrationConfig: {
      mlPerKg: 40,
      extraWorkoutMl: 500,
      dailyWaterLog: {},
    },
    schedules: [mainSchedule, restSchedule],
    activeScheduleId: scheduleId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function calculateHydrationTarget(
  weightKg: number,
  activityLevel: ActivityLevelId,
  config?: { mlPerKg?: number; extraWorkoutMl?: number; customTargetMl?: number }
): {
  recommendedMl: number;
  recommendedLiters: string;
  mlPerKgUsed: number;
  breakdownText: string;
} {
  const baseMlPerKg = config?.mlPerKg ?? (
    activityLevel === 'sedentario' ? 35 :
    activityLevel === 'leve' ? 38 :
    activityLevel === 'moderado' ? 40 :
    activityLevel === 'intenso' ? 45 : 50
  );

  const extraWorkout = config?.extraWorkoutMl ?? (
    activityLevel === 'sedentario' ? 250 :
    activityLevel === 'leve' ? 400 :
    activityLevel === 'moderado' ? 500 :
    activityLevel === 'intenso' ? 650 : 800
  );

  const calculated = Math.round(weightKg * baseMlPerKg + extraWorkout);
  const finalTarget = config?.customTargetMl && config.customTargetMl > 0 ? config.customTargetMl : calculated;
  const liters = (finalTarget / 1000).toFixed(2);

  return {
    recommendedMl: finalTarget,
    recommendedLiters: liters,
    mlPerKgUsed: baseMlPerKg,
    breakdownText: `${weightKg} kg × ${baseMlPerKg} ml/kg + ${extraWorkout} ml (Atividade: ${activityLevel})`,
  };
}

export function getInitialProfessionalLibrary(): NutritionProfessionalLibrary {
  return {
    customFoods: DEFAULT_CUSTOM_FOODS,
    recipes: DEFAULT_SYSTEM_RECIPES,
    mealTemplates: DEFAULT_MEAL_TEMPLATES,
    customPortions: DEFAULT_CUSTOM_PORTIONS,
    updatedAt: new Date().toISOString(),
  };
}

