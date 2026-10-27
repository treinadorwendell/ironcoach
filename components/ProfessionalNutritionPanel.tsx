'use client';

import React, { useState, useMemo } from 'react';
import {
  CustomPortionRecord,
  DietMealItem,
  HouseholdMeasureOption,
  NutrientProfile,
  NutritionFoodItem,
  NutritionProfessionalLibrary,
  NutritionRecipe,
  NutritionRecipeIngredient,
  PredefinedMealTemplate,
  RECIPE_CATEGORIES,
  RecipeCategory,
} from '@/types';
import {
  EMPTY_NUTRIENT_PROFILE,
  getUniversalMeasures,
  scaleNutrients,
  sumNutrientProfiles,
} from '@/lib/nutritionEngine';
import {
  BookOpen,
  CheckCircle2,
  ChefHat,
  Clock,
  Layers,
  Plus,
  Scale,
  Search,
  Trash2,
  Utensils,
} from 'lucide-react';

interface ProfessionalNutritionPanelProps {
  library: NutritionProfessionalLibrary;
  allFoods: NutritionFoodItem[];
  onSaveLibrary: (updated: NutritionProfessionalLibrary) => void;
}

export const ProfessionalNutritionPanel: React.FC<ProfessionalNutritionPanelProps> = ({
  library,
  allFoods,
  onSaveLibrary,
}) => {
  const [subTab, setSubTab] = useState<'alimentos' | 'receitas' | 'refeicoes' | 'porcoes'>(
    'receitas'
  );
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 2800);
  };

  // ==========================================================================
  // 1. STATE: NOVO ALIMENTO PERSONALIZADO
  // ==========================================================================
  const [foodName, setFoodName] = useState('');
  const [foodCategory, setFoodCategory] = useState('Suplementos Esportivos');
  const [foodBaseUnit, setFoodBaseUnit] = useState<'100g' | '100ml'>('100g');
  const [foodKcal, setFoodKcal] = useState('120');
  const [foodProtein, setFoodProtein] = useState('24');
  const [foodCarb, setFoodCarb] = useState('3');
  const [foodFat, setFoodFat] = useState('1.5');
  const [foodFiber, setFoodFiber] = useState('0');
  const [foodSodium, setFoodSodium] = useState('80');
  const [foodCalcium, setFoodCalcium] = useState('110');
  const [foodIron, setFoodIron] = useState('0.5');
  const [foodVitaminC, setFoodVitaminC] = useState('0');
  const [customMeasureName, setCustomMeasureName] = useState('Scoop / Medida');
  const [customMeasureGrams, setCustomMeasureGrams] = useState('30');

  const handleAddCustomFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) return;

    const customGrams = Math.max(1, parseFloat(customMeasureGrams) || 30);
    const customMeasures: HouseholdMeasureOption[] = [];
    if (customMeasureName.trim()) {
      customMeasures.push({
        id: `cm-${Date.now()}`,
        unitName: customMeasureName.trim(),
        label: `${customMeasureName.trim()} (${customGrams}${foodBaseUnit === '100ml' ? 'ml' : 'g'})`,
        grams: customGrams,
        source: 'custom',
      });
    }

    const newFood: NutritionFoodItem = {
      id: `custom-food-${Date.now()}`,
      name: foodName.trim(),
      category: foodCategory.trim() || 'Personalizados',
      isCustom: true,
      baseUnit: foodBaseUnit,
      nutrientsPer100: {
        ...EMPTY_NUTRIENT_PROFILE,
        energyKcal: parseFloat(foodKcal) || 0,
        proteinG: parseFloat(foodProtein) || 0,
        carbohydrateG: parseFloat(foodCarb) || 0,
        lipidG: parseFloat(foodFat) || 0,
        fiberG: parseFloat(foodFiber) || 0,
        sodiumMg: parseFloat(foodSodium) || 0,
        calciumMg: parseFloat(foodCalcium) || 0,
        ironMg: parseFloat(foodIron) || 0,
        vitaminCMg: parseFloat(foodVitaminC) || 0,
      },
      measures: [
        ...customMeasures,
        ...getUniversalMeasures(foodBaseUnit === '100ml'),
      ],
      createdAt: new Date().toISOString(),
    };

    onSaveLibrary({
      ...library,
      customFoods: [newFood, ...library.customFoods],
    });

    setFoodName('');
    triggerToast(`Alimento "${newFood.name}" cadastrado com sucesso!`);
  };

  const handleDeleteCustomFood = (id: string) => {
    onSaveLibrary({
      ...library,
      customFoods: library.customFoods.filter((f) => f.id !== id),
    });
  };

  // ==========================================================================
  // 2. STATE: NOVA RECEITA CATEGORIZADA
  // ==========================================================================
  const [recipeName, setRecipeName] = useState('');
  const [recipeCategory, setRecipeCategory] = useState<RecipeCategory>('Café da Manhã');
  const [recipeServings, setRecipeServings] = useState('1');
  const [recipePrepTime, setRecipePrepTime] = useState('10');
  const [recipeInstructions, setRecipeInstructions] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState<NutritionRecipeIngredient[]>([]);

  // Ingrediente temporário para adicionar à receita
  const [ingSearch, setIngSearch] = useState('');
  const [selectedIngFoodId, setSelectedIngFoodId] = useState(allFoods[0]?.id || '');
  const [selectedIngMeasureId, setSelectedIngMeasureId] = useState('');
  const [ingQuantity, setIngQuantity] = useState('1');

  const filteredIngFoods = allFoods
    .filter(
      (f) =>
        !ingSearch.trim() ||
        f.name.toLowerCase().includes(ingSearch.trim().toLowerCase()) ||
        f.category.toLowerCase().includes(ingSearch.trim().toLowerCase())
    )
    .slice(0, 50);

  const currentIngFood =
    allFoods.find((f) => f.id === selectedIngFoodId) ||
    filteredIngFoods[0] ||
    allFoods[0];

  const currentIngMeasure =
    currentIngFood?.measures.find((m) => m.id === selectedIngMeasureId) ||
    currentIngFood?.measures[0];

  const handleAddIngredientToRecipe = () => {
    if (!currentIngFood || !currentIngMeasure) return;
    const qty = Math.max(0.1, parseFloat(ingQuantity) || 1);
    const grams = Number((qty * currentIngMeasure.grams).toFixed(1));
    const nutrients = scaleNutrients(currentIngFood.nutrientsPer100, grams);

    const newIng: NutritionRecipeIngredient = {
      id: `ring-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      foodId: currentIngFood.id,
      foodName: currentIngFood.name,
      measureId: currentIngMeasure.id,
      measureLabel: currentIngMeasure.unitName,
      quantity: qty,
      gramsEquivalent: grams,
      nutrients,
    };

    setRecipeIngredients((prev) => [...prev, newIng]);
  };

  const handleSaveRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeName.trim()) return;

    const servingsCount = Math.max(1, parseInt(recipeServings, 10) || 1);
    const totalWeightG =
      recipeIngredients.length > 0
        ? Math.round(recipeIngredients.reduce((s, i) => s + i.gramsEquivalent, 0))
        : 180;
    const servingWeightG = Math.max(30, Math.round(totalWeightG / servingsCount));

    const nutrientsTotal: NutrientProfile =
      recipeIngredients.length > 0
        ? sumNutrientProfiles(recipeIngredients.map((i) => i.nutrients))
        : {
            ...EMPTY_NUTRIENT_PROFILE,
            energyKcal: 280,
            proteinG: 22,
            carbohydrateG: 28,
            lipidG: 8,
            fiberG: 3.5,
          };

    const nutrientsPerServing = scaleNutrients(nutrientsTotal, 100 / servingsCount);

    const newRecipe: NutritionRecipe = {
      id: `rec-custom-${Date.now()}`,
      name: recipeName.trim(),
      category: recipeCategory,
      servings: servingsCount,
      servingWeightG,
      prepTimeMinutes: Math.max(1, parseInt(recipePrepTime, 10) || 10),
      instructions:
        recipeInstructions.trim() || 'Misture os ingredientes e prepare conforme orientação.',
      ingredients: recipeIngredients,
      nutrientsPerServing,
      nutrientsTotal,
      isSystemDefault: false,
      createdAt: new Date().toISOString(),
    };

    onSaveLibrary({
      ...library,
      recipes: [newRecipe, ...library.recipes],
    });

    setRecipeName('');
    setRecipeInstructions('');
    setRecipeIngredients([]);
    triggerToast(`Receita "${newRecipe.name}" adicionada ao sistema!`);
  };

  const handleDeleteRecipe = (id: string) => {
    onSaveLibrary({
      ...library,
      recipes: library.recipes.filter((r) => r.id !== id),
    });
  };

  // ==========================================================================
  // 3. STATE: REFEIÇÃO PRÉ-DEFINIDA (TEMPLATE)
  // ==========================================================================
  const [tplName, setTplName] = useState('');
  const [tplTime, setTplTime] = useState('08:00');
  const [tplCategory, setTplCategory] = useState('Café da Manhã');
  const [tplNotes, setTplNotes] = useState('');
  const [tplItems, setTplItems] = useState<DietMealItem[]>([]);

  const handleAddIngToTemplate = () => {
    if (!currentIngFood || !currentIngMeasure) return;
    const qty = Math.max(0.1, parseFloat(ingQuantity) || 1);
    const grams = Number((qty * currentIngMeasure.grams).toFixed(1));
    const nutrients = scaleNutrients(currentIngFood.nutrientsPer100, grams);

    const newItem: DietMealItem = {
      id: `tpli-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      sourceType: 'food',
      sourceId: currentIngFood.id,
      name: currentIngFood.name,
      category: currentIngFood.category,
      measureId: currentIngMeasure.id,
      measureLabel: currentIngMeasure.unitName,
      quantity: qty,
      gramsEquivalent: grams,
      nutrients,
      substitutions: [],
    };
    setTplItems((prev) => [...prev, newItem]);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim() || tplItems.length === 0) return;

    const newTpl: PredefinedMealTemplate = {
      id: `tpl-${Date.now()}`,
      name: tplName.trim(),
      category: tplCategory,
      defaultTime: tplTime || '08:00',
      notes: tplNotes.trim(),
      items: tplItems,
      nutrientsTotal: sumNutrientProfiles(tplItems.map((i) => i.nutrients)),
      createdAt: new Date().toISOString(),
    };

    onSaveLibrary({
      ...library,
      mealTemplates: [newTpl, ...library.mealTemplates],
    });

    setTplName('');
    setTplNotes('');
    setTplItems([]);
    triggerToast(`Refeição pré-definida "${newTpl.name}" salva!`);
  };

  const handleDeleteTemplate = (id: string) => {
    onSaveLibrary({
      ...library,
      mealTemplates: library.mealTemplates.filter((t) => t.id !== id),
    });
  };

  // ==========================================================================
  // 4. STATE: PORÇÕES & MEDIDAS CASEIRAS PERSONALIZADAS + EXPLORADOR POF
  // ==========================================================================
  const [portionName, setPortionName] = useState('');
  const [portionUnit, setPortionUnit] = useState('');
  const [portionGrams, setPortionGrams] = useState('30');
  const [portionCategory, setPortionCategory] = useState('Todos');
  const [pofExplorerSearch, setPofExplorerSearch] = useState('');
  const [selectedPofFoodId, setSelectedPofFoodId] = useState('');
  const [pofPrepFilter, setPofPrepFilter] = useState('Todos');

  const pofCorrelatedFoods = useMemo(() => {
    const q = pofExplorerSearch.trim().toLowerCase();
    return allFoods
      .filter((f) => {
        const hasPof = f.pofCode || f.measures.some((m) => m.source === 'pof');
        if (!hasPof) return false;
        if (!q) return true;
        return (
          f.name.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          (f.pofCode && f.pofCode.toLowerCase().includes(q)) ||
          (f.pofDescription && f.pofDescription.toLowerCase().includes(q))
        );
      })
      .slice(0, 120);
  }, [allFoods, pofExplorerSearch]);

  const activeExplorerFood = useMemo(() => {
    return (
      allFoods.find((f) => f.id === selectedPofFoodId) ||
      pofCorrelatedFoods[0] ||
      allFoods[0]
    );
  }, [allFoods, selectedPofFoodId, pofCorrelatedFoods]);

  const availablePrepsForActiveFood = useMemo(() => {
    if (!activeExplorerFood) return ['Todos'];
    const set = new Set<string>();
    activeExplorerFood.measures.forEach((m) => {
      if (m.source === 'pof' && m.preparation) {
        set.add(m.preparation);
      }
    });
    return ['Todos', ...Array.from(set)];
  }, [activeExplorerFood]);

  const filteredExplorerMeasures = useMemo(() => {
    if (!activeExplorerFood) return [];
    return activeExplorerFood.measures.filter((m) => {
      if (m.source !== 'pof') return false;
      if (pofPrepFilter === 'Todos') return true;
      return m.preparation === pofPrepFilter;
    });
  }, [activeExplorerFood, pofPrepFilter]);

  const handleAddPortion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!portionName.trim() || !portionUnit.trim()) return;
    const grams = Math.max(1, parseFloat(portionGrams) || 30);

    const newPortion: CustomPortionRecord = {
      id: `cp-${Date.now()}`,
      name: portionName.trim(),
      unitName: portionUnit.trim(),
      grams,
      applicableCategory: portionCategory,
      createdAt: new Date().toISOString(),
    };

    onSaveLibrary({
      ...library,
      customPortions: [newPortion, ...library.customPortions],
    });

    setPortionName('');
    setPortionUnit('');
    triggerToast(`Porção personalizada "${newPortion.name}" cadastrada!`);
  };

  const handleClonePofMeasureToCustom = (
    food: NutritionFoodItem,
    measure: HouseholdMeasureOption
  ) => {
    setPortionName(
      `${measure.unitName}${measure.preparation ? ` (${measure.preparation})` : ''} — ${
        measure.sourceDescription || food.name
      }`
    );
    setPortionUnit(measure.unitName);
    setPortionGrams(String(measure.grams));
    setPortionCategory(food.category);
    triggerToast(
      `Medida POF "${measure.unitName} (${measure.grams}g)" carregada no formulário ao lado!`
    );
  };

  const handleDeletePortion = (id: string) => {
    onSaveLibrary({
      ...library,
      customPortions: library.customPortions.filter((p) => p.id !== id),
    });
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho do Painel do Profissional */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-white">
              Painel do Profissional — Autonomia Nutricional
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Crie e configure novos alimentos, receitas categorizadas para substituições, refeições pré-definidas e porções personalizadas.
            </p>
          </div>

          {savedToast && (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs font-bold text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{savedToast}</span>
            </div>
          )}
        </div>

        {/* Sub-Abas do Painel do Profissional */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={() => setSubTab('receitas')}
            className={`py-3 px-3.5 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
              subTab === 'receitas'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <ChefHat className="w-4 h-4 shrink-0" />
            <span>Receitas ({library.recipes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('alimentos')}
            className={`py-3 px-3.5 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
              subTab === 'alimentos'
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-md'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Utensils className="w-4 h-4 shrink-0" />
            <span>Meus Alimentos ({library.customFoods.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('refeicoes')}
            className={`py-3 px-3.5 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
              subTab === 'refeicoes'
                ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Refeições Pré ({library.mealTemplates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('porcoes')}
            className={`py-3 px-3.5 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
              subTab === 'porcoes'
                ? 'bg-violet-600 text-white border-violet-400 shadow-md'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Scale className="w-4 h-4 shrink-0" />
            <span>Porções & Medidas ({library.customPortions.length})</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          ABA 1: RECEITAS CATEGORIZADAS DO SISTEMA E PROFISSIONAL
      ==================================================================== */}
      {subTab === 'receitas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Formulário de Criação de Receita */}
          <form
            onSubmit={handleSaveRecipe}
            className="lg:col-span-6 p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4"
          >
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <ChefHat className="w-4 h-4 text-emerald-400" />
              <span>Cadastrar Nova Receita Categorizada</span>
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nome da Receita *
                </label>
                <input
                  type="text"
                  required
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder="Ex: Bolinho Proteico de Aveia, Cacau e Banana"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={recipeCategory}
                    onChange={(e) => setRecipeCategory(e.target.value as RecipeCategory)}
                    className="w-full px-2.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                  >
                    {RECIPE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Rendimento (Porções)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={recipeServings}
                    onChange={(e) => setRecipeServings(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Preparo (min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={recipePrepTime}
                    onChange={(e) => setRecipePrepTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Construtor de Ingredientes da Receita */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-xs font-extrabold text-emerald-400 block">
                  Adicionar Ingredientes (Calcula Macros e Micros Automaticamente)
                </span>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ingSearch}
                    onChange={(e) => setIngSearch(e.target.value)}
                    placeholder="Filtrar ingrediente (ex: aveia, ovo, frango, whey)..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-5">
                    <select
                      value={currentIngFood?.id || ''}
                      onChange={(e) => {
                        setSelectedIngFoodId(e.target.value);
                        const f = allFoods.find((item) => item.id === e.target.value);
                        if (f) setSelectedIngMeasureId(f.measures[0]?.id || '');
                      }}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    >
                      {filteredIngFoods.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <select
                      value={currentIngMeasure?.id || ''}
                      onChange={(e) => setSelectedIngMeasureId(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                    >
                      {(currentIngFood?.measures || []).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3 flex gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      value={ingQuantity}
                      onChange={(e) => setIngQuantity(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={handleAddIngredientToRecipe}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 cursor-pointer"
                      title="Inserir ingrediente"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {recipeIngredients.length > 0 && (
                  <div className="pt-2 space-y-1.5">
                    {recipeIngredients.map((ing) => (
                      <div
                        key={ing.id}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-white">{ing.foodName}</span>
                          <span className="text-slate-400 tabular-nums ml-2">
                            · {ing.quantity} {ing.measureLabel} ({ing.gramsEquivalent}g) ·{' '}
                            {ing.nutrients.energyKcal} kcal
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setRecipeIngredients((prev) => prev.filter((x) => x.id !== ing.id))
                          }
                          className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Modo de Preparo & Orientações
                </label>
                <textarea
                  rows={2}
                  value={recipeInstructions}
                  onChange={(e) => setRecipeInstructions(e.target.value)}
                  placeholder="Descreva o passo a passo da receita para o cliente..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Salvar Receita no Sistema</span>
              </button>
            </div>
          </form>

          {/* Lista de Receitas Categorizadas */}
          <div className="lg:col-span-6 p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 max-h-[600px] overflow-y-auto">
            <h4 className="text-sm font-extrabold text-white border-b border-slate-800 pb-3">
              Receitas Disponíveis para Prescrição e Substituição ({library.recipes.length})
            </h4>

            <div className="space-y-2.5">
              {library.recipes.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-white">{rec.name}</span>
                      <span className="text-[11px] text-emerald-400 font-semibold">
                        · {rec.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 tabular-nums">
                      1 porção ({rec.servingWeightG}g) · {rec.nutrientsPerServing.energyKcal}{' '}
                      kcal · P: {rec.nutrientsPerServing.proteinG}g · C:{' '}
                      {rec.nutrientsPerServing.carbohydrateG}g · G:{' '}
                      {rec.nutrientsPerServing.lipidG}g · Fibras:{' '}
                      {rec.nutrientsPerServing.fiberG}g
                    </p>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {rec.instructions}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteRecipe(rec.id)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 transition cursor-pointer shrink-0"
                    title="Remover receita"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          ABA 2: MEUS ALIMENTOS & SUPLEMENTOS PERSONALIZADOS
      ==================================================================== */}
      {subTab === 'alimentos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleAddCustomFood}
            className="lg:col-span-6 p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4"
          >
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Utensils className="w-4 h-4 text-cyan-400" />
              <span>Cadastrar Novo Alimento ou Suplemento</span>
            </h4>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nome do Alimento / Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    placeholder="Ex: Iogurte Grego Zero Proteico"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Base de Cálculo
                  </label>
                  <select
                    value={foodBaseUnit}
                    onChange={(e) => setFoodBaseUnit(e.target.value as '100g' | '100ml')}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white"
                  >
                    <option value="100g">Por 100 gramas (g)</option>
                    <option value="100ml">Por 100 mililitros (ml)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  value={foodCategory}
                  onChange={(e) => setFoodCategory(e.target.value)}
                  placeholder="Ex: Suplementos Esportivos, Laticínios..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              {/* Macronutrientes por 100g/100ml */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                    Calorias (kcal)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={foodKcal}
                    onChange={(e) => setFoodKcal(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-cyan-400 mb-1">
                    Proteína (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={foodProtein}
                    onChange={(e) => setFoodProtein(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-400 mb-1">
                    Carboidrato (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={foodCarb}
                    onChange={(e) => setFoodCarb(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-rose-400 mb-1">
                    Gorduras (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={foodFat}
                    onChange={(e) => setFoodFat(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-violet-400 mb-1">
                    Fibras (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={foodFiber}
                    onChange={(e) => setFoodFiber(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white tabular-nums"
                  />
                </div>
              </div>

              {/* Micronutrientes principais opcionais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">
                    Sódio (mg)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={foodSodium}
                    onChange={(e) => setFoodSodium(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">
                    Cálcio (mg)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={foodCalcium}
                    onChange={(e) => setFoodCalcium(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">
                    Ferro (mg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={foodIron}
                    onChange={(e) => setFoodIron(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">
                    Vitamina C (mg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={foodVitaminC}
                    onChange={(e) => setFoodVitaminC(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white tabular-nums"
                  />
                </div>
              </div>

              {/* Medida Caseira Padrão deste Alimento */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Medida Caseira Associada
                  </label>
                  <input
                    type="text"
                    value={customMeasureName}
                    onChange={(e) => setCustomMeasureName(e.target.value)}
                    placeholder="Ex: Pote, Scoop, Fatia"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Peso da Medida (g/ml)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={customMeasureGrams}
                    onChange={(e) => setCustomMeasureGrams(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white tabular-nums"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Alimento na Biblioteca</span>
              </button>
            </div>
          </form>

          <div className="lg:col-span-6 p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 max-h-[600px] overflow-y-auto">
            <h4 className="text-sm font-extrabold text-white border-b border-slate-800 pb-3">
              Alimentos Personalizados Cadastrados ({library.customFoods.length})
            </h4>

            <div className="space-y-2.5">
              {library.customFoods.map((food) => (
                <div
                  key={food.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-extrabold text-white">{food.name}</p>
                    <p className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                      {food.category} · Por {food.baseUnit}: {food.nutrientsPer100.energyKcal}{' '}
                      kcal · P: {food.nutrientsPer100.proteinG}g · C:{' '}
                      {food.nutrientsPer100.carbohydrateG}g · G: {food.nutrientsPer100.lipidG}g
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteCustomFood(food.id)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          ABA 3: REFEIÇÕES PRÉ-DEFINIDAS (TEMPLATES)
      ==================================================================== */}
      {subTab === 'refeicoes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleSaveTemplate}
            className="lg:col-span-6 p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4"
          >
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Criar Refeição Pré-definida (Template Reutilizável)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nome da Refeição Pré-definida *
                </label>
                <input
                  type="text"
                  required
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder="Ex: Pré-Treino Rápido (Banana + Aveia + Whey)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Horário Padrão
                </label>
                <input
                  type="time"
                  value={tplTime}
                  onChange={(e) => setTplTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white tabular-nums"
                />
              </div>
            </div>

            {/* Seletor de Itens para o Template */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
              <span className="text-xs font-bold text-amber-400 block">
                Adicionar Alimentos ao Template
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-5">
                  <select
                    value={currentIngFood?.id || ''}
                    onChange={(e) => {
                      setSelectedIngFoodId(e.target.value);
                      const f = allFoods.find((item) => item.id === e.target.value);
                      if (f) setSelectedIngMeasureId(f.measures[0]?.id || '');
                    }}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  >
                    {filteredIngFoods.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <select
                    value={currentIngMeasure?.id || ''}
                    onChange={(e) => setSelectedIngMeasureId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  >
                    {(currentIngFood?.measures || []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3 flex gap-1.5">
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    value={ingQuantity}
                    onChange={(e) => setIngQuantity(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={handleAddIngToTemplate}
                    className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {tplItems.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  {tplItems.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                    >
                      <span className="text-white font-semibold">
                        {it.name} · {it.quantity} {it.measureLabel} ({it.gramsEquivalent}g)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setTplItems((prev) => prev.filter((x) => x.id !== it.id))
                        }
                        className="text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Salvar Refeição Pré-definida</span>
            </button>
          </form>

          <div className="lg:col-span-6 p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 max-h-[600px] overflow-y-auto">
            <h4 className="text-sm font-extrabold text-white border-b border-slate-800 pb-3">
              Refeições Pré-definidas Prontas para Uso ({library.mealTemplates.length})
            </h4>

            <div className="space-y-2.5">
              {library.mealTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-extrabold text-white">
                        {tpl.defaultTime} — {tpl.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 tabular-nums">
                      {tpl.items.length} itens · {tpl.nutrientsTotal.energyKcal} kcal · P:{' '}
                      {tpl.nutrientsTotal.proteinG}g · C: {tpl.nutrientsTotal.carbohydrateG}g · G:{' '}
                      {tpl.nutrientsTotal.lipidG}g
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          ABA 4: PORÇÕES & MEDIDAS CASEIRAS PERSONALIZADAS + EXPLORADOR POF/IBGE
      ==================================================================== */}
      {subTab === 'porcoes' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <form
              onSubmit={handleAddPortion}
              className="lg:col-span-6 p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4"
            >
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Scale className="w-4 h-4 text-violet-400" />
                <span>Criar Nova Medida Caseira ou Porção Personalizada</span>
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Descrição Completa da Medida *
                  </label>
                  <input
                    type="text"
                    required
                    value={portionName}
                    onChange={(e) => setPortionName(e.target.value)}
                    placeholder="Ex: 1 Concha Média de Feijão / 1 Scoop Cheio"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Rótulo Curto da Unidade *
                    </label>
                    <input
                      type="text"
                      required
                      value={portionUnit}
                      onChange={(e) => setPortionUnit(e.target.value)}
                      placeholder="Ex: Scoop, Concha, Pegador"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Equivalência em Gramas (g) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      value={portionGrams}
                      onChange={(e) => setPortionGrams(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Categoria Aplicável
                  </label>
                  <input
                    type="text"
                    value={portionCategory}
                    onChange={(e) => setPortionCategory(e.target.value)}
                    placeholder="Ex: Todos, Suplementos, Cereais..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Medida Personalizada</span>
                </button>
              </div>
            </form>

            <div className="lg:col-span-6 p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 max-h-[600px] overflow-y-auto">
              <h4 className="text-sm font-extrabold text-white border-b border-slate-800 pb-3">
                Porções Personalizadas do Profissional ({library.customPortions.length})
              </h4>

              <div className="space-y-2.5">
                {library.customPortions.map((cp) => (
                  <div
                    key={cp.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-extrabold text-white">{cp.name}</p>
                      <p className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                        Unidade: {cp.unitName} · Peso equivalente: {cp.grams} g · Categoria:{' '}
                        {cp.applicableCategory || 'Todos'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePortion(cp.id)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Explorador de Correlação Oficial POF/IBGE ↔ Alimentos */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>
                    Explorador & Correlação do Banco Oficial de Medidas Caseiras (POF/IBGE)
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consulte as medidas caseiras correlacionadas por código POF, modo de preparo, medida de referência (★) e descrição oficial da fonte.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-400 tabular-nums">
                {allFoods.length} alimentos correlacionados (TACO + POF)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Buscar Alimento ou Código POF
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pofExplorerSearch}
                    onChange={(e) => setPofExplorerSearch(e.target.value)}
                    placeholder="Ex: arroz integral, 6300201, tapioca, patinho..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div className="md:col-span-5">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Alimento Selecionado ({pofCorrelatedFoods.length} resultados)
                </label>
                <select
                  value={activeExplorerFood?.id || ''}
                  onChange={(e) => {
                    setSelectedPofFoodId(e.target.value);
                    setPofPrepFilter('Todos');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white"
                >
                  {pofCorrelatedFoods.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.pofCode ? `[POF #${f.pofCode}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Filtrar por Preparo POF
                </label>
                <select
                  value={pofPrepFilter}
                  onChange={(e) => setPofPrepFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-cyan-300"
                >
                  {availablePrepsForActiveFood.map((prep) => (
                    <option key={prep} value={prep}>
                      {prep === 'Todos' ? 'Todos os preparos' : prep}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeExplorerFood && (
              <div className="space-y-3">
                <div className="px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-white">
                      {activeExplorerFood.name}
                    </span>
                    <span className="text-slate-400">· {activeExplorerFood.category}</span>
                    {activeExplorerFood.pofCode && (
                      <span className="text-emerald-400 font-bold">
                        · Correlacionado ao Código POF #{activeExplorerFood.pofCode} (
                        {activeExplorerFood.pofDescription})
                      </span>
                    )}
                  </div>
                  <span className="text-slate-300">
                    Por {activeExplorerFood.baseUnit}:{' '}
                    <strong className="text-white">
                      {activeExplorerFood.nutrientsPer100.energyKcal} kcal
                    </strong>{' '}
                    · C: {activeExplorerFood.nutrientsPer100.carbohydrateG}g · P:{' '}
                    {activeExplorerFood.nutrientsPer100.proteinG}g · G:{' '}
                    {activeExplorerFood.nutrientsPer100.lipidG}g
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
                  {filteredExplorerMeasures.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-2xl border flex items-start justify-between gap-2.5 tabular-nums ${
                        m.isReferenceMeasure
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {m.isReferenceMeasure && (
                            <span className="text-emerald-400 font-extrabold text-xs">
                              ★
                            </span>
                          )}
                          <span className="text-xs font-extrabold text-white">
                            {m.unitName}
                          </span>
                          <span className="text-xs font-black text-emerald-400">
                            {m.grams}g
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {m.preparation ? `${m.preparation} · ` : ''}
                          {m.sourceDescription || 'Medida oficial POF/IBGE'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleClonePofMeasureToCustom(activeExplorerFood, m)
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-violet-600/20 text-slate-300 hover:text-violet-300 border border-slate-800 hover:border-violet-500/40 text-[11px] font-bold shrink-0 cursor-pointer transition"
                        title="Carregar esta medida no formulário de porções personalizadas"
                      >
                        Clonar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
