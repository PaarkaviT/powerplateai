'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Icons } from '@/components/Icons';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/Toast';

export default function RecipeDetail() {
  const router = useRouter();
  const { id } = useParams();

  const [recipe, setRecipe] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Custom interactive states
  const [servings, setServings] = useState(1);
  const [isCooking, setIsCooking] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  
  // Log Meal Modal Inputs
  const [logSlot, setLogSlot] = useState('breakfast');
  const [logServings, setLogServings] = useState(1);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    // Fetch recipe
    apiFetch(`/api/recipes/${id}`)
      .then((data) => {
        setRecipe(data);
        setServings(data.servings || 1);
        setLogServings(data.servings || 1);
      })
      .catch((err) => {
        toast(err.message || 'Failed to load recipe details', 'error');
        router.push('/feed');
      });

    // Fetch user profile targets
    apiFetch('/api/profile')
      .then((p) => setProfile(p))
      .catch((err) => console.error('Failed to load profile targets:', err))
      .finally(() => {
        setLoading(false);
      });
  }, [id, router]);

  // Voice guided instructions (TTS narration)
  const speakStep = (idx: number) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // cancel any active speech
      const steps = recipe?.steps || [];
      if (steps[idx]) {
        const textToSpeak = `Step ${idx + 1}. ${steps[idx]}`;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 0.95; // slightly slower for cooking pacing
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Trigger voice narration automatically when step changes
  useEffect(() => {
    if (isCooking && recipe) {
      speakStep(currentStep);
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentStep, isCooking, recipe]);

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-zinc-500">Retrieving recipe...</p>
      </div>
    );
  }

  if (!recipe) return null;

  const nutrition = (recipe.nutrition || {}) as any;
  const caloriesPerServing = Number(nutrition.calories || 0);
  const proteinPerServing = Number(nutrition.protein_g || 0);
  const carbsPerServing = Number(nutrition.carbs_g || 0);
  const fatPerServing = Number(nutrition.fat_g || 0);

  // Scaling factor based on interactive servings adjustment
  const scale = servings / (recipe.servings || 1);

  const handleLogMeal = async () => {
    setLogging(true);
    try {
      await apiFetch('/api/meal-logs', {
        method: 'POST',
        body: JSON.stringify({
          recipe_id: recipe.id,
          meal_slot: logSlot,
          servings: Number(logServings),
          logged_at: new Date().toISOString(),
        }),
      });

      toast('Logged to your tracker!', 'success');
      setIsLogOpen(false);
    } catch (err: any) {
      toast(err.message || 'Failed to log meal', 'error');
    } finally {
      setLogging(false);
    }
  };

  // FULL SCREEN COOKING MODE LAYOUT
  if (isCooking) {
    const steps = recipe.steps || [];
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 flex flex-col pointer-events-auto">
        {/* Header */}
        <header className="h-16 border-b border-zinc-150 dark:border-zinc-800 px-6 flex items-center justify-between">
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
              setIsCooking(false);
            }}
            className="flex items-center gap-1 text-sm font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
          >
            <Icons.ArrowLeft size={16} /> Exit cooking mode
          </button>
          
          {/* Read Step speaker button */}
          <button
            onClick={() => speakStep(currentStep)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 rounded-xl text-xs font-black transition-colors cursor-pointer"
          >
            <Icons.Volume size={16} /> Speak Aloud
          </button>
          
          <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">
            Step {currentStep + 1} of {steps.length}
          </span>
        </header>

        {/* Cooking Canvas */}
        <div className="flex-1 flex flex-col justify-center items-center p-6 text-center max-w-2xl mx-auto space-y-8">
          {/* Progress Dot Indicator */}
          <div className="flex justify-center gap-1.5">
            {steps.map((_: any, idx: number) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep ? 'w-6 bg-orange-500' : 'w-2 bg-zinc-200 dark:bg-zinc-800'
                }`}
              />
            ))}
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-50 leading-relaxed max-w-xl">
            {steps[currentStep]}
          </h2>
        </div>

        {/* Footer controls */}
        <footer className="h-20 border-t border-zinc-150 dark:border-zinc-800 px-6 flex items-center justify-between">
          <button
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((prev) => prev - 1)}
            className="px-5 py-3 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-600 disabled:opacity-30 dark:border-zinc-800 dark:text-zinc-400 cursor-pointer"
          >
            Previous
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="px-6 py-3 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-orange-700 transition-colors cursor-pointer"
            >
              Next Step
            </button>
          ) : (
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                }
                setIsCooking(false);
                toast('Bravo! You finished cooking! 🎉', 'success');
              }}
              className="px-6 py-3 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-orange-700 transition-colors cursor-pointer"
            >
              Finish Cooking
            </button>
          )}
        </footer>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 pb-20 relative">
      {/* Hero Section */}
      <div className="relative h-64 sm:h-80 w-full rounded-3xl overflow-hidden shadow-md">
        <img
          src={recipe.image_url || '/placeholder-food.jpg'}
          alt={recipe.name}
          className="w-full h-full object-cover"
        />
        {/* Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
        
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all cursor-pointer"
        >
          <Icons.ArrowLeft size={20} />
        </button>

        {/* Heading information overlay */}
        <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-orange-500 text-white shadow-md">
            {recipe.dietary_tag}
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            {recipe.name}
          </h1>
          <div className="flex gap-4 text-xs font-bold text-orange-100">
            <span className="flex items-center gap-1">
              <Icons.Clock size={14} className="text-white" />
              {recipe.prep_time_mins} min
            </span>
            <span className="flex items-center gap-1">
              <Icons.Flame size={14} className="text-white" />
              {Math.round(caloriesPerServing * scale)} kcal per serving
            </span>
          </div>
        </div>
      </div>

      {/* Description text */}
      {recipe.description && (
        <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
          {recipe.description}
        </p>
      )}

      {/* Dynamic Health Warning / Recommendations Badges */}
      <div className="flex flex-wrap gap-2.5">
        {recipe.glycemic_index && (
          <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
            recipe.glycemic_index === 'low'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : recipe.glycemic_index === 'medium'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
          }`}>
            Glycemic Index: {recipe.glycemic_index}
          </span>
        )}
        {recipe.sugar_g !== undefined && Number(recipe.sugar_g) < 5 && (
          <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-900/40 dark:text-emerald-400 rounded-xl text-xs font-black uppercase tracking-wider">
            ✓ Diabetic Friendly
          </span>
        )}
        {recipe.sugar_g !== undefined && Number(recipe.sugar_g) > 15 && (
          <span className="px-2.5 py-1 bg-amber-50 border border-amber-250 text-amber-700 dark:bg-amber-950 dark:border-amber-900/40 dark:text-amber-400 rounded-xl text-xs font-black uppercase tracking-wider">
            ⚠️ High Sugar
          </span>
        )}
        {recipe.sodium_mg !== undefined && Number(recipe.sodium_mg) > 800 && (
          <span className="px-2.5 py-1 bg-rose-50 border border-rose-250 text-rose-700 dark:bg-rose-950 dark:border-rose-900/40 dark:text-rose-450 rounded-xl text-xs font-black uppercase tracking-wider">
            ⚠️ High Sodium Warning
          </span>
        )}
        {recipe.sodium_mg !== undefined && Number(recipe.sodium_mg) < 300 && Number(fatPerServing) < 15 && (
          <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-900/45 dark:text-blue-400 rounded-xl text-xs font-black uppercase tracking-wider">
            ♥ Heart Healthy
          </span>
        )}
      </div>

      {/* Calories & Macros Snapshots */}
      <div className="space-y-3">
        <h3 className="text-base font-extrabold text-zinc-800 dark:text-zinc-150">Nutrition Snapshot</h3>
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-orange-50 border border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30 p-3 rounded-2xl text-center">
            <p className="text-[10px] uppercase font-extrabold text-orange-650">Calories</p>
            <p className="text-base font-black text-orange-950 dark:text-orange-200 mt-1">
              {Math.round(caloriesPerServing * scale)}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30 p-3 rounded-2xl text-center">
            <p className="text-[10px] uppercase font-extrabold text-blue-650">Protein</p>
            <p className="text-base font-black text-blue-950 dark:text-blue-200 mt-1">
              {Math.round(proteinPerServing * scale)}g
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-100 dark:bg-yellow-950/20 dark:border-yellow-900/30 p-3 rounded-2xl text-center">
            <p className="text-[10px] uppercase font-extrabold text-yellow-750">Carbs</p>
            <p className="text-base font-black text-yellow-950 dark:text-yellow-200 mt-1">
              {Math.round(carbsPerServing * scale)}g
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 p-3 rounded-2xl text-center">
            <p className="text-[10px] uppercase font-extrabold text-emerald-650">Fats</p>
            <p className="text-base font-black text-emerald-950 dark:text-emerald-200 mt-1">
              {Math.round(fatPerServing * scale)}g
            </p>
          </div>
        </div>
        
        {/* Sugar and Sodium line values */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-zinc-50 border border-zinc-150 dark:bg-zinc-900/40 dark:border-zinc-800 p-2.5 rounded-2xl text-center">
            <p className="text-[9px] uppercase font-extrabold text-zinc-500">Sugar</p>
            <p className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 mt-0.5">
              {recipe.sugar_g !== undefined ? Math.round(Number(recipe.sugar_g) * scale) : 4}g
            </p>
          </div>
          <div className="bg-zinc-50 border border-zinc-150 dark:bg-zinc-900/40 dark:border-zinc-800 p-2.5 rounded-2xl text-center">
            <p className="text-[9px] uppercase font-extrabold text-zinc-500">Sodium</p>
            <p className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 mt-0.5">
              {recipe.sodium_mg !== undefined ? Math.round(Number(recipe.sodium_mg) * scale) : 300}mg
            </p>
          </div>
        </div>
      </div>

      {/* Ingredients List with Interactive Servings adjust */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-extrabold text-zinc-800 dark:text-zinc-150">
            Ingredients (serves {servings})
          </h3>
          
          <div className="flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-1">
            <button
              onClick={() => setServings((prev) => Math.max(1, prev - 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer"
            >
              -
            </button>
            <span className="w-8 text-center text-sm font-bold text-zinc-800 dark:text-zinc-200">{servings}</span>
            <button
              onClick={() => setServings((prev) => prev + 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 divide-y divide-zinc-100 dark:divide-zinc-850 overflow-hidden shadow-sm">
          {recipe.ingredients && (recipe.ingredients as any[]).map((ing: any, idx: number) => {
            const scaledQty = ing.quantity ? Number(ing.quantity) * scale : null;
            return (
              <div key={idx} className="flex justify-between items-center px-5 py-3 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{ing.name}</span>
                {scaledQty !== null && (
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {Math.round(scaledQty * 10) / 10} {ing.unit}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Steps with Cooking guide option */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-extrabold text-zinc-800 dark:text-zinc-150">Preparation Steps</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setIsShareOpen(true)}
              className="flex items-center gap-1 px-3 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-xs font-bold text-zinc-650 dark:text-zinc-350 transition-colors cursor-pointer"
            >
              🔗 Share
            </button>
            <button
              onClick={() => {
                setCurrentStep(0);
                setIsCooking(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-orange-700 transition-colors cursor-pointer"
            >
              🍳 Start Cooking
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {recipe.steps && (recipe.steps as string[]).map((stepText: string, idx: number) => (
            <div key={idx} className="flex gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 shadow-xs">
              <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{stepText}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Smart Nutrition Coach widget */}
      <div className="relative overflow-hidden bg-orange-50/50 border border-orange-100/50 dark:bg-orange-950/20 dark:border-orange-900/30 p-6 rounded-3xl space-y-4">
        {/* Blurring overlay container for basic tier */}
        {!profile?.is_premium && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-orange-50/75 dark:bg-zinc-950/90 backdrop-blur-md p-4 text-center">
            <span className="text-2xl mb-1">👑🔒</span>
            <h5 className="text-xs font-black text-orange-900 dark:text-orange-400 uppercase tracking-wider">Premium Feature</h5>
            <p className="text-[10px] text-zinc-655 dark:text-zinc-400 mt-1 max-w-[240px]">
              Upgrade to PowerPlate Premium to unlock the AI Smart Nutrition Coach widget for meal swaps & portion recommendations.
            </p>
            <button
              onClick={() => window.location.href = '/premium'}
              className="mt-3 px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition-colors cursor-pointer"
            >
              Unlock Now
            </button>
          </div>
        )}

        <div className={`flex items-center gap-2 border-b border-orange-100 dark:border-orange-900/40 pb-2 ${!profile?.is_premium ? 'filter blur-xs' : ''}`}>
          <span className="text-xl">🤖</span>
          <h4 className="text-sm font-black text-orange-850 dark:text-orange-450">AI Smart Nutrition Coach</h4>
        </div>
        
        <div className={`${!profile?.is_premium ? 'filter blur-xs' : ''} space-y-4`}>
          {recipe.nutrition_summary && (
            <p className="text-xs text-orange-700 dark:text-orange-300/85 italic leading-relaxed text-left">
              "{recipe.nutrition_summary}"
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Portion control */}
            <div className="bg-white/60 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-orange-100/30 text-left">
              <p className="text-[10px] font-black uppercase text-orange-800 tracking-wider mb-1">💡 Portion Control Tip</p>
              <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {caloriesPerServing * scale > (profile?.daily_calorie_target || 2000) * 0.4 ? (
                  `This meal is dense (${Math.round(caloriesPerServing * scale)} kcal). Consider splitting it into 1.5 portions (consuming ${Math.round(caloriesPerServing * scale / 1.5)} kcal) to stay within your single-meal budget.`
                ) : caloriesPerServing * scale < (profile?.daily_calorie_target || 2000) * 0.2 ? (
                  `This is a light, calorie-conscious meal (${Math.round(caloriesPerServing * scale)} kcal). It fits comfortably in your daily target, leaving room for healthy snacks.`
                ) : (
                  `Portion size is optimal! One serving (${Math.round(caloriesPerServing * scale)} kcal) fits perfectly into your meal target of ${Math.round((profile?.daily_calorie_target || 2000) / 3)} kcal.`
                )}
              </p>
            </div>

            {/* Healthy Swaps */}
            <div className="bg-white/60 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-orange-100/30 text-left">
              <p className="text-[10px] font-black uppercase text-orange-800 tracking-wider mb-1">🔄 Healthy Swaps</p>
              <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {recipe.glycemic_index === 'high' || Number(recipe.sugar_g) > 12 ? (
                  "Glycemic index is high. Swap refined sugars for Stevia/Monk fruit, and white flour for almond or coconut flour to control glucose spikes."
                ) : (recipe.dietary_tag === 'keto' || Number(nutrition.fat_g) > 18) ? (
                  "Reduce heavy saturated fats by swapping butter for extra virgin olive oil, and cream for plain Greek yogurt."
                ) : (
                  "Boost nutrients by swapping white rice with quinoa/cauliflower rice, and refined salt with pink Himalayan salt."
                )}
              </p>
            </div>

            {/* Side Dish Pairing */}
            <div className="bg-white/60 dark:bg-zinc-900/40 p-3.5 rounded-2xl border border-orange-100/30 text-left">
              <p className="text-[10px] font-black uppercase text-orange-800 tracking-wider mb-1">🥗 Side-Dish Pairing</p>
              <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {proteinPerServing * scale < 15 ? (
                  "Low in protein. We recommend pairing this with a cup of warm lentil soup, grilled tofu slices, or 100g of roasted chickpeas."
                ) : recipe.dietary_tag === 'keto' ? (
                  "Keto profile. Pair with a fresh leafy green side salad dressed in extra virgin olive oil and lemon juice."
                ) : (
                  "Pair with steamed broccoli florets, roasted asparagus, or a high-fiber side of mixed greens to add vital micronutrients."
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-4 rounded-3xl flex gap-3 items-center">
        <span className="text-xl">🩺</span>
        <div className="text-left">
          <h4 className="text-xs font-extrabold text-zinc-500 dark:text-zinc-400">Difficulty Rating</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {recipe.difficulty || 'medium'}
            </span>
            <span className="text-[10px] text-zinc-450 dark:text-zinc-500">Audience: {recipe.audience_type || 'adults'}</span>
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM LOG MEAL BUTTON */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-t border-zinc-100 dark:border-zinc-850 p-4 flex justify-center z-40 md:pl-64">
        <button
          onClick={() => setIsLogOpen(true)}
          className="w-full max-w-md py-3.5 bg-orange-600 text-white font-extrabold rounded-xl shadow-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>🍽️</span> Log this meal
        </button>
      </div>

      {/* LOG MEAL DIALOG POPUP */}
      {isLogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setIsLogOpen(false)} />
          
          <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-2xl p-6 space-y-6 pointer-events-auto mx-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50">Log Meal</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">
                  Select Meal Slot
                </label>
                <select
                  value={logSlot}
                  onChange={(e) => setLogSlot(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 text-sm"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">
                  Number of Servings
                </label>
                <div className="flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-1 max-w-[140px]">
                  <button
                    onClick={() => setLogServings((prev) => Math.max(0.5, prev - 0.5))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-zinc-800 dark:text-zinc-200">{logServings}</span>
                  <button
                    onClick={() => setLogServings((prev) => prev + 0.5)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsLogOpen(false)}
                className="flex-1 py-3 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-650 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLogMeal}
                disabled={logging}
                className="flex-1 py-3 bg-orange-600 text-white text-sm font-bold rounded-xl shadow-md hover:bg-orange-700 disabled:opacity-50 transition-colors flex justify-center items-center cursor-pointer"
              >
                {logging ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Log Food'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL DIALOG (Module 9) */}
      {isShareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setIsShareOpen(false)} />
          
          <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-850 p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-zinc-50 dark:border-zinc-850 pb-2">
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-1">
                <span>🔗</span> Share Recipe
              </h3>
              <button
                onClick={() => setIsShareOpen(false)}
                className="text-zinc-400 hover:text-rose-500 font-extrabold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Share the healthy recipe <strong>{recipe.name}</strong> with your friends and family!
            </p>

            <div className="space-y-2.5">
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this healthy recipe: ${recipe.name} - ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>💬</span> Share on WhatsApp
              </a>

              {/* Email */}
              <a
                href={`mailto:?subject=${encodeURIComponent(`Healthy Recipe: ${recipe.name}`)}&body=${encodeURIComponent(`Check out this healthy recipe on PowerPlate:\n\n${recipe.name}\n\nLink: ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                className="w-full py-2.5 px-4 bg-zinc-805 hover:bg-zinc-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>✉️</span> Share via Email
              </a>

              {/* Copy Link */}
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(window.location.href);
                    toast('Link copied to clipboard! 📋', 'success');
                    setIsShareOpen(false);
                  }
                }}
                className="w-full py-2.5 px-4 bg-orange-50 hover:bg-orange-100 text-orange-750 dark:bg-orange-950/40 dark:text-orange-355 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>🔗</span> Copy Link
              </button>
            </div>

            <div className="pt-2 flex justify-center gap-3 border-t border-zinc-50 dark:border-zinc-850/50">
              <span className="text-[10px] text-zinc-400">Mock Social integrations:</span>
              <button onClick={() => toast('Shared to Facebook! 👥', 'success')} className="text-[10px] text-orange-600 hover:underline">Facebook</button>
              <button onClick={() => toast('Shared to Instagram Story! 📸', 'success')} className="text-[10px] text-orange-600 hover:underline">Instagram</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
