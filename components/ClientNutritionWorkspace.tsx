'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityLevelId,
  Client,
  ClientDietPlan,
  DietDaySchedule,
  DietGoalType,
  DietItemSubstitution,
  DietMeal,
  DietMealItem,
  HouseholdMeasureOption,
  MetabolicFormulaId,
  NutrientProfile,
  NutritionFoodItem,
  NutritionProfessionalLibrary,
  PredefinedMealTemplate,
} from '@/types';
import {
  ACTIVITY_LEVELS_META,
  calculateMetabolicMetrics,
  createInitialClientDietPlan,
  EMPTY_NUTRIENT_PROFILE,
  getMicronutrientIDRComparison,
  loadOfficialNutritionDatabase,
  METABOLIC_FORMULAS_META,
  scaleNutrients,
  sumNutrientProfiles,
  WEEK_DAYS_SHORT,
} from '@/lib/nutritionEngine';
import { storage } from '@/lib/storage';
import { cloudSync } from '@/lib/firebase';
import { DynamicSubstitutionModal } from './DynamicSubstitutionModal';
import {
  Activity,
  ArrowLeft,
  ArrowLeftRight,
  BookOpen,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Pencil,
  Plus,
  Scale,
  Search,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';

interface ClientNutritionWorkspaceProps {
  client: Client;
  onBack: () => void;
  onUpdateClient?: (updatedClient: Client) => void;
}

export const ClientNutritionWorkspace: React.FC<ClientNutritionWorkspaceProps> = ({
  client,
  onBack,
  onUpdateClient,
}) => {
  const [activeTab, setActiveTab] = useState<
    'prescricao' | 'metabolico' | 'idr'
  >('prescricao');

  // Plan & Library State
  const [dietPlan, setDietPlan] = useState<ClientDietPlan>(() => {
    const existing = storage.getClientDietPlan(client.id);
    if (existing) return existing;
    const initial = createInitialClientDietPlan(client);
    storage.saveClientDietPlan(initial);
    return initial;
  });

  const [library] = useState<NutritionProfessionalLibrary>(() =>
    storage.getNutritionLibrary()
  );

  const [officialFoods, setOfficialFoods] = useState<NutritionFoodItem[]>([]);
  const [isLoadingFoods, setIsLoadingFoods] = useState<boolean>(true);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isIdrExpanded, setIsIdrExpanded] = useState<boolean>(false);

  // Add Item Inline Drawer State per Meal
  const [addingItemToMealId, setAddingItemToMealId] = useState<string | null>(null);
  const [addItemMode, setAddItemMode] = useState<'food' | 'recipe'>('food');
  const [foodSearch, setFoodSearch] = useState<string>('');
  const [selectedFoodCategory, setSelectedFoodCategory] = useState<string>('Todas');
  const [selectedFoodId, setSelectedFoodId] = useState<string>('');
  const [selectedMeasureId, setSelectedMeasureId] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState<string>('1');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');

  // New Schedule Modal / Inline State
  const [isNewScheduleOpen, setIsNewScheduleOpen] = useState<boolean>(false);
  const [newScheduleName, setNewScheduleName] = useState<string>('Cardápio Especial');
  const [newScheduleDays, setNewScheduleDays] = useState<number[]>([1, 3, 5]);

  // New Meal State
  const [newMealName, setNewMealName] = useState<string>('Lanche / Refeição');
  const [newMealTime, setNewMealTime] = useState<string>('15:30');
  const [editingMealTimeId, setEditingMealTimeId] = useState<string | null>(null);
  const [editingMealTimeValue, setEditingMealTimeValue] = useState<string>('');

  // Dynamic Substitution Modal State
  const [subModalState, setSubModalState] = useState<{
    isOpen: boolean;
    contextType: 'item' | 'meal';
    mealId: string;
    itemId?: string;
    originalTitle: string;
    originalSubtitle: string;
    originalNutrients: NutrientProfile;
  }>({
    isOpen: false,
    contextType: 'item',
    mealId: '',
    originalTitle: '',
    originalSubtitle: '',
    originalNutrients: EMPTY_NUTRIENT_PROFILE,
  });

  // Load TACO + IBGE POF database
  useEffect(() => {
    let mounted = true;
    loadOfficialNutritionDatabase().then((loaded) => {
      if (!mounted) return;
      setOfficialFoods(loaded);
      setIsLoadingFoods(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Combine Custom Foods + Custom Portions into unified food list
  const allFoods = useMemo(() => {
    const globalCustomMeasures: HouseholdMeasureOption[] = library.customPortions.map(
      (cp) => ({
        id: cp.id,
        unitName: cp.unitName,
        label: `${cp.name} (${cp.grams}g)`,
        grams: cp.grams,
        source: 'custom' as const,
      })
    );

    const enrichedCustom = library.customFoods.map((f) => ({
      ...f,
      measures: [...f.measures, ...globalCustomMeasures],
    }));

    const enrichedOfficial = officialFoods.map((f) => ({
      ...f,
      measures: [...f.measures, ...globalCustomMeasures],
    }));

    return [...enrichedCustom, ...enrichedOfficial];
  }, [library.customFoods, library.customPortions, officialFoods]);

  const foodCategories = useMemo(() => {
    const set = new Set<string>();
    allFoods.forEach((f) => {
      if (f.category) set.add(f.category);
    });
    return ['Todas', ...Array.from(set).sort()];
  }, [allFoods]);

  const filteredFoodsForPicker = useMemo(() => {
    const q = foodSearch.trim().toLowerCase();
    return allFoods
      .filter((f) => {
        const matchCat =
          selectedFoodCategory === 'Todas' || f.category === selectedFoodCategory;
        const matchText =
          !q ||
          f.name.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          (f.pofCode && f.pofCode.toLowerCase().includes(q)) ||
          (f.pofDescription && f.pofDescription.toLowerCase().includes(q));
        return matchCat && matchText;
      })
      .slice(0, 120);
  }, [allFoods, foodSearch, selectedFoodCategory]);

  const activeFoodInPicker = useMemo(() => {
    return (
      allFoods.find((f) => f.id === selectedFoodId) ||
      filteredFoodsForPicker[0] ||
      allFoods[0]
    );
  }, [allFoods, selectedFoodId, filteredFoodsForPicker]);

  const activeMeasureInPicker = useMemo(() => {
    if (!activeFoodInPicker) return undefined;
    return (
      activeFoodInPicker.measures.find((m) => m.id === selectedMeasureId) ||
      activeFoodInPicker.measures.find(
        (m) => m.isReferenceMeasure && m.isPreparationMatch
      ) ||
      activeFoodInPicker.measures.find((m) => m.isReferenceMeasure) ||
      activeFoodInPicker.measures.find(
        (m) => m.source === 'pof' || m.source === 'custom'
      ) ||
      activeFoodInPicker.measures[0]
    );
  }, [activeFoodInPicker, selectedMeasureId]);

  const activeRecipeInPicker = useMemo(() => {
    return (
      library.recipes.find((r) => r.id === selectedRecipeId) || library.recipes[0]
    );
  }, [library.recipes, selectedRecipeId]);

  const persistPlan = (updated: ClientDietPlan, toastMessage?: string) => {
    setDietPlan(updated);
    storage.saveClientDietPlan(updated);
    cloudSync.syncDietPlan(updated);
    if (toastMessage) {
      setSaveToast(toastMessage);
      setTimeout(() => setSaveToast(null), 2500);
    }
  };

  // Active Schedule
  const activeSchedule: DietDaySchedule = useMemo(() => {
    return (
      dietPlan.schedules.find((s) => s.id === dietPlan.activeScheduleId) ||
      dietPlan.schedules[0]
    );
  }, [dietPlan]);

  // Metabolic Calculations
  const metabolicMetrics = useMemo(
    () => calculateMetabolicMetrics(client, dietPlan.metabolicConfig),
    [client, dietPlan.metabolicConfig]
  );

  // Real-time Nutrient Totals for Active Day Schedule
  const dayTotals: NutrientProfile = useMemo(() => {
    if (!activeSchedule) return EMPTY_NUTRIENT_PROFILE;
    const allItemProfiles: NutrientProfile[] = [];
    for (const meal of activeSchedule.meals) {
      for (const item of meal.items) {
        allItemProfiles.push(item.nutrients);
      }
    }
    return sumNutrientProfiles(allItemProfiles);
  }, [activeSchedule]);

  // Micronutrient IDR Comparison
  const idrItems = useMemo(
    () =>
      getMicronutrientIDRComparison(
        dayTotals,
        client.gender,
        metabolicMetrics.targetCalories
      ),
    [dayTotals, client.gender, metabolicMetrics.targetCalories]
  );

  // Update Metabolic Config Helper
  const updateMetabolicConfig = (
    patch: Partial<ClientDietPlan['metabolicConfig']>
  ) => {
    const updatedConfig = {
      ...dietPlan.metabolicConfig,
      ...patch,
    };
    const updatedPlan: ClientDietPlan = {
      ...dietPlan,
      metabolicConfig: updatedConfig,
      updatedAt: new Date().toISOString(),
    };
    persistPlan(updatedPlan);

    if (
      patch.bodyFatPercent !== undefined &&
      onUpdateClient &&
      patch.bodyFatPercent !== client.bodyFatPercent
    ) {
      onUpdateClient({
        ...client,
        bodyFatPercent: patch.bodyFatPercent,
      });
    }
  };

  // Update Active Schedule Helper
  const updateActiveSchedule = (updater: (sched: DietDaySchedule) => DietDaySchedule) => {
    const updatedSchedules = dietPlan.schedules.map((s) =>
      s.id === activeSchedule.id ? updater(s) : s
    );
    persistPlan({
      ...dietPlan,
      schedules: updatedSchedules,
      updatedAt: new Date().toISOString(),
    });
  };

  // Add New Day Schedule
  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleName.trim()) return;
    const newId = `sched-${Date.now()}`;
    const newSched: DietDaySchedule = {
      id: newId,
      name: newScheduleName.trim(),
      weekDays: newScheduleDays.length > 0 ? newScheduleDays : [1, 2, 3, 4, 5],
      meals: [
        {
          id: `meal-${Date.now()}-1`,
          time: '08:00',
          name: 'Café da Manhã',
          items: [],
          mealSubstitutions: [],
        },
        {
          id: `meal-${Date.now()}-2`,
          time: '12:30',
          name: 'Almoço',
          items: [],
          mealSubstitutions: [],
        },
        {
          id: `meal-${Date.now()}-3`,
          time: '20:00',
          name: 'Jantar',
          items: [],
          mealSubstitutions: [],
        },
      ],
    };
    persistPlan(
      {
        ...dietPlan,
        schedules: [...dietPlan.schedules, newSched],
        activeScheduleId: newId,
        updatedAt: new Date().toISOString(),
      },
      'Novo cardápio criado!'
    );
    setIsNewScheduleOpen(false);
  };

  // Toggle Day in Active Schedule
  const handleToggleDayInSchedule = (dayNum: number) => {
    updateActiveSchedule((sched) => {
      const exists = sched.weekDays.includes(dayNum);
      const nextDays = exists
        ? sched.weekDays.filter((d) => d !== dayNum)
        : [...sched.weekDays, dayNum];
      return {
        ...sched,
        weekDays: nextDays,
      };
    });
  };

  // Add Meal to Active Schedule
  const handleAddMeal = () => {
    if (!newMealName.trim()) return;
    const newMeal: DietMeal = {
      id: `meal-${Date.now()}`,
      time: newMealTime || '15:00',
      name: newMealName.trim(),
      notes: '',
      items: [],
      mealSubstitutions: [],
    };
    updateActiveSchedule((sched) => ({
      ...sched,
      meals: [...sched.meals, newMeal].sort((a, b) => a.time.localeCompare(b.time)),
    }));
    setNewMealName('Nova Refeição');
  };

  // Import Pre-defined Meal Template
  const handleImportMealTemplate = (tpl: PredefinedMealTemplate) => {
    const importedMeal: DietMeal = {
      id: `meal-${Date.now()}`,
      time: tpl.defaultTime || '12:00',
      name: tpl.name,
      notes: tpl.notes || '',
      items: tpl.items.map((it) => ({
        ...it,
        id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      })),
      mealSubstitutions: [],
    };
    updateActiveSchedule((sched) => ({
      ...sched,
      meals: [...sched.meals, importedMeal].sort((a, b) =>
        a.time.localeCompare(b.time)
      ),
    }));
    setSaveToast(`Refeição "${tpl.name}" importada ao cardápio!`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Delete Meal
  const handleDeleteMeal = (mealId: string) => {
    updateActiveSchedule((sched) => ({
      ...sched,
      meals: sched.meals.filter((m) => m.id !== mealId),
    }));
  };

  // Update Meal Time
  const handleUpdateMealTime = (mealId: string, updatedTime: string) => {
    const cleanTime = updatedTime.trim();
    if (!cleanTime) {
      setEditingMealTimeId(null);
      return;
    }
    updateActiveSchedule((sched) => ({
      ...sched,
      meals: sched.meals
        .map((m) => (m.id === mealId ? { ...m, time: cleanTime } : m))
        .sort((a, b) => a.time.localeCompare(b.time)),
    }));
    setEditingMealTimeId(null);
    setSaveToast(`Horário da refeição atualizado para ${cleanTime}!`);
    setTimeout(() => setSaveToast(null), 2200);
  };

  // Add Item (Food or Recipe) to a Meal
  const handleConfirmAddItemToMeal = (mealId: string) => {
    const qty = Math.max(0.1, parseFloat(selectedQuantity.replace(',', '.')) || 1);

    if (addItemMode === 'food') {
      if (!activeFoodInPicker || !activeMeasureInPicker) return;
      const grams = Number((qty * activeMeasureInPicker.grams).toFixed(1));
      const nutrients = scaleNutrients(activeFoodInPicker.nutrientsPer100, grams);

      const newItem: DietMealItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sourceType: 'food',
        sourceId: activeFoodInPicker.id,
        name: activeFoodInPicker.name,
        category: activeFoodInPicker.category,
        measureId: activeMeasureInPicker.id,
        measureLabel: activeMeasureInPicker.unitName,
        quantity: qty,
        gramsEquivalent: grams,
        nutrients,
        substitutions: [],
      };

      updateActiveSchedule((sched) => ({
        ...sched,
        meals: sched.meals.map((m) =>
          m.id === mealId ? { ...m, items: [...m.items, newItem] } : m
        ),
      }));
    } else {
      if (!activeRecipeInPicker) return;
      const grams = Math.round(qty * (activeRecipeInPicker.servingWeightG || 180));
      const nutrients = scaleNutrients(
        activeRecipeInPicker.nutrientsPerServing,
        qty * 100
      );

      const newItem: DietMealItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sourceType: 'recipe',
        sourceId: activeRecipeInPicker.id,
        name: activeRecipeInPicker.name,
        category: activeRecipeInPicker.category,
        measureId: 'porcao-receita',
        measureLabel: `Porção (${activeRecipeInPicker.servingWeightG}g)`,
        quantity: qty,
        gramsEquivalent: grams,
        nutrients,
        substitutions: [],
      };

      updateActiveSchedule((sched) => ({
        ...sched,
        meals: sched.meals.map((m) =>
          m.id === mealId ? { ...m, items: [...m.items, newItem] } : m
        ),
      }));
    }

    setAddingItemToMealId(null);
  };

  // Update Item Quantity or Measure inline
  const handleUpdateMealItemQuantityOrMeasure = (
    mealId: string,
    item: DietMealItem,
    newQty: number,
    newMeasureId?: string
  ) => {
    const cleanQty = Math.max(0.1, newQty);

    if (item.sourceType === 'recipe') {
      const matchedRecipe = library.recipes.find((r) => r.id === item.sourceId);
      const baseWeight = matchedRecipe?.servingWeightG || 180;
      const basePerServing = matchedRecipe?.nutrientsPerServing || item.nutrients;
      const newGrams = Math.round(cleanQty * baseWeight);
      const newNutrients = scaleNutrients(basePerServing, cleanQty * 100);

      updateActiveSchedule((sched) => ({
        ...sched,
        meals: sched.meals.map((m) =>
          m.id === mealId
            ? {
                ...m,
                items: m.items.map((it) =>
                  it.id === item.id
                    ? {
                        ...it,
                        quantity: cleanQty,
                        gramsEquivalent: newGrams,
                        nutrients: newNutrients,
                      }
                    : it
                ),
              }
            : m
        ),
      }));
      return;
    }

    const matchedFood = allFoods.find((f) => f.id === item.sourceId);
    if (!matchedFood) {
      // Escalar proporcionalmente ao item existente caso o alimento base não esteja na lista
      const ratio = cleanQty / (item.quantity || 1);
      const newGrams = Number((item.gramsEquivalent * ratio).toFixed(1));
      const newNutrients = scaleNutrients(item.nutrients, ratio * 100);
      updateActiveSchedule((sched) => ({
        ...sched,
        meals: sched.meals.map((m) =>
          m.id === mealId
            ? {
                ...m,
                items: m.items.map((it) =>
                  it.id === item.id
                    ? {
                        ...it,
                        quantity: cleanQty,
                        gramsEquivalent: newGrams,
                        nutrients: newNutrients,
                      }
                    : it
                ),
              }
            : m
        ),
      }));
      return;
    }

    const targetMeasure =
      matchedFood.measures.find((m) => m.id === (newMeasureId || item.measureId)) ||
      matchedFood.measures[0];

    const newGrams = Number((cleanQty * (targetMeasure?.grams || 1)).toFixed(1));
    const newNutrients = scaleNutrients(matchedFood.nutrientsPer100, newGrams);

    updateActiveSchedule((sched) => ({
      ...sched,
      meals: sched.meals.map((m) =>
        m.id === mealId
          ? {
              ...m,
              items: m.items.map((it) =>
                it.id === item.id
                  ? {
                      ...it,
                      measureId: targetMeasure?.id || it.measureId,
                      measureLabel: targetMeasure?.unitName || it.measureLabel,
                      quantity: cleanQty,
                      gramsEquivalent: newGrams,
                      nutrients: newNutrients,
                    }
                  : it
              ),
            }
          : m
      ),
    }));
  };

  // Delete Item from Meal
  const handleDeleteMealItem = (mealId: string, itemId: string) => {
    updateActiveSchedule((sched) => ({
      ...sched,
      meals: sched.meals.map((m) =>
        m.id === mealId
          ? { ...m, items: m.items.filter((it) => it.id !== itemId) }
          : m
      ),
    }));
  };

  // Swap Item with one of its attached substitutions
  const handleSwapItemWithSavedSub = (
    mealId: string,
    item: DietMealItem,
    sub: DietItemSubstitution
  ) => {
    const previousAsSub: DietItemSubstitution = {
      id: `sub-${Date.now()}`,
      targetType: item.sourceType,
      targetId: item.sourceId,
      targetName: item.name,
      category: item.category,
      measureId: item.measureId,
      measureLabel: item.measureLabel,
      quantity: item.quantity,
      gramsEquivalent: item.gramsEquivalent,
      equivalenceMode: 'auto_kcal',
      nutrients: item.nutrients,
    };

    const promotedItem: DietMealItem = {
      ...item,
      sourceType: sub.targetType,
      sourceId: sub.targetId,
      name: sub.targetName,
      category: sub.category,
      measureId: sub.measureId,
      measureLabel: sub.measureLabel,
      quantity: sub.quantity,
      gramsEquivalent: sub.gramsEquivalent,
      nutrients: sub.nutrients,
      substitutions: [
        previousAsSub,
        ...item.substitutions.filter((s) => s.id !== sub.id),
      ],
    };

    updateActiveSchedule((sched) => ({
      ...sched,
      meals: sched.meals.map((m) =>
        m.id === mealId
          ? {
              ...m,
              items: m.items.map((it) => (it.id === item.id ? promotedItem : it)),
            }
          : m
      ),
    }));
  };

  return (
    <div className="space-y-5 pb-28 animate-in fade-in duration-200">
      {/* ====================================================================
          BARRA DE TOPO: RETORNO AO PERFIL + IDENTIFICAÇÃO DO CLIENTE
      ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Voltar ao Perfil de {client.name.split(' ')[0]}</span>
          </button>

          <div className="hidden sm:block">
            <span className="text-xs font-extrabold text-white">{client.name}</span>
            <span className="text-xs text-slate-400 tabular-nums ml-2">
              · {client.weight} kg · {client.height} cm · {metabolicMetrics.age} anos
            </span>
          </div>
        </div>

        {saveToast && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs font-bold text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveToast}</span>
          </div>
        )}
      </div>

      {/* ====================================================================
          PAINEL EM TEMPO REAL: MACRONUTRIENTES + EXPANSÃO DE MICRONUTRIENTES (IDR)
      ==================================================================== */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Análise Nutricional em Tempo Real — {activeSchedule?.name}
              </h2>
            </div>
            <p className="text-xs text-slate-400 tabular-nums mt-0.5">
              TMB ({METABOLIC_FORMULAS_META.find((f) => f.id === dietPlan.metabolicConfig.formula)?.name}):{' '}
              <strong className="text-slate-200">{metabolicMetrics.selectedFormulaBmr} kcal</strong> · GET Estimado:{' '}
              <strong className="text-emerald-400">{metabolicMetrics.tdeeGet} kcal</strong> · Meta do Plano:{' '}
              <strong className="text-white">{metabolicMetrics.targetCalories} kcal</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsIdrExpanded((prev) => !prev)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold transition cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>
              {isIdrExpanded
                ? 'Recolher Micronutrientes & IDR'
                : 'Expandir Micronutrientes Comparados ao IDR'}
            </span>
            {isIdrExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* 5 Cartões de Macronutrientes e Fibras em Tempo Real */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 tabular-nums">
          {/* Energia / Calorias */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400">Calorias</span>
              <span className="font-extrabold text-emerald-400">
                {Math.round((dayTotals.energyKcal / metabolicMetrics.targetCalories) * 100)}%
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-white">
                {Math.round(dayTotals.energyKcal)}
              </span>
              <span className="text-xs text-slate-400">
                / {metabolicMetrics.targetCalories} kcal
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((dayTotals.energyKcal / metabolicMetrics.targetCalories) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Proteínas */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-cyan-400">Proteínas</span>
              <span className="text-[11px] text-slate-400">
                {(dayTotals.proteinG / metabolicMetrics.weightKg).toFixed(1)} g/kg
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-white">
                {dayTotals.proteinG}g
              </span>
              <span className="text-xs text-slate-400">
                / {metabolicMetrics.targetProteinG}g
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((dayTotals.proteinG / metabolicMetrics.targetProteinG) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Carboidratos */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-400">Carboidratos</span>
              <span className="text-[11px] text-slate-400">
                {(dayTotals.carbohydrateG / metabolicMetrics.weightKg).toFixed(1)} g/kg
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-white">
                {dayTotals.carbohydrateG}g
              </span>
              <span className="text-xs text-slate-400">
                / {metabolicMetrics.targetCarbG}g
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((dayTotals.carbohydrateG / metabolicMetrics.targetCarbG) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Gorduras Totais */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-rose-400">Gorduras</span>
              <span className="text-[11px] text-slate-400">
                {(dayTotals.lipidG / metabolicMetrics.weightKg).toFixed(1)} g/kg
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-white">
                {dayTotals.lipidG}g
              </span>
              <span className="text-xs text-slate-400">
                / {metabolicMetrics.targetFatG}g
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-rose-400 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((dayTotals.lipidG / metabolicMetrics.targetFatG) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Fibras Alimentares */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-violet-400">Fibras</span>
              <span className="text-[11px] text-slate-400">Meta IDR</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-white">
                {dayTotals.fiberG}g
              </span>
              <span className="text-xs text-slate-400">
                / {metabolicMetrics.targetFiberG}g
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-violet-400 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((dayTotals.fiberG / metabolicMetrics.targetFiberG) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Gaveta Expansível de Micronutrientes Comparados ao IDR */}
        {isIdrExpanded && (
          <div className="pt-3 border-t border-slate-800 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                Micronutrientes & Frações Lipídicas vs. IDR ({client.gender})
              </span>
              <span className="text-[11px] text-slate-400">
                Calculado automaticamente a partir dos itens prescritos na base TACO
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['Minerais', 'Vitaminas', 'Perfil Lipídico & Colesterol'] as const).map(
                (groupName) => (
                  <div
                    key={groupName}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5"
                  >
                    <h4 className="text-xs font-extrabold text-emerald-400 border-b border-slate-800 pb-2">
                      {groupName}
                    </h4>
                    <div className="space-y-2.5">
                      {idrItems
                        .filter((i) => i.group === groupName)
                        .map((micro) => {
                          const barColor = micro.isUpperLimit
                            ? micro.percentOfIdr > 100
                              ? 'bg-rose-500'
                              : 'bg-amber-400'
                            : micro.percentOfIdr >= 80
                            ? 'bg-emerald-400'
                            : 'bg-cyan-400';

                          return (
                            <div key={micro.key} className="space-y-1 tabular-nums">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-300 font-medium">
                                  {micro.label}
                                </span>
                                <span className="text-white font-bold">
                                  {micro.currentValue} / {micro.idrTarget} {micro.unit} (
                                  {micro.percentOfIdr}%)
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${barColor}`}
                                  style={{
                                    width: `${Math.min(100, micro.percentOfIdr)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
          NAVEGAÇÃO DAS 4 ÁREAS DO MÓDULO DE NUTRIÇÃO
      ==================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => setActiveTab('prescricao')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
            activeTab === 'prescricao'
              ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <Utensils className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-extrabold block truncate">
              Montagem de Dieta
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              Dias, horários, medidas e trocas
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('metabolico')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
            activeTab === 'metabolico'
              ? 'bg-cyan-600/20 border-cyan-500 text-white shadow-md'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <Calculator className="w-5 h-5 text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-extrabold block truncate">
              Cálculos Metabólicos
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              GET, TMB e 6 Fórmulas
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('idr')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
            activeTab === 'idr'
              ? 'bg-amber-600/20 border-amber-500 text-white shadow-md'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <Activity className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-extrabold block truncate">
              Raio-X Nutricional & IDR
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              Macros + 19 Micronutrientes
            </span>
          </div>
        </button>

      </div>

      {/* ====================================================================
          VISÃO 1: MONTAGEM INTELIGENTE DE DIETA (CARDÁPIOS, HORÁRIOS, MEDIDAS & SUBSTITUIÇÕES)
      ==================================================================== */}
      {activeTab === 'prescricao' && (
        <div className="space-y-5">
          {/* Seletor de Cardápios por Dias da Semana */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {dietPlan.schedules.map((sched) => {
                  const isSelected = sched.id === activeSchedule?.id;
                  return (
                    <button
                      key={sched.id}
                      type="button"
                      onClick={() =>
                        persistPlan({
                          ...dietPlan,
                          activeScheduleId: sched.id,
                        })
                      }
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {sched.name}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setIsNewScheduleOpen((prev) => !prev)}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Cardápio por Dias</span>
                </button>
              </div>

              {/* Dias da Semana vinculados ao Cardápio Ativo */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Dias:
                </span>
                {WEEK_DAYS_SHORT.map((d) => {
                  const active = activeSchedule?.weekDays.includes(d.day);
                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => handleToggleDayInSchedule(d.day)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        active
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                          : 'bg-slate-950 text-slate-500 border border-slate-800'
                      }`}
                      title={d.full}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {isNewScheduleOpen && (
              <form
                onSubmit={handleCreateSchedule}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
              >
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nome do Novo Cardápio (Ex: Dias de Treino Intenso / Recarga)
                  </label>
                  <input
                    type="text"
                    required
                    value={newScheduleName}
                    onChange={(e) => setNewScheduleName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer"
                >
                  Criar Cardápio
                </button>
              </form>
            )}

            {/* Barra de Adição de Refeição com Horário ou Importação de Template */}
            <div className="pt-3 border-t border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <input
                    type="time"
                    value={newMealTime}
                    onChange={(e) => setNewMealTime(e.target.value)}
                    className="bg-transparent text-xs font-extrabold text-white tabular-nums focus:outline-none"
                  />
                </div>

                <input
                  type="text"
                  value={newMealName}
                  onChange={(e) => setNewMealName(e.target.value)}
                  placeholder="Nome da refeição (ex: Pós-Treino)..."
                  className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />

                <button
                  type="button"
                  onClick={handleAddMeal}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Horário / Refeição</span>
                </button>
              </div>

              {/* Atalho Rápido: Importar Refeição Pré-definida do Profissional */}
              {library.mealTemplates.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto">
                  <span className="text-[11px] font-bold text-amber-400 whitespace-nowrap flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    Importar Pré-definida:
                  </span>
                  {library.mealTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleImportMealTemplate(tpl)}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold whitespace-nowrap cursor-pointer"
                    >
                      + {tpl.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lista de Refeições do Dia */}
          <div className="space-y-4">
            {activeSchedule?.meals.map((meal) => {
              const mealNutrients = sumNutrientProfiles(
                meal.items.map((it) => it.nutrients)
              );
              const isAddingHere = addingItemToMealId === meal.id;

              return (
                <div
                  key={meal.id}
                  className="rounded-3xl bg-slate-900 border border-slate-800 shadow-lg overflow-hidden"
                >
                  {/* Cabeçalho da Refeição */}
                  <div className="p-4 sm:p-5 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-extrabold text-xs tabular-nums flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          {editingMealTimeId === meal.id ? (
                            <span className="inline-flex items-center gap-1.5">
                              <input
                                type="time"
                                value={editingMealTimeValue}
                                onChange={(e) => setEditingMealTimeValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleUpdateMealTime(meal.id, editingMealTimeValue);
                                  } else if (e.key === 'Escape') {
                                    setEditingMealTimeId(null);
                                  }
                                }}
                                autoFocus
                                className="bg-slate-900 border border-emerald-500/50 rounded-md px-1.5 py-0.5 text-xs font-extrabold text-white tabular-nums focus:outline-none focus:border-emerald-400"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateMealTime(meal.id, editingMealTimeValue)
                                }
                                className="p-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 transition cursor-pointer"
                                title="Salvar novo horário"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingMealTimeId(null)}
                                className="p-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMealTimeId(meal.id);
                                setEditingMealTimeValue(meal.time);
                              }}
                              className="inline-flex items-center gap-1.5 hover:text-white transition cursor-pointer group"
                              title="Clique para editar o horário da refeição"
                            >
                              <span>{meal.time}</span>
                              <Pencil className="w-3 h-3 text-emerald-400/70 group-hover:text-emerald-300 transition" />
                            </button>
                          )}
                        </span>
                        <h3 className="text-sm sm:text-base font-extrabold text-white">
                          {meal.name}
                        </h3>
                      </div>

                      <p className="text-xs text-slate-400 tabular-nums">
                        Total da refeição:{' '}
                        <strong className="text-white">{mealNutrients.energyKcal} kcal</strong> ·
                        Carboidratos:{' '}
                        <strong className="text-amber-300">
                          {mealNutrients.carbohydrateG}g
                        </strong>{' '}
                        · Proteínas:{' '}
                        <strong className="text-cyan-300">{mealNutrients.proteinG}g</strong> ·
                        Gorduras:{' '}
                        <strong className="text-rose-300">{mealNutrients.lipidG}g</strong> ·
                        Fibras:{' '}
                        <strong className="text-violet-300">{mealNutrients.fiberG}g</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          setAddingItemToMealId(isAddingHere ? null : meal.id)
                        }
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar Alimento / Receita</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setSubModalState({
                            isOpen: true,
                            contextType: 'meal',
                            mealId: meal.id,
                            originalTitle: `${meal.time} - ${meal.name}`,
                            originalSubtitle: `${mealNutrients.energyKcal} kcal · P:${mealNutrients.proteinG}g · C:${mealNutrients.carbohydrateG}g · G:${mealNutrients.lipidG}g`,
                            originalNutrients: mealNutrients,
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        title="Trocar refeição inteira por receita do sistema com comparação de macros"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>Trocar Refeição por Receita</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteMeal(meal.id)}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 cursor-pointer"
                        title="Excluir refeição"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Gaveta de Adição de Alimento (g, ml, L, Medidas Caseiras POF) ou Receita */}
                  {isAddingHere && (
                    <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setAddItemMode('food')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                              addItemMode === 'food'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}
                          >
                            Alimentos TACO + Custom ({isLoadingFoods ? 'Carregando...' : allFoods.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setAddItemMode('recipe')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                              addItemMode === 'recipe'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}
                          >
                            Receitas Categorizadas ({library.recipes.length})
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setAddingItemToMealId(null)}
                          className="text-xs text-slate-400 hover:text-white cursor-pointer"
                        >
                          Fechar
                        </button>
                      </div>

                      {addItemMode === 'food' ? (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                            <div className="lg:col-span-3">
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                Buscar Alimento (TACO / POF / Código)
                              </label>
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={foodSearch}
                                  onChange={(e) => setFoodSearch(e.target.value)}
                                  placeholder="Ex: arroz, tapioca, cuscuz, 6300201..."
                                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                                />
                              </div>
                            </div>

                            <div className="lg:col-span-4">
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                Selecionar Alimento ({filteredFoodsForPicker.length} exibidos)
                              </label>
                              <select
                                value={activeFoodInPicker?.id || ''}
                                onChange={(e) => {
                                  setSelectedFoodId(e.target.value);
                                  const found = allFoods.find((x) => x.id === e.target.value);
                                  if (found) {
                                    const prefMeasure =
                                      found.measures.find(
                                        (m) => m.isReferenceMeasure && m.isPreparationMatch
                                      ) ||
                                      found.measures.find((m) => m.isReferenceMeasure) ||
                                      found.measures.find(
                                        (m) => m.source === 'pof' || m.source === 'custom'
                                      ) ||
                                      found.measures[0];
                                    setSelectedMeasureId(prefMeasure?.id || '');
                                    setSelectedQuantity(
                                      prefMeasure?.unitName === 'g' ||
                                        prefMeasure?.unitName === 'ml'
                                        ? '100'
                                        : '1'
                                    );
                                  }
                                }}
                                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                              >
                                {filteredFoodsForPicker.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.name} ({f.nutrientsPer100.energyKcal} kcal/{f.baseUnit})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="lg:col-span-3">
                              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                Medida Caseira POF / Unidade ({activeFoodInPicker?.measures.length || 0})
                              </label>
                              <select
                                value={activeMeasureInPicker?.id || ''}
                                onChange={(e) => {
                                  setSelectedMeasureId(e.target.value);
                                  const m = activeFoodInPicker?.measures.find(
                                    (x) => x.id === e.target.value
                                  );
                                  if (m && (m.unitName === 'g' || m.unitName === 'ml')) {
                                    setSelectedQuantity('100');
                                  } else {
                                    setSelectedQuantity('1');
                                  }
                                }}
                                className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-emerald-300"
                              >
                                {(activeFoodInPicker?.measures || []).map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="lg:col-span-2 flex gap-2">
                              <div className="flex-1">
                                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                  Qtd.
                                </label>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0.1"
                                  value={selectedQuantity}
                                  onChange={(e) => setSelectedQuantity(e.target.value)}
                                  className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-extrabold text-white tabular-nums"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleConfirmAddItemToMeal(meal.id)}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold self-end cursor-pointer"
                              >
                                Inserir
                              </button>
                            </div>
                          </div>

                          {/* Detalhe da Correlação POF/IBGE + Fonte + Preparo + Conversão Instantânea */}
                          {activeFoodInPicker && activeMeasureInPicker && (
                            <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300 tabular-nums">
                              <div className="flex items-center gap-2 flex-wrap">
                                {activeMeasureInPicker.isReferenceMeasure && (
                                  <span className="text-emerald-400 font-extrabold">
                                    ★ Medida de Referência POF
                                  </span>
                                )}
                                {activeMeasureInPicker.preparation && (
                                  <span>
                                    Preparo:{' '}
                                    <strong className="text-cyan-300">
                                      {activeMeasureInPicker.preparation}
                                    </strong>
                                  </span>
                                )}
                                {activeMeasureInPicker.sourceDescription && (
                                  <span>
                                    · Fonte:{' '}
                                    <strong className="text-white">
                                      {activeMeasureInPicker.sourceDescription}
                                    </strong>
                                  </span>
                                )}
                                {(activeMeasureInPicker.pofFoodCode ||
                                  activeFoodInPicker.pofCode) && (
                                  <span className="text-slate-400">
                                    · Cód. POF #{activeMeasureInPicker.pofFoodCode || activeFoodInPicker.pofCode} (
                                    {activeMeasureInPicker.pofFoodDescription ||
                                      activeFoodInPicker.pofDescription}
                                    )
                                  </span>
                                )}
                              </div>

                              <div className="text-slate-300 font-bold">
                                Equivalência:{' '}
                                <span className="text-emerald-400 font-extrabold">
                                  {Number(
                                    (
                                      (parseFloat(selectedQuantity.replace(',', '.')) || 1) *
                                      activeMeasureInPicker.grams
                                    ).toFixed(1)
                                  )}
                                  g
                                </span>{' '}
                                ·{' '}
                                <span className="text-white font-extrabold">
                                  {Math.round(
                                    (activeFoodInPicker.nutrientsPer100.energyKcal *
                                      ((parseFloat(selectedQuantity.replace(',', '.')) || 1) *
                                        activeMeasureInPicker.grams)) /
                                      100
                                  )}{' '}
                                  kcal
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                          <div className="sm:col-span-8">
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">
                              Selecionar Receita do Sistema / Profissional
                            </label>
                            <select
                              value={activeRecipeInPicker?.id || ''}
                              onChange={(e) => setSelectedRecipeId(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                            >
                              {library.recipes.map((r) => (
                                <option key={r.id} value={r.id}>
                                  [{r.category}] {r.name} — {r.nutrientsPerServing.energyKcal}{' '}
                                  kcal / porção ({r.servingWeightG}g)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-300 mb-1">
                              Porções
                            </label>
                            <input
                              type="number"
                              step="0.25"
                              min="0.25"
                              value={selectedQuantity}
                              onChange={(e) => setSelectedQuantity(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-extrabold text-white tabular-nums"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <button
                              type="button"
                              onClick={() => handleConfirmAddItemToMeal(meal.id)}
                              className="w-full py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer"
                            >
                              Inserir Receita
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lista de Itens da Refeição */}
                  <div className="divide-y divide-slate-800/70">
                    {meal.items.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        Nenhum alimento ou receita nesta refeição. Clique em{' '}
                        <strong className="text-emerald-400">
                          + Adicionar Alimento / Receita
                        </strong>{' '}
                        acima.
                      </div>
                    ) : (
                      meal.items.map((item) => {
                        const matchedFood = allFoods.find((f) => f.id === item.sourceId);
                        const matchedMeasure = matchedFood?.measures.find(
                          (m) => m.id === item.measureId
                        );

                        return (
                          <div key={item.id} className="p-4 space-y-2.5">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs sm:text-sm font-bold text-white">
                                    {item.name}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    · {item.category}
                                  </span>
                                  {matchedMeasure?.preparation && (
                                    <span className="text-[11px] text-cyan-400">
                                      · {matchedMeasure.preparation}
                                    </span>
                                  )}
                                  {matchedMeasure?.sourceDescription && (
                                    <span className="text-[11px] text-slate-400">
                                      · Ref: {matchedMeasure.sourceDescription} (
                                      {matchedMeasure.grams}g/unid.)
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-slate-300 tabular-nums">
                                  Peso equivalente:{' '}
                                  <strong className="text-emerald-400">
                                    {item.gramsEquivalent}g
                                  </strong>{' '}
                                  · <strong className="text-white">{item.nutrients.energyKcal} kcal</strong> · C:{' '}
                                  <span className="text-amber-300 font-semibold">
                                    {item.nutrients.carbohydrateG}g
                                  </span>{' '}
                                  · P:{' '}
                                  <span className="text-cyan-300 font-semibold">
                                    {item.nutrients.proteinG}g
                                  </span>{' '}
                                  · G:{' '}
                                  <span className="text-rose-300 font-semibold">
                                    {item.nutrients.lipidG}g
                                  </span>{' '}
                                  · Fibras:{' '}
                                  <span className="text-violet-300 font-semibold">
                                    {item.nutrients.fiberG}g
                                  </span>
                                </p>
                              </div>

                              {/* Controles de Quantidade, Medida Caseira e Substituição Dinâmica */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0.1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateMealItemQuantityOrMeasure(
                                      meal.id,
                                      item,
                                      parseFloat(e.target.value) || 1
                                    )
                                  }
                                  className="w-20 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-extrabold text-white tabular-nums text-center"
                                  title="Quantidade na unidade selecionada"
                                />

                                {item.sourceType === 'food' && matchedFood ? (
                                  <select
                                    value={item.measureId}
                                    onChange={(e) =>
                                      handleUpdateMealItemQuantityOrMeasure(
                                        meal.id,
                                        item,
                                        item.quantity,
                                        e.target.value
                                      )
                                    }
                                    className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 max-w-[270px]"
                                  >
                                    {matchedFood.measures.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                                    {item.measureLabel}
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    setSubModalState({
                                      isOpen: true,
                                      contextType: 'item',
                                      mealId: meal.id,
                                      itemId: item.id,
                                      originalTitle: item.name,
                                      originalSubtitle: `${item.quantity} ${item.measureLabel} (${item.gramsEquivalent}g) · ${item.nutrients.energyKcal} kcal`,
                                      originalNutrients: item.nutrients,
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                >
                                  <ArrowLeftRight className="w-3.5 h-3.5" />
                                  <span>Substituir</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteMealItem(meal.id, item.id)}
                                  className="p-1.5 rounded-xl bg-slate-950 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 cursor-pointer"
                                  title="Remover item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Opções de Substituição Anexadas a este Item */}
                            {item.substitutions && item.substitutions.length > 0 && (
                              <div className="pl-3 border-l border-slate-800 space-y-1.5 pt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  Opções Equivalentes de Substituição deste Item:
                                </span>
                                {item.substitutions.map((sub) => (
                                  <div
                                    key={sub.id}
                                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800/80 text-xs"
                                  >
                                    <div className="tabular-nums text-slate-300">
                                      <strong className="text-emerald-300">
                                        ↔ {sub.targetName}
                                      </strong>{' '}
                                      · {sub.quantity} {sub.measureLabel} ({sub.gramsEquivalent}
                                      g) · {sub.nutrients.energyKcal} kcal · C:{' '}
                                      {sub.nutrients.carbohydrateG}g · P:{' '}
                                      {sub.nutrients.proteinG}g · G: {sub.nutrients.lipidG}g
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSwapItemWithSavedSub(meal.id, item, sub)
                                      }
                                      className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
                                    >
                                      Tornar Titular
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Opções de Substituição da Refeição Inteira por Receitas do Sistema */}
                  {meal.mealSubstitutions && meal.mealSubstitutions.length > 0 && (
                    <div className="p-4 bg-slate-950/60 border-t border-slate-800 space-y-2">
                      <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ChefHat className="w-3.5 h-3.5" />
                        <span>
                          Receitas Equivalentes para Substituir esta Refeição Inteira:
                        </span>
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {meal.mealSubstitutions.map((msub) => (
                          <div
                            key={msub.id}
                            className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs tabular-nums"
                          >
                            <div>
                              <p className="font-bold text-white">{msub.targetName}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {msub.quantity} porção(ões) ({msub.gramsEquivalent}g) ·{' '}
                                {msub.nutrients.energyKcal} kcal · C:{' '}
                                {msub.nutrients.carbohydrateG}g · P:{' '}
                                {msub.nutrients.proteinG}g · G: {msub.nutrients.lipidG}g ·
                                Fib: {msub.nutrients.fiberG}g
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                // Substituir itens da refeição por esta receita
                                const replacedItem: DietMealItem = {
                                  id: `item-${Date.now()}`,
                                  sourceType: msub.targetType,
                                  sourceId: msub.targetId,
                                  name: msub.targetName,
                                  category: msub.category,
                                  measureId: msub.measureId,
                                  measureLabel: msub.measureLabel,
                                  quantity: msub.quantity,
                                  gramsEquivalent: msub.gramsEquivalent,
                                  nutrients: msub.nutrients,
                                  substitutions: [],
                                };
                                updateActiveSchedule((sched) => ({
                                  ...sched,
                                  meals: sched.meals.map((m) =>
                                    m.id === meal.id
                                      ? { ...m, items: [replacedItem] }
                                      : m
                                  ),
                                }));
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold shrink-0 cursor-pointer"
                            >
                              Aplicar na Refeição
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ====================================================================
          VISÃO 2: CÁLCULOS METABÓLICOS (GET, TMB E 6 FÓRMULAS INTEGRADAS)
      ==================================================================== */}
      {activeTab === 'metabolico' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Coluna Esquerda: Parâmetros Antropométricos, %BF, FAF e Objetivo */}
          <div className="lg:col-span-6 p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-cyan-400" />
                <span>Parâmetros Metabólicos de {client.name}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ajuste o percentual de gordura (%BF), fator de atividade física e metas por kg corporal.
              </p>
            </div>

            {/* Resumo Antropométrico + Input de % de Gordura Corporal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Peso Atual
                </span>
                <span className="text-base font-black text-white">
                  {metabolicMetrics.weightKg} kg
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Altura / Idade
                </span>
                <span className="text-base font-black text-white">
                  {metabolicMetrics.heightCm} cm · {metabolicMetrics.age}a
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-cyan-500/40">
                <label className="text-[10px] font-bold uppercase text-cyan-400 block">
                  % Gordura (BF%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="3"
                  max="60"
                  value={dietPlan.metabolicConfig.bodyFatPercent ?? metabolicMetrics.bodyFatPercent}
                  onChange={(e) =>
                    updateMetabolicConfig({
                      bodyFatPercent: parseFloat(e.target.value) || 15,
                    })
                  }
                  className="w-full bg-transparent text-base font-black text-white focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-bold uppercase text-emerald-400 block">
                  Massa Magra (MLG)
                </span>
                <span className="text-base font-black text-emerald-300">
                  {metabolicMetrics.leanBodyMassKg} kg
                </span>
              </div>
            </div>

            {/* Seleção do Nível de Atividade Física (FAF) */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-white">
                Fator de Atividade Física (FAF) + Gasto Adicional de Treino
              </label>
              <div className="space-y-2">
                {ACTIVITY_LEVELS_META.map((act) => {
                  const isSelected = dietPlan.metabolicConfig.activityLevel === act.id;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() =>
                        updateMetabolicConfig({
                          activityLevel: act.id,
                          activityFactor: act.factor,
                        })
                      }
                      className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-600/20 border-cyan-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-extrabold block">
                          {act.label} (×{act.factor})
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {act.description}
                        </span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ajuste Calórico do Objetivo (Déficit, Manutenção, Superávit) e Metas g/kg */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Gasto Extra de Treino (kcal/dia)
                </label>
                <input
                  type="number"
                  step="25"
                  value={dietPlan.metabolicConfig.workoutCalories}
                  onChange={(e) =>
                    updateMetabolicConfig({
                      workoutCalories: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-extrabold text-white tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Ajuste do Objetivo (Déficit / Superávit kcal)
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateMetabolicConfig({
                        goalType: 'deficit',
                        goalDeltaKcal: -400,
                      })
                    }
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                      dietPlan.metabolicConfig.goalDeltaKcal < 0
                        ? 'bg-rose-600/20 text-rose-300 border-rose-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    -400
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateMetabolicConfig({
                        goalType: 'manutencao',
                        goalDeltaKcal: 0,
                      })
                    }
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                      dietPlan.metabolicConfig.goalDeltaKcal === 0
                        ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateMetabolicConfig({
                        goalType: 'superavit',
                        goalDeltaKcal: 350,
                      })
                    }
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                      dietPlan.metabolicConfig.goalDeltaKcal > 0
                        ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    +350
                  </button>
                  <input
                    type="number"
                    step="50"
                    value={dietPlan.metabolicConfig.goalDeltaKcal}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      const gType: DietGoalType =
                        val < 0 ? 'deficit' : val > 0 ? 'superavit' : 'manutencao';
                      updateMetabolicConfig({
                        goalType: gType,
                        goalDeltaKcal: val,
                      });
                    }}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-extrabold text-white tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-cyan-400 mb-1">
                  Meta de Proteína (g/kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.8"
                  max="4.0"
                  value={dietPlan.metabolicConfig.proteinGPerKg}
                  onChange={(e) =>
                    updateMetabolicConfig({
                      proteinGPerKg: parseFloat(e.target.value) || 2.0,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-extrabold text-white tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-400 mb-1">
                  Meta de Gorduras (g/kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.4"
                  max="2.5"
                  value={dietPlan.metabolicConfig.fatGPerKg}
                  onChange={(e) =>
                    updateMetabolicConfig({
                      fatGPerKg: parseFloat(e.target.value) || 0.9,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-extrabold text-white tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Coluna Direita: Comparativo das 6 Equações Metabólicas (TMB e GET) */}
          <div className="lg:col-span-6 p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">
                Fórmulas de Estimativa de TMB & GET
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Selecione a equação titular do cliente. Compare instantaneamente o gasto basal e total entre todas as fórmulas científicas.
              </p>
            </div>

            <div className="space-y-2.5">
              {METABOLIC_FORMULAS_META.map((fMeta) => {
                const bmrVal = metabolicMetrics.allFormulasBmr[fMeta.id];
                const getVal = Math.round(
                  bmrVal * dietPlan.metabolicConfig.activityFactor +
                    dietPlan.metabolicConfig.workoutCalories
                );
                const isSelected = dietPlan.metabolicConfig.formula === fMeta.id;

                return (
                  <button
                    key={fMeta.id}
                    type="button"
                    onClick={() => updateMetabolicConfig({ formula: fMeta.id })}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-extrabold text-white">
                          {fMeta.name}
                        </span>
                        <span className="text-[11px] text-emerald-400 font-semibold">
                          · {fMeta.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{fMeta.subtitle}</p>
                    </div>

                    <div className="text-right tabular-nums shrink-0">
                      <div className="text-xs text-slate-400">
                        TMB: <strong className="text-white">{bmrVal} kcal</strong>
                      </div>
                      <div className="text-sm font-black text-emerald-400">
                        GET: {getVal} kcal
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          VISÃO 3: RAIO-X NUTRICIONAL & TABELA COMPLETA DE MICRONUTRIENTES (IDR)
      ==================================================================== */}
      {activeTab === 'idr' && (
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold text-white">
                Comparativo Completo de Macronutrientes e Micronutrientes vs. IDR
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Valores consolidados do cardápio ativo ({activeSchedule?.name}) frente às diretrizes de Ingestão Diária Recomendada para {client.gender}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['Minerais', 'Vitaminas', 'Perfil Lipídico & Colesterol'] as const).map(
              (groupName) => (
                <div
                  key={groupName}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                >
                  <h4 className="text-sm font-extrabold text-emerald-400 border-b border-slate-800 pb-2">
                    {groupName}
                  </h4>
                  <div className="space-y-3">
                    {idrItems
                      .filter((i) => i.group === groupName)
                      .map((micro) => (
                        <div key={micro.key} className="space-y-1 tabular-nums">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-200">
                              {micro.label}
                            </span>
                            <span className="font-bold text-white">
                              {micro.currentValue} / {micro.idrTarget} {micro.unit} (
                              {micro.percentOfIdr}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                micro.isUpperLimit && micro.percentOfIdr > 100
                                  ? 'bg-rose-500'
                                  : micro.percentOfIdr >= 80
                                  ? 'bg-emerald-400'
                                  : 'bg-cyan-400'
                              }`}
                              style={{
                                width: `${Math.min(100, micro.percentOfIdr)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          VISÃO 4: PAINEL DO PROFISSIONAL (ALIMENTOS, RECEITAS, REFEIÇÕES & PORÇÕES)
      ==================================================================== */}


      {/* Modal de Substituição Dinâmica (Alimento ou Refeição Inteira por Receita) */}
      <DynamicSubstitutionModal
        isOpen={subModalState.isOpen}
        onClose={() => setSubModalState((prev) => ({ ...prev, isOpen: false }))}
        contextType={subModalState.contextType}
        originalTitle={subModalState.originalTitle}
        originalSubtitle={subModalState.originalSubtitle}
        originalNutrients={subModalState.originalNutrients}
        foods={allFoods}
        recipes={library.recipes}
        onReplaceDirectly={(sub) => {
          if (subModalState.contextType === 'meal') {
            const newItem: DietMealItem = {
              id: `item-${Date.now()}`,
              sourceType: sub.targetType,
              sourceId: sub.targetId,
              name: sub.targetName,
              category: sub.category,
              measureId: sub.measureId,
              measureLabel: sub.measureLabel,
              quantity: sub.quantity,
              gramsEquivalent: sub.gramsEquivalent,
              nutrients: sub.nutrients,
              substitutions: [],
            };
            updateActiveSchedule((sched) => ({
              ...sched,
              meals: sched.meals.map((m) =>
                m.id === subModalState.mealId ? { ...m, items: [newItem] } : m
              ),
            }));
          } else if (subModalState.itemId) {
            updateActiveSchedule((sched) => ({
              ...sched,
              meals: sched.meals.map((m) =>
                m.id === subModalState.mealId
                  ? {
                      ...m,
                      items: m.items.map((it) =>
                        it.id === subModalState.itemId
                          ? {
                              ...it,
                              sourceType: sub.targetType,
                              sourceId: sub.targetId,
                              name: sub.targetName,
                              category: sub.category,
                              measureId: sub.measureId,
                              measureLabel: sub.measureLabel,
                              quantity: sub.quantity,
                              gramsEquivalent: sub.gramsEquivalent,
                              nutrients: sub.nutrients,
                            }
                          : it
                      ),
                    }
                  : m
              ),
            }));
          }
          setSaveToast('Substituição aplicada com sucesso!');
          setTimeout(() => setSaveToast(null), 2500);
        }}
        onAddSubstitutionOption={(sub) => {
          if (subModalState.contextType === 'meal') {
            updateActiveSchedule((sched) => ({
              ...sched,
              meals: sched.meals.map((m) =>
                m.id === subModalState.mealId
                  ? {
                      ...m,
                      mealSubstitutions: [...(m.mealSubstitutions || []), sub],
                    }
                  : m
              ),
            }));
          } else if (subModalState.itemId) {
            updateActiveSchedule((sched) => ({
              ...sched,
              meals: sched.meals.map((m) =>
                m.id === subModalState.mealId
                  ? {
                      ...m,
                      items: m.items.map((it) =>
                        it.id === subModalState.itemId
                          ? {
                              ...it,
                              substitutions: [...(it.substitutions || []), sub],
                            }
                          : it
                      ),
                    }
                  : m
              ),
            }));
          }
          setSaveToast('Opção de substituição anexada ao cardápio!');
          setTimeout(() => setSaveToast(null), 2500);
        }}
      />
    </div>
  );
};
