'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Client,
  ClientDietPlan,
  DietDaySchedule,
  DietItemSubstitution,
  DietMealItem,
  NutrientProfile,
  NutritionProfessionalLibrary,
  NutritionRecipe,
} from '@/types';
import {
  calculateHydrationTarget,
  calculateMetabolicMetrics,
  EMPTY_NUTRIENT_PROFILE,
  sumNutrientProfiles,
  WEEK_DAYS_SHORT,
} from '@/lib/nutritionEngine';
import { storage } from '@/lib/storage';
import { cloudSync } from '@/lib/firebase';
import {
  Utensils,
  Droplet,
  Flame,
  Clock,
  ArrowLeftRight,
  ChefHat,
  CheckCircle2,
  Calendar,
  Sparkles,
  Plus,
  Minus,
  X,
  BookOpen,
} from 'lucide-react';

interface StudentDietViewProps {
  client: Client;
}

export const StudentDietView: React.FC<StudentDietViewProps> = ({ client }) => {
  const [dietPlan, setDietPlan] = useState<ClientDietPlan | null>(() =>
    storage.getClientDietPlan(client.id)
  );
  const [library] = useState<NutritionProfessionalLibrary>(() =>
    storage.getNutritionLibrary()
  );
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [expandedSubItemIds, setExpandedSubItemIds] = useState<Record<string, boolean>>({});
  const [selectedRecipeModal, setSelectedRecipeModal] = useState<NutritionRecipe | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Sync diet plan when client changes or cloud data updates
  useEffect(() => {
    const refreshPlan = () => {
      const plan = storage.getClientDietPlan(client.id);
      setDietPlan(plan);
      if (plan && plan.schedules.length > 0) {
        const todayDay = new Date().getDay();
        const matchingToday = plan.schedules.find((s) =>
          s.weekDays?.includes(todayDay)
        );
        setSelectedScheduleId(
          matchingToday?.id || plan.activeScheduleId || plan.schedules[0].id
        );
      }
    };
    refreshPlan();
    window.addEventListener('storage', refreshPlan);
    window.addEventListener('ironcoach:data-synced', refreshPlan);
    return () => {
      window.removeEventListener('storage', refreshPlan);
      window.removeEventListener('ironcoach:data-synced', refreshPlan);
    };
  }, [client.id]);

  const activeSchedule: DietDaySchedule | null = useMemo(() => {
    if (!dietPlan || !dietPlan.schedules.length) return null;
    return (
      dietPlan.schedules.find((s) => s.id === selectedScheduleId) ||
      dietPlan.schedules.find((s) => s.id === dietPlan.activeScheduleId) ||
      dietPlan.schedules[0]
    );
  }, [dietPlan, selectedScheduleId]);

  const metabolicMetrics = useMemo(() => {
    if (!dietPlan) return null;
    return calculateMetabolicMetrics(client, dietPlan.metabolicConfig);
  }, [client, dietPlan]);

  const hydrationMetrics = useMemo(() => {
    if (!dietPlan) return null;
    return calculateHydrationTarget(
      client.weight,
      dietPlan.metabolicConfig.activityLevel,
      dietPlan.hydrationConfig
    );
  }, [client.weight, dietPlan]);

  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentWaterMl =
    dietPlan?.hydrationConfig?.dailyWaterLog?.[todayDateStr] || 0;

  const dayTotals: NutrientProfile = useMemo(() => {
    if (!activeSchedule) return EMPTY_NUTRIENT_PROFILE;
    const allProfiles: NutrientProfile[] = [];
    for (const meal of activeSchedule.meals) {
      for (const item of meal.items) {
        allProfiles.push(item.nutrients);
      }
    }
    return sumNutrientProfiles(allProfiles);
  }, [activeSchedule]);

  const handleAddWaterMl = (deltaMl: number) => {
    if (!dietPlan) return;
    const nextVal = Math.max(0, currentWaterMl + deltaMl);
    const updatedConfig = {
      ...(dietPlan.hydrationConfig || {
        mlPerKg: 40,
        extraWorkoutMl: 500,
        dailyWaterLog: {},
      }),
      dailyWaterLog: {
        ...(dietPlan.hydrationConfig?.dailyWaterLog || {}),
        [todayDateStr]: nextVal,
      },
    };
    const updatedPlan: ClientDietPlan = {
      ...dietPlan,
      hydrationConfig: updatedConfig,
      updatedAt: new Date().toISOString(),
    };
    setDietPlan(updatedPlan);
    storage.saveClientDietPlan(updatedPlan);
    cloudSync.syncDietPlan(updatedPlan);
    setToastMsg(
      deltaMl > 0
        ? `+${deltaMl}ml registrados na sua meta de hoje!`
        : `${deltaMl}ml ajustados.`
    );
    setTimeout(() => setToastMsg(null), 2200);
  };

  const handleSwapWithApprovedSubstitution = (
    mealId: string,
    item: DietMealItem,
    sub: DietItemSubstitution
  ) => {
    if (!dietPlan || !activeSchedule) return;

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

    const updatedSchedules = dietPlan.schedules.map((s) =>
      s.id === activeSchedule.id
        ? {
            ...s,
            meals: s.meals.map((m) =>
              m.id === mealId
                ? {
                    ...m,
                    items: m.items.map((it) =>
                      it.id === item.id ? promotedItem : it
                    ),
                  }
                : m
            ),
          }
        : s
    );

    const updatedPlan: ClientDietPlan = {
      ...dietPlan,
      schedules: updatedSchedules,
      updatedAt: new Date().toISOString(),
    };

    setDietPlan(updatedPlan);
    storage.saveClientDietPlan(updatedPlan);
    cloudSync.syncDietPlan(updatedPlan);
    setToastMsg(`Substituição aplicada: ${sub.targetName}`);
    setTimeout(() => setToastMsg(null), 2400);
  };

  // Empty state if trainer hasn't created a diet plan yet
  if (!dietPlan || !activeSchedule || activeSchedule.meals.length === 0) {
    return (
      <div className="space-y-4 pb-28">
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Minha Dieta Prescrita
              </h2>
              <p className="text-xs text-slate-400">
                Plano alimentar e metas de hidratação de {client.name}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            <Utensils className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-white">
            Seu Plano Alimentar Ainda Não Foi Publicado
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Assim que seu treinador finalizar a montagem do seu cardápio e metas de macronutrientes, todas as suas refeições, horários e opções de substituição aparecerão aqui.
          </p>
        </div>
      </div>
    );
  }

  const waterTargetMl = hydrationMetrics?.totalDailyMl || 2800;
  const waterProgressPct = Math.min(
    100,
    Math.round((currentWaterMl / Math.max(1, waterTargetMl)) * 100)
  );

  const goalLabel =
    dietPlan.metabolicConfig.goalType === 'deficit'
      ? 'Redução de Gordura / Definição'
      : dietPlan.metabolicConfig.goalType === 'superavit'
      ? 'Ganho de Massa Muscular (Hipertrofia)'
      : 'Manutenção & Recomposição Corporal';

  return (
    <div className="space-y-4 pb-28">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900/95 border border-cyan-500/50 text-cyan-300 text-xs font-bold shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Student Nutrition Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                {dietPlan.name || 'Meu Plano Alimentar'}
              </h2>
              <p className="text-xs text-slate-400">
                Objetivo: <strong className="text-cyan-400">{goalLabel}</strong> · Peso Base:{' '}
                <strong className="text-slate-200">{client.weight} kg</strong>
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-400">
            <span>Atualizado em </span>
            <strong className="text-slate-200">
              {new Date(dietPlan.updatedAt).toLocaleDateString('pt-BR')}
            </strong>
          </div>
        </div>

        {/* Daily Calories & Macros Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Calorias do Cardápio
            </span>
            <div className="mt-1 flex items-baseline gap-1 font-mono tabular-nums">
              <span className="text-base sm:text-lg font-black text-white">
                {Math.round(dayTotals.energyKcal)}
              </span>
              <span className="text-[11px] text-slate-400">
                / {Math.round(metabolicMetrics?.targetCalories || dayTotals.energyKcal)} kcal
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/80">
            <span className="text-[10px] font-bold text-emerald-400 block">
              Proteínas
            </span>
            <div className="mt-1 flex items-baseline gap-1 font-mono tabular-nums">
              <span className="text-base sm:text-lg font-black text-emerald-300">
                {Math.round(dayTotals.proteinG)}g
              </span>
              {metabolicMetrics && (
                <span className="text-[11px] text-slate-500">
                  (meta {Math.round(metabolicMetrics.proteinG)}g)
                </span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/80">
            <span className="text-[10px] font-bold text-cyan-400 block">
              Carboidratos
            </span>
            <div className="mt-1 flex items-baseline gap-1 font-mono tabular-nums">
              <span className="text-base sm:text-lg font-black text-cyan-300">
                {Math.round(dayTotals.carbohydrateG)}g
              </span>
              {metabolicMetrics && (
                <span className="text-[11px] text-slate-500">
                  (meta {Math.round(metabolicMetrics.carbsG)}g)
                </span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/80">
            <span className="text-[10px] font-bold text-amber-400 block">
              Gorduras
            </span>
            <div className="mt-1 flex items-baseline gap-1 font-mono tabular-nums">
              <span className="text-base sm:text-lg font-black text-amber-300">
                {Math.round(dayTotals.lipidG)}g
              </span>
              {metabolicMetrics && (
                <span className="text-[11px] text-slate-500">
                  (meta {Math.round(metabolicMetrics.fatG)}g)
                </span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/80 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-purple-400 block">
              Fibras Alimentares
            </span>
            <div className="mt-1 flex items-baseline gap-1 font-mono tabular-nums">
              <span className="text-base sm:text-lg font-black text-purple-300">
                {Math.round(dayTotals.fiberG)}g
              </span>
              <span className="text-[11px] text-slate-500">
                (meta {dietPlan.metabolicConfig.fiberTargetG || 30}g)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Daily Hydration Tracker */}
      <div className="p-4 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
              <Droplet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                Minha Meta de Hidratação Hoje
              </h3>
              <p className="text-[11px] text-slate-400">
                Registre os copos ou garrafas de água consumidos ao longo do dia
              </p>
            </div>
          </div>

          <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
            <span className="text-lg font-black text-cyan-400">
              {(currentWaterMl / 1000).toFixed(2)} L
            </span>
            <span className="text-xs text-slate-400">
              / {(waterTargetMl / 1000).toFixed(2)} L ({waterProgressPct}%)
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${waterProgressPct}%` }}
          />
        </div>

        {/* Water Quick Add Buttons */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          <span className="text-[11px] text-slate-400">
            Incluindo +{dietPlan.hydrationConfig?.extraWorkoutMl || 500}ml para dias de treino
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleAddWaterMl(-200)}
              disabled={currentWaterMl <= 0}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>200ml</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddWaterMl(200)}
              className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>200ml</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddWaterMl(300)}
              className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>300ml</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddWaterMl(500)}
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>500ml</span>
            </button>
          </div>
        </div>
      </div>

      {/* Day Schedule Selector (when trainer prescribed multiple schedules) */}
      {dietPlan.schedules.length > 1 && (
        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-2 overflow-x-auto">
          <Calendar className="w-4 h-4 text-cyan-400 shrink-0 ml-1" />
          <span className="text-xs font-bold text-slate-400 shrink-0">
            Rotina do Dia:
          </span>
          <div className="flex items-center gap-1.5">
            {dietPlan.schedules.map((sched) => {
              const isSelected = sched.id === activeSchedule.id;
              const daysStr = (sched.weekDays || [])
                .map((d) => WEEK_DAYS_SHORT[d])
                .join(', ');
              return (
                <button
                  key={sched.id}
                  type="button"
                  onClick={() => setSelectedScheduleId(sched.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{sched.name}</span>
                  {daysStr && (
                    <span className="ml-1.5 text-[10px] opacity-80">
                      ({daysStr})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chronological Meals List */}
      <div className="space-y-3.5">
        {activeSchedule.meals.map((meal, mealIdx) => {
          const mealNutrients = sumNutrientProfiles(
            meal.items.map((it) => it.nutrients)
          );

          return (
            <div
              key={meal.id || mealIdx}
              className="rounded-2xl bg-slate-900/95 border border-slate-800 shadow-lg overflow-hidden"
            >
              {/* Meal Header */}
              <div className="p-4 bg-slate-950/70 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-black flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{meal.time || '08:00'}</span>
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">
                      {meal.name}
                    </h3>
                    {meal.notes && (
                      <p className="text-[11px] text-amber-300/90 mt-0.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{meal.notes}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Meal Macro Summary */}
                <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-slate-300">
                  <span className="font-bold text-white">
                    {Math.round(mealNutrients.energyKcal)} kcal
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-emerald-400">
                    P: {Math.round(mealNutrients.proteinG)}g
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-cyan-400">
                    C: {Math.round(mealNutrients.carbohydrateG)}g
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-amber-400">
                    G: {Math.round(mealNutrients.lipidG)}g
                  </span>
                </div>
              </div>

              {/* Meal Items */}
              <div className="p-4 space-y-2.5">
                {meal.items.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Nenhum alimento listado nesta refeição.
                  </p>
                ) : (
                  meal.items.map((item) => {
                    const hasSubs =
                      item.substitutions && item.substitutions.length > 0;
                    const isSubExpanded = Boolean(expandedSubItemIds[item.id]);
                    const matchedRecipe =
                      item.sourceType === 'recipe'
                        ? library.recipes.find((r) => r.id === item.sourceId)
                        : null;

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-bold text-white">
                                {item.name}
                              </span>
                              {item.sourceType === 'recipe' && (
                                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                                  <ChefHat className="w-3 h-3" />
                                  Receita
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-300 flex-wrap font-mono tabular-nums">
                              <strong className="text-cyan-300">
                                {item.quantity} × {item.measureLabel}
                              </strong>
                              <span className="text-slate-500">·</span>
                              <span className="text-slate-400">
                                ({Math.round(item.gramsEquivalent)}g)
                              </span>
                              <span className="text-slate-500">·</span>
                              <span className="text-slate-400 text-[11px]">
                                {Math.round(item.nutrients.energyKcal)} kcal
                              </span>
                            </div>
                          </div>

                          {/* Item Actions: View Recipe or View Approved Substitutions */}
                          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                            {matchedRecipe && (
                              <button
                                type="button"
                                onClick={() => setSelectedRecipeModal(matchedRecipe)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Modo de Preparo</span>
                              </button>
                            )}

                            {hasSubs && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedSubItemIds((prev) => ({
                                    ...prev,
                                    [item.id]: !prev[item.id],
                                  }))
                                }
                                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                                  isSubExpanded
                                    ? 'bg-cyan-600 text-white border-cyan-500'
                                    : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-slate-700'
                                }`}
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                <span>
                                  Substituições ({item.substitutions.length})
                                </span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expandable Approved Substitutions List */}
                        {hasSubs && isSubExpanded && (
                          <div className="pt-2 mt-2 border-t border-slate-800/80 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 block">
                              Opções equivalentes autorizadas pelo seu treinador (toque para substituir no cardápio):
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {item.substitutions.map((sub) => (
                                <div
                                  key={sub.id}
                                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-slate-200 block truncate">
                                      {sub.targetName}
                                    </span>
                                    <span className="text-[11px] text-cyan-400 font-mono tabular-nums">
                                      {sub.quantity} × {sub.measureLabel} (
                                      {Math.round(sub.gramsEquivalent)}g ·{' '}
                                      {Math.round(sub.nutrients.energyKcal)} kcal)
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSwapWithApprovedSubstitution(
                                        meal.id,
                                        item,
                                        sub
                                      )
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 text-[11px] font-bold shrink-0 transition cursor-pointer"
                                  >
                                    Usar Opção
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Whole-Meal Substitutions if configured by Trainer */}
                {meal.mealSubstitutions && meal.mealSubstitutions.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 mt-2">
                    <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                      <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                      <span>Opções de Substituição da Refeição Completa:</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {meal.mealSubstitutions.map((mSub) => (
                        <div
                          key={mSub.id}
                          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                        >
                          <span className="font-bold text-white block">
                            {mSub.targetName}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                            {mSub.quantity} × {mSub.measureLabel} (
                            {Math.round(mSub.gramsEquivalent)}g ·{' '}
                            {Math.round(mSub.nutrients.energyKcal)} kcal)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recipe Instructions Modal */}
      {selectedRecipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {selectedRecipeModal.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tempo de preparo: {selectedRecipeModal.prepTimeMinutes} min · Porção:{' '}
                    {selectedRecipeModal.servingWeightG}g
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecipeModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-cyan-400">Ingredientes:</h4>
              <ul className="space-y-1 text-xs text-slate-200">
                {selectedRecipeModal.ingredients.map((ing) => (
                  <li
                    key={ing.id}
                    className="flex items-center justify-between py-1 border-b border-slate-800/60"
                  >
                    <span>{ing.foodName}</span>
                    <span className="font-mono text-slate-400">
                      {ing.quantity} × {ing.measureLabel} ({Math.round(ing.gramsEquivalent)}g)
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {selectedRecipeModal.instructions && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-emerald-400">
                  Modo de Preparo:
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  {selectedRecipeModal.instructions}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
