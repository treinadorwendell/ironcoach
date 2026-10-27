'use client';

import React, { useState, useMemo } from 'react';
import {
  DietItemSubstitution,
  HouseholdMeasureOption,
  NutrientProfile,
  NutritionFoodItem,
  NutritionRecipe,
  RECIPE_CATEGORIES,
  RecipeCategory,
  SubstitutionEquivalenceMode,
} from '@/types';
import { calculateSubstitutionComparison } from '@/lib/nutritionEngine';
import {
  ArrowLeftRight,
  Check,
  ChefHat,
  Flame,
  Plus,
  Scale,
  Search,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react';

interface DynamicSubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextType: 'item' | 'meal';
  originalTitle: string;
  originalSubtitle: string;
  originalNutrients: NutrientProfile;
  foods: NutritionFoodItem[];
  recipes: NutritionRecipe[];
  onReplaceDirectly: (substitution: DietItemSubstitution) => void;
  onAddSubstitutionOption: (substitution: DietItemSubstitution) => void;
}

const EQUIVALENCE_OPTIONS: {
  id: SubstitutionEquivalenceMode;
  label: string;
  shortDesc: string;
  isAuto: boolean;
}[] = [
  {
    id: 'auto_kcal',
    label: 'Auto: Equivaler Calorias (kcal)',
    shortDesc: 'Ajusta a porção automaticamente para empatar as kcal',
    isAuto: true,
  },
  {
    id: 'auto_carb',
    label: 'Auto: Equivaler Carboidratos',
    shortDesc: 'Ajusta a porção para empatar os gramas de carboidrato',
    isAuto: true,
  },
  {
    id: 'auto_protein',
    label: 'Auto: Equivaler Proteínas',
    shortDesc: 'Ajusta a porção para empatar os gramas de proteína',
    isAuto: true,
  },
  {
    id: 'auto_fat',
    label: 'Auto: Equivaler Gorduras',
    shortDesc: 'Ajusta a porção para empatar os gramas de lipídios',
    isAuto: true,
  },
  {
    id: 'fixed_portion',
    label: 'Porção Fixa Original / Manual',
    shortDesc: 'Mantém a porção padrão cadastrada na receita ou alimento',
    isAuto: false,
  },
];

export const DynamicSubstitutionModal: React.FC<DynamicSubstitutionModalProps> = ({
  isOpen,
  onClose,
  contextType,
  originalTitle,
  originalSubtitle,
  originalNutrients,
  foods,
  recipes,
  onReplaceDirectly,
  onAddSubstitutionOption,
}) => {
  const [sourceTab, setSourceTab] = useState<'recipe' | 'food'>(
    contextType === 'meal' ? 'recipe' : 'food'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipeCategory, setSelectedRecipeCategory] = useState<string>('Todas');
  const [selectedFoodCategory, setSelectedFoodCategory] = useState<string>('Todas');

  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(
    recipes[0]?.id || ''
  );
  const [selectedFoodId, setSelectedFoodId] = useState<string>(
    foods[0]?.id || ''
  );
  const [selectedMeasureId, setSelectedMeasureId] = useState<string>('');

  const [equivalenceMode, setEquivalenceMode] =
    useState<SubstitutionEquivalenceMode>('auto_kcal');
  const [manualQuantity, setManualQuantity] = useState<string>('1');

  const foodCategories = useMemo(() => {
    const set = new Set<string>();
    foods.forEach((f) => {
      if (f.category) set.add(f.category);
    });
    return ['Todas', ...Array.from(set).sort()];
  }, [foods]);

  const filteredRecipes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recipes.filter((r) => {
      const matchCat =
        selectedRecipeCategory === 'Todas' || r.category === selectedRecipeCategory;
      const matchText =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q);
      return matchCat && matchText;
    });
  }, [recipes, searchQuery, selectedRecipeCategory]);

  const filteredFoods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return foods
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
      .slice(0, 100);
  }, [foods, searchQuery, selectedFoodCategory]);

  const activeRecipe = useMemo(
    () =>
      recipes.find((r) => r.id === selectedRecipeId) ||
      filteredRecipes[0] ||
      recipes[0],
    [recipes, selectedRecipeId, filteredRecipes]
  );

  const activeFood = useMemo(
    () =>
      foods.find((f) => f.id === selectedFoodId) ||
      filteredFoods[0] ||
      foods[0],
    [foods, selectedFoodId, filteredFoods]
  );

  const activeMeasure: HouseholdMeasureOption | undefined = useMemo(() => {
    if (!activeFood) return undefined;
    return (
      activeFood.measures.find((m) => m.id === selectedMeasureId) ||
      activeFood.measures.find(
        (m) => m.isReferenceMeasure && m.isPreparationMatch
      ) ||
      activeFood.measures.find((m) => m.isReferenceMeasure) ||
      activeFood.measures.find((m) => m.source === 'pof' || m.source === 'custom') ||
      activeFood.measures[0]
    );
  }, [activeFood, selectedMeasureId]);

  const comparison = useMemo(() => {
    const parsedManual = parseFloat(manualQuantity.replace(',', '.'));
    return calculateSubstitutionComparison({
      originalNutrients,
      targetType: sourceTab,
      foodItem: activeFood,
      selectedMeasure: activeMeasure,
      recipe: activeRecipe,
      mode: equivalenceMode,
      manualQuantity:
        equivalenceMode === 'fixed_portion' && Number.isFinite(parsedManual) && parsedManual > 0
          ? parsedManual
          : undefined,
    });
  }, [
    originalNutrients,
    sourceTab,
    activeFood,
    activeMeasure,
    activeRecipe,
    equivalenceMode,
    manualQuantity,
  ]);

  if (!isOpen) return null;

  const buildSubstitutionPayload = (): DietItemSubstitution | null => {
    if (sourceTab === 'recipe') {
      if (!activeRecipe) return null;
      return {
        id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        targetType: 'recipe',
        targetId: activeRecipe.id,
        targetName: activeRecipe.name,
        category: activeRecipe.category,
        measureId: 'porcao-receita',
        measureLabel: `${comparison.suggestedQuantity} porção(ões) (${comparison.suggestedGrams}g)`,
        quantity: comparison.suggestedQuantity,
        gramsEquivalent: comparison.suggestedGrams,
        equivalenceMode,
        nutrients: comparison.substituteNutrients,
      };
    }

    if (!activeFood) return null;
    const measure = activeMeasure || activeFood.measures[0];
    return {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      targetType: 'food',
      targetId: activeFood.id,
      targetName: activeFood.name,
      category: activeFood.category,
      measureId: measure?.id || 'univ-g',
      measureLabel: measure?.unitName || 'g',
      quantity: comparison.suggestedQuantity,
      gramsEquivalent: comparison.suggestedGrams,
      equivalenceMode,
      nutrients: comparison.substituteNutrients,
    };
  };

  const formatDiff = (val: number, unit: string) => {
    if (Math.abs(val) < 0.2) return `0 ${unit} (Equivalente)`;
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(1)} ${unit}`;
  };

  const getDiffColor = (val: number) => {
    if (Math.abs(val) <= 3) return 'text-emerald-400';
    if (Math.abs(val) <= 10) return 'text-amber-300';
    return 'text-rose-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-white truncate">
                {contextType === 'meal'
                  ? 'Substituir Refeição Inteira por Receita / Alimento'
                  : 'Substituição Dinâmica de Item da Dieta'}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Original: <strong className="text-slate-200">{originalTitle}</strong> ·{' '}
                {originalSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Passo 1: Escolher Fonte (Receitas do Sistema/Profissional vs Alimentos TACO) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSourceTab('recipe')}
              className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                sourceTab === 'recipe'
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/60 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <ChefHat className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Receitas do Sistema ({recipes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceTab('food')}
              className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                sourceTab === 'food'
                  ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/60 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Utensils className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Alimentos TACO & Custom ({foods.length})</span>
            </button>
          </div>

          {/* Passo 2: Modo de Equivalência (Automática vs Porção Fixa) */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Modo de Cálculo na Hora da Troca
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Escolha entre equivalência automática de nutrientes ou porção fixa
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {EQUIVALENCE_OPTIONS.map((opt) => {
                const active = equivalenceMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setEquivalenceMode(opt.id);
                      if (opt.id === 'fixed_portion') {
                        setManualQuantity(
                          sourceTab === 'food' &&
                            (activeMeasure?.unitName === 'g' || activeMeasure?.unitName === 'ml')
                            ? '100'
                            : '1'
                        );
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      active
                        ? 'bg-emerald-600/20 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold leading-snug">{opt.label}</span>
                      {active && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 leading-tight">
                      {opt.shortDesc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Passo 3: Busca e Seleção da Receita ou Alimento + Medida */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      sourceTab === 'recipe'
                        ? 'Buscar receita por nome ou categoria...'
                        : 'Buscar alimento na base TACO ou customizados...'
                    }
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {sourceTab === 'recipe' ? (
                  <select
                    value={selectedRecipeCategory}
                    onChange={(e) => setSelectedRecipeCategory(e.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Todas">Todas Categorias</option>
                    {RECIPE_CATEGORIES.map((c: RecipeCategory) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedFoodCategory}
                    onChange={(e) => setSelectedFoodCategory(e.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 max-w-[180px]"
                  >
                    {foodCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Lista de Resultados */}
              <div className="max-h-60 overflow-y-auto rounded-2xl bg-slate-950 border border-slate-800 divide-y divide-slate-800/80">
                {sourceTab === 'recipe' ? (
                  filteredRecipes.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Nenhuma receita encontrada com este filtro.
                    </div>
                  ) : (
                    filteredRecipes.map((rec) => {
                      const isSelected = activeRecipe?.id === rec.id;
                      return (
                        <button
                          key={rec.id}
                          type="button"
                          onClick={() => setSelectedRecipeId(rec.id)}
                          className={`w-full p-3 text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600/15 text-white'
                              : 'hover:bg-slate-900 text-slate-300'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{rec.name}</p>
                            <p className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                              {rec.category} · 1 porção ({rec.servingWeightG}g) ·{' '}
                              {rec.nutrientsPerServing.energyKcal} kcal · P:{' '}
                              {rec.nutrientsPerServing.proteinG}g · C:{' '}
                              {rec.nutrientsPerServing.carbohydrateG}g · G:{' '}
                              {rec.nutrientsPerServing.lipidG}g
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )
                ) : filteredFoods.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Nenhum alimento encontrado.
                  </div>
                ) : (
                  filteredFoods.map((food) => {
                    const isSelected = activeFood?.id === food.id;
                    return (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => {
                          setSelectedFoodId(food.id);
                          const pref =
                            food.measures.find(
                              (m) => m.isReferenceMeasure && m.isPreparationMatch
                            ) ||
                            food.measures.find((m) => m.isReferenceMeasure) ||
                            food.measures.find(
                              (m) => m.source === 'pof' || m.source === 'custom'
                            ) ||
                            food.measures[0];
                          setSelectedMeasureId(pref?.id || '');
                        }}
                        className={`w-full p-3 text-left transition flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-600/15 text-white'
                            : 'hover:bg-slate-900 text-slate-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{food.name}</p>
                          <p className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                            {food.category}
                            {food.pofCode ? ` · POF #${food.pofCode}` : ''} · Por {food.baseUnit}:{' '}
                            {food.nutrientsPer100.energyKcal} kcal · P:{' '}
                            {food.nutrientsPer100.proteinG}g · C:{' '}
                            {food.nutrientsPer100.carbohydrateG}g · G:{' '}
                            {food.nutrientsPer100.lipidG}g
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Seletor de Unidade / Medida Caseira e Quantidade (quando Porção Fixa ou Alimento) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sourceTab === 'food' && activeFood ? (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">
                      Unidade / Medida Caseira ({activeFood.measures.length} opções)
                    </label>
                    <select
                      value={activeMeasure?.id || ''}
                      onChange={(e) => setSelectedMeasureId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
                    >
                      {activeFood.measures.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    {activeMeasure && (
                      <p className="text-[11px] text-slate-400 tabular-nums">
                        {activeMeasure.isReferenceMeasure && (
                          <span className="text-emerald-400 font-bold mr-1">
                            ★ Referência POF
                          </span>
                        )}
                        {activeMeasure.preparation ? `${activeMeasure.preparation} · ` : ''}
                        {activeMeasure.sourceDescription || `${activeMeasure.grams}g por unidade`}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Unidade da Receita
                    </label>
                    <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 tabular-nums">
                      Porção Padrão ({activeRecipe?.servingWeightG || 180}g)
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    {equivalenceMode === 'fixed_portion'
                      ? 'Quantidade da Porção Fixa'
                      : 'Quantidade Calculada Automaticamente'}
                  </label>
                  {equivalenceMode === 'fixed_portion' ? (
                    <input
                      type="number"
                      step="0.25"
                      min="0.1"
                      value={manualQuantity}
                      onChange={(e) => setManualQuantity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-emerald-500/60 text-xs font-extrabold text-emerald-300 tabular-nums focus:outline-none"
                    />
                  ) : (
                    <div className="px-3 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs font-extrabold text-emerald-300 tabular-nums flex items-center justify-between">
                      <span>
                        {comparison.suggestedQuantity} × {comparison.measureLabel}
                      </span>
                      <span className="text-[11px] text-slate-300">
                        ({comparison.suggestedGrams}g)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna Direita: Comparação Instantânea de Macronutrientes e Fibras */}
            <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Comparação Instantânea</span>
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400 tabular-nums">
                    {comparison.suggestedGrams}g totais
                  </span>
                </div>

                <div className="pt-1">
                  <p className="text-xs font-bold text-white truncate">
                    Substituto:{' '}
                    <span className="text-emerald-300">
                      {sourceTab === 'recipe' ? activeRecipe?.name : activeFood?.name}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                    Porção sugerida: {comparison.suggestedQuantity} {comparison.measureLabel} (
                    {comparison.suggestedGrams} g)
                  </p>
                </div>
              </div>

              {/* Tabela Comparativa: Original vs Substituto vs Diferença */}
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
                      <th className="py-2 px-2.5">Nutriente</th>
                      <th className="py-2 px-2 text-right">Original</th>
                      <th className="py-2 px-2 text-right">Novo</th>
                      <th className="py-2 px-2.5 text-right">Diferença</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs tabular-nums">
                    <tr>
                      <td className="py-2.5 px-2.5 font-bold text-white flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Calorias</span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-300">
                        {originalNutrients.energyKcal} kcal
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-white">
                        {comparison.substituteNutrients.energyKcal} kcal
                      </td>
                      <td
                        className={`py-2.5 px-2.5 text-right font-bold ${getDiffColor(
                          comparison.diffs.energyKcal / 4
                        )}`}
                      >
                        {formatDiff(comparison.diffs.energyKcal, 'kcal')}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-2.5 px-2.5 font-semibold text-amber-300">
                        Carboidratos
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-300">
                        {originalNutrients.carbohydrateG} g
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-amber-300">
                        {comparison.substituteNutrients.carbohydrateG} g
                      </td>
                      <td
                        className={`py-2.5 px-2.5 text-right font-bold ${getDiffColor(
                          comparison.diffs.carbohydrateG
                        )}`}
                      >
                        {formatDiff(comparison.diffs.carbohydrateG, 'g')}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-2.5 px-2.5 font-semibold text-cyan-300">
                        Proteínas
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-300">
                        {originalNutrients.proteinG} g
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-cyan-300">
                        {comparison.substituteNutrients.proteinG} g
                      </td>
                      <td
                        className={`py-2.5 px-2.5 text-right font-bold ${getDiffColor(
                          comparison.diffs.proteinG
                        )}`}
                      >
                        {formatDiff(comparison.diffs.proteinG, 'g')}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-2.5 px-2.5 font-semibold text-rose-300">
                        Gorduras
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-300">
                        {originalNutrients.lipidG} g
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-rose-300">
                        {comparison.substituteNutrients.lipidG} g
                      </td>
                      <td
                        className={`py-2.5 px-2.5 text-right font-bold ${getDiffColor(
                          comparison.diffs.lipidG
                        )}`}
                      >
                        {formatDiff(comparison.diffs.lipidG, 'g')}
                      </td>
                    </tr>

                    <tr>
                      <td className="py-2.5 px-2.5 font-semibold text-violet-300">
                        Fibras
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-300">
                        {originalNutrients.fiberG} g
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-violet-300">
                        {comparison.substituteNutrients.fiberG} g
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-bold text-violet-300">
                        {formatDiff(comparison.diffs.fiberG, 'g')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const payload = buildSubstitutionPayload();
                    if (payload) {
                      onReplaceDirectly(payload);
                      onClose();
                    }
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-98 transition cursor-pointer"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>
                    {contextType === 'meal'
                      ? 'Substituir Refeição Inteira Agora'
                      : 'Substituir Item Titular Agora'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const payload = buildSubstitutionPayload();
                    if (payload) {
                      onAddSubstitutionOption(payload);
                      onClose();
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Anexar como Opção de Substituição no Cardápio</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
