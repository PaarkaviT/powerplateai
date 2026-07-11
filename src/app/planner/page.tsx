'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '@/components/Icons';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/Toast';

export default function Planner() {
  const [plans, setPlans] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Weekly calorie target limit from profile
  const [calorieTarget, setCalorieTarget] = useState(2000);
  const [isPremium, setIsPremium] = useState(false);

  // Modal Controls
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // New Plan Input Form
  const [newPlanName, setNewPlanName] = useState('My Weekly Plan');
  const [newPlanStart, setNewPlanStart] = useState('');
  const [newPlanEnd, setNewPlanEnd] = useState('');
  const [creating, setCreating] = useState(false);

  // Add Item Context
  const [activeSlot, setActiveSlot] = useState<{ day: string; slot: string } | null>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const mealSlots = ['breakfast', 'lunch', 'dinner', 'snack'];

  // Load plans & target
  const loadPlannerData = useCallback(async () => {
    try {
      // 1. Fetch profile target
      const profile = await apiFetch('/api/profile').catch(() => null);
      if (profile) {
        setIsPremium(!!profile.is_premium);
        if (profile.daily_calorie_target) {
          setCalorieTarget(profile.daily_calorie_target);
        }
      }

      // 2. Fetch plans
      const allPlans = await apiFetch('/api/meal-plans');
      setPlans(allPlans);
      if (allPlans.length > 0) {
        // Default to the first plan
        setActivePlan(allPlans[0]);
      }
    } catch (err: any) {
      toast(err.message || 'Error loading planner', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlannerData();
  }, [loadPlannerData]);

  // Load recipes for the search modal
  useEffect(() => {
    if (!isAddOpen) return;
    setLoadingRecipes(true);
    let url = '/api/recipes?limit=30';
    if (searchQuery.trim()) {
      url += `&search=${encodeURIComponent(searchQuery.trim())}`;
    }
    apiFetch(url)
      .then((data) => setRecipes(data))
      .catch((err) => console.error(err))
      .finally(() => setLoadingRecipes(false));
  }, [isAddOpen, searchQuery]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanStart || !newPlanEnd) {
      toast('Please enter start and end dates', 'error');
      return;
    }

    setCreating(true);
    try {
      const data = await apiFetch('/api/meal-plans', {
        method: 'POST',
        body: JSON.stringify({
          name: newPlanName,
          start_date: newPlanStart,
          end_date: newPlanEnd,
        }),
      });

      toast('New meal plan created!', 'success');
      setPlans((prev) => [data, ...prev]);
      setActivePlan(data);
      setIsNewPlanOpen(false);
    } catch (err: any) {
      toast(err.message || 'Error creating plan', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleAddRecipeToSlot = async (recipeId: string) => {
    if (!activePlan || !activeSlot) return;

    try {
      const item = await apiFetch(`/api/meal-plans/${activePlan.id}/items`, {
        method: 'POST',
        body: JSON.stringify({
          recipe_id: recipeId,
          day_of_week: activeSlot.day,
          meal_slot: activeSlot.slot,
        }),
      });

      // Update locally immediately without reloading all data
      toast('Recipe added to planner!', 'success');
      const updatedItems = [...(activePlan.meal_plan_items || []), item];
      
      // We must fetch full recipe details to display the card
      const fetchedRecipe = await apiFetch(`/api/recipes/${recipeId}`);
      item.recipes = fetchedRecipe;

      setActivePlan({
        ...activePlan,
        meal_plan_items: updatedItems,
      });
      setIsAddOpen(false);
      loadPlannerData(); // Sync with DB state
    } catch (err: any) {
      toast(err.message || 'Error adding recipe', 'error');
    }
  };

  const handleRemoveRecipe = async (itemId: string) => {
    if (!activePlan) return;

    try {
      await apiFetch(`/api/meal-plans/${activePlan.id}/items/${itemId}`, {
        method: 'DELETE',
      });

      toast('Removed from plan', 'success');
      setActivePlan({
        ...activePlan,
        meal_plan_items: activePlan.meal_plan_items.filter((item: any) => item.id !== itemId),
      });
      loadPlannerData(); // Sync with DB state
    } catch (err: any) {
      toast(err.message || 'Error removing item', 'error');
    }
  };

  const handleDragStart = (e: React.DragEvent, item: any, fromDay: string, fromSlot: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      itemId: item.id,
      recipeId: item.recipes?.id,
      fromDay,
      fromSlot
    }));
  };

  const handleDrop = async (e: React.DragEvent, toDay: string, toSlot: string) => {
    e.preventDefault();
    if (!activePlan) return;
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const { itemId, recipeId, fromDay, fromSlot } = JSON.parse(dataStr);

      if (fromDay === toDay && fromSlot === toSlot) return;

      // 1. Delete from old slot
      await apiFetch(`/api/meal-plans/${activePlan.id}/items/${itemId}`, { method: 'DELETE' });

      // 2. Add to new slot
      const newItem = await apiFetch(`/api/meal-plans/${activePlan.id}/items`, {
        method: 'POST',
        body: JSON.stringify({
          recipe_id: recipeId,
          day_of_week: toDay,
          meal_slot: toSlot,
        }),
      });

      toast('Meal plan updated!', 'success');
      loadPlannerData();
    } catch (err: any) {
      toast(err.message || 'Failed to move meal', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-zinc-500">Loading your meal calendar...</p>
      </div>
    );
  }


  // Get active items mapped by Mon-Sun and meal slots
  const planItems = activePlan?.meal_plan_items || [];
  
  // Calculate weekly totals
  let totalCalories = 0;
  planItems.forEach((item: any) => {
    const nutrition = item.recipes?.nutrition as any;
    if (nutrition?.calories) {
      totalCalories += Number(nutrition.calories);
    }
  });

  const avgCaloriesPerDay = Math.round(totalCalories / 7);

  // Color code calorie summary bar based on 10% daily target limit
  const isWithinLimit = Math.abs(avgCaloriesPerDay - calorieTarget) / calorieTarget <= 0.10;
  const isOverLimit = avgCaloriesPerDay > calorieTarget * 1.10;
  
  let summaryColorClass = 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-300';
  if (totalCalories > 0) {
    if (isWithinLimit) summaryColorClass = 'bg-emerald-50 text-emerald-800 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-300';
    else if (isOverLimit) summaryColorClass = 'bg-rose-50 text-rose-800 border-rose-250 dark:bg-rose-950/20 dark:text-rose-300';
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Header and buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
            {activePlan ? activePlan.name : 'My Meal Plan'}
          </h2>
          {activePlan && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Active: {activePlan.start_date} to {activePlan.end_date}
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          {plans.length > 1 && (
            <select
              value={activePlan?.id}
              onChange={(e) => setActivePlan(plans.find((p) => p.id === e.target.value))}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900 text-sm font-semibold"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setIsNewPlanOpen(true)}
            className="flex items-center gap-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
          >
            <Icons.Plus size={16} /> New Plan
          </button>
        </div>
      </div>

      {/* Check if no plans exist */}
      {!activePlan ? (
        <div className="py-20 text-center space-y-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm max-w-xl mx-auto">
          <span className="text-5xl">🗓️</span>
          <h3 className="text-lg font-black text-zinc-800 dark:text-zinc-200">No active meal plan found</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
            Create a weekly planner sheet to organize your breakfasts, lunches, and healthy snacks.
          </p>
          <button
            onClick={() => setIsNewPlanOpen(true)}
            className="px-6 py-3 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-orange-700 transition-colors"
          >
            Create First Plan
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main 7-Column Layout Calendar grid */}
          <div className="overflow-x-auto border border-zinc-200/60 dark:border-zinc-800/80 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm">
            <div className="min-w-[850px] divide-y divide-zinc-100 dark:divide-zinc-800">
              
              {/* Grid Header Days */}
              <div className="grid grid-cols-7 bg-zinc-50 dark:bg-zinc-900 text-center py-3 text-xs font-black text-zinc-500 uppercase tracking-wider">
                {daysOfWeek.map((day) => (
                  <div key={day} className="border-r last:border-r-0 border-zinc-100 dark:border-zinc-800/50">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid Rows Slots */}
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {mealSlots.map((slot) => (
                  <div key={slot} className="relative">
                    {/* Floating Side Badge */}
                    <div className="absolute left-3 top-2 pointer-events-none select-none">
                      <span className="text-[9px] font-black uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-md border border-zinc-200/50 dark:border-zinc-700/50">
                        {slot}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-7 divide-x divide-zinc-100 dark:divide-zinc-800 pt-6">
                      {daysOfWeek.map((day) => {
                        // Find item matching day and slot
                        const item = planItems.find(
                          (i: any) => i.day_of_week === day && i.meal_slot === slot
                        );

                        return (
                          <div 
                            key={day} 
                            className="p-3 min-h-[120px] flex flex-col justify-center transition-all"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, day, slot)}
                          >
                            {item ? (
                              <div 
                                draggable
                                onDragStart={(e) => handleDragStart(e, item, day, slot)}
                                className="relative group bg-zinc-50 dark:bg-zinc-850 p-2.5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 flex flex-col justify-between text-left h-full cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200"
                              >
                                {/* Remove button */}
                                <button
                                  onClick={() => handleRemoveRecipe(item.id)}
                                  className="absolute -top-1.5 -right-1.5 w-5.5 h-5.5 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-rose-600 shadow-sm cursor-pointer z-10 transition-transform hover:scale-105"
                                >
                                  ✕
                                </button>
                                
                                <div className="space-y-1">
                                  {item.recipes?.image_url && (
                                    <img
                                      src={item.recipes.image_url}
                                      alt={item.recipes.name}
                                      className="w-full h-14 object-cover rounded-xl mb-1.5"
                                      draggable={false}
                                    />
                                  )}
                                  <h4 className="text-[11px] font-bold leading-snug text-zinc-800 dark:text-zinc-200 line-clamp-2">
                                    {item.recipes?.name || 'Recipe'}
                                  </h4>
                                </div>
                                <span className="text-[10px] font-extrabold text-orange-600 dark:text-orange-400 mt-2 block">
                                  {item.recipes?.nutrition?.calories || 300} kcal
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveSlot({ day, slot });
                                  setIsAddOpen(true);
                                }}
                                className="w-full h-16 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 hover:border-orange-500 hover:bg-orange-50/20 text-zinc-400 hover:text-orange-600 text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
                              >
                                <Icons.Plus size={14} />
                                Add
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* WEEKLY CALORIE SUMMARY BAR */}
          <div className={`p-5 rounded-3xl border text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-3 transition-colors ${summaryColorClass}`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">Weekly Calories Summary</p>
              <h3 className="text-lg font-black mt-1">
                Week Total: {totalCalories.toLocaleString()} kcal | Avg: {avgCaloriesPerDay.toLocaleString()} kcal/day
              </h3>
            </div>
            <div className="px-4 py-2 rounded-xl text-xs font-black bg-white/20 dark:bg-black/20 border border-white/10">
              {avgCaloriesPerDay === 0 ? (
                'Add recipes to track limit'
              ) : isWithinLimit ? (
                'On track with target (±10%)'
              ) : isOverLimit ? (
                `Exceeds daily target (${calorieTarget} kcal)`
              ) : (
                `Below daily target (${calorieTarget} kcal)`
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. NEW PLAN MODAL POPUP */}
      {isNewPlanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setIsNewPlanOpen(false)} />
          
          <form
            onSubmit={handleCreatePlan}
            className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-2xl p-6 space-y-6 pointer-events-auto mx-4 animate-in zoom-in-95 duration-200"
          >
            <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50">Create Meal Plan</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">
                  Plan Name
                </label>
                <input
                  type="text"
                  required
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="e.g., Summer Shred Plan"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={newPlanStart}
                  onChange={(e) => setNewPlanStart(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={newPlanEnd}
                  onChange={(e) => setNewPlanEnd(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-800 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsNewPlanOpen(false)}
                className="flex-1 py-3 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-650 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 py-3 bg-orange-600 text-white text-sm font-bold rounded-xl shadow-md hover:bg-orange-700 disabled:opacity-50 transition-colors flex justify-center items-center"
              >
                {creating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. ADD RECIPE TO PLAN MODAL SEARCH */}
      {isAddOpen && activeSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setIsAddOpen(false)} />
          
          <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-2xl p-6 space-y-6 pointer-events-auto mx-4 flex flex-col max-h-[500px]">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50">
                Add to {activeSlot.day} - {activeSlot.slot}
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Search inputs */}
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-zinc-400">
                <Icons.Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search healthy recipe..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-50"
              />
            </div>

            {/* Recipes scroll canvas */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[220px]">
              {loadingRecipes ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-1" />
                  <p className="text-[9px] text-zinc-400">Searching...</p>
                </div>
              ) : recipes.length > 0 ? (
                recipes.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-zinc-50 dark:bg-zinc-850 hover:bg-orange-50/30 dark:hover:bg-orange-950/20 border border-zinc-150 dark:border-zinc-800/80 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      {r.image_url && (
                        <img
                          src={r.image_url}
                          alt={r.name}
                          className="w-10 h-10 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-250 line-clamp-1">{r.name}</h4>
                        <p className="text-[9px] text-zinc-450 dark:text-zinc-500 mt-0.5">{r.calories || 300} kcal</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddRecipeToSlot(r.id)}
                      className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-[10px] font-bold shadow-sm hover:bg-orange-700 transition-colors"
                    >
                      Select
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-zinc-500 py-10">No recipes matched your search.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
