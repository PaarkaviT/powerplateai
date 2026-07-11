'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/Icons';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/Toast';

export default function Feed() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChip, setSelectedChip] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Filter Drawer Values
  const [tempDiet, setTempDiet] = useState<string>('');
  const [tempMaxCal, setTempMaxCal] = useState<number>(1000);
  const [tempMaxTime, setTempMaxTime] = useState<number>(90);
  const [tempMaxSugar, setTempMaxSugar] = useState<number>(50);
  const [tempMaxSodium, setTempMaxSodium] = useState<number>(1000);
  const [tempMinProtein, setTempMinProtein] = useState<number>(0);
  const [tempDifficulty, setTempDifficulty] = useState<string>('');
  const [tempAudience, setTempAudience] = useState<string>('');

  const [activeIncludeIngredients, setActiveIncludeIngredients] = useState<string>('');
  const [activeExcludeIngredients, setActiveExcludeIngredients] = useState<string>('');
  const [tempIncludeIngredients, setTempIncludeIngredients] = useState<string>('');
  const [tempExcludeIngredients, setTempExcludeIngredients] = useState<string>('');
  
  const [activeDiet, setActiveDiet] = useState<string>('');
  const [activeMaxCal, setActiveMaxCal] = useState<number | null>(null);
  const [activeMaxTime, setActiveMaxTime] = useState<number | null>(null);
  const [activeMaxSugar, setActiveMaxSugar] = useState<number | null>(null);
  const [activeMaxSodium, setActiveMaxSodium] = useState<number | null>(null);
  const [activeMinProtein, setActiveMinProtein] = useState<number | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<string>('');
  const [activeAudience, setActiveAudience] = useState<string>('');

  // Family Profiles (Module 9)
  const [familyProfiles, setFamilyProfiles] = useState<any[]>([]);
  const [activeFamilyId, setActiveFamilyId] = useState<string>('');
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<any | null>(null);

  // Monetization status
  const [isUserPremium, setIsUserPremium] = useState(false);

  const getBodyMatchScore = (recipe: any, selectedMember: any) => {
    if (!selectedMember) {
      // Default to the backend-calculated score
      return recipe.match_score || 80;
    }

    // Recalculate score for family member:
    let score = 0;
    const diet = selectedMember.dietary_preference || 'nonvegetarian';

    // 1. Dietary Match (50% max)
    if (diet === 'nonvegetarian') {
      score += 50;
    } else {
      const recipeDiet = (recipe.dietary_tag || '').toLowerCase();
      if (recipeDiet === diet) {
        score += 50;
      } else if (diet === 'vegetarian' && recipeDiet === 'vegan') {
        score += 50; // Vegans are also vegetarian
      } else if (diet === 'vegetarian' && recipeDiet === 'jain') {
        score += 50; // Jain is vegetarian
      } else {
        score += 10; // Partial mismatch
      }
    }

    // 2. Health & Calorie limits (30% max)
    const nutrition = recipe.nutrition || {};
    const calories = nutrition.calories || 300;
    
    // If family member is diabetic, penalize high sugar (>12g) and high GI
    if (selectedMember.diabetic) {
      if (recipe.glycemic_index === 'high' || Number(recipe.sugar_g || recipe.nutrition?.sugar_g) > 12) {
        score -= 20;
      } else {
        score += 30; // Diabetic-friendly sugars
      }
    } else if (selectedMember.hypertension) {
      // If family member has hypertension, penalize high sodium (>800mg)
      if (Number(recipe.sodium_mg || recipe.nutrition?.sodium_mg) > 800) {
        score -= 20;
      } else {
        score += 30; // Low-sodium matches
      }
    } else {
      // Normal calorie budget match
      if (calories < 400) {
        score += 30;
      } else if (calories < 700) {
        score += 20;
      } else {
        score += 10;
      }
    }

    // 3. Preferred cuisine matching (20% max)
    score += 20; // Default match points for variety

    // Bound between 0 and 100
    return Math.max(0, Math.min(100, score));
  };

  // Pagination / Infinite Scroll
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const limit = 6; 

  const filterChips = [
    { label: 'All', value: 'All' },
    { label: 'Vegan', value: 'vegan' },
    { label: 'Keto', value: 'keto' },
    { label: 'Jain', value: 'jain' },
    { label: 'Halal', value: 'halal' },
    { label: 'High Protein', value: 'high-protein' },
    { label: 'Under 400 kcal', value: 'under-400' },
  ];

  const categoryTabs = [
    { name: 'All Meals', value: null, icon: '🍽️' },
    { name: 'Breakfast', value: 'breakfast', icon: '🍳' },
    { name: 'Lunch', value: 'lunch', icon: '🥗' },
    { name: 'Dinner', value: 'dinner', icon: '🍲' },
    { name: 'Snacks', value: 'snack', icon: '🍎' },
  ];

  // Fetch initial profile-based diet and AI suggestions
  useEffect(() => {
    // 1. Fetch AI Suggestions
    apiFetch('/api/ai/meal-suggestions', { method: 'POST' })
      .then((data) => setAiSuggestions(data))
      .catch((err) => console.error('Failed to load AI suggestions:', err))
      .finally(() => setLoadingSuggestions(false));

    // 2. Fetch User Profile to pre-filter recipes by default diet preference
    apiFetch('/api/profile')
      .then((profile) => {
        if (profile) {
          setIsUserPremium(!!profile.is_premium);
          if (profile.dietary_preference && profile.dietary_preference !== 'nonvegetarian') {
            setActiveDiet(profile.dietary_preference);
            setTempDiet(profile.dietary_preference);
          }
        }
      })
      .catch((err) => console.error('Failed to load profile for default filter:', err));

    // 3. Fetch Family Profiles (Module 9)
    apiFetch('/api/profile/family')
      .then((data) => setFamilyProfiles(data || []))
      .catch((err) => console.error('Failed to load family profiles:', err));
  }, []);

  // Construct URL parameters and fetch recipes
  const loadRecipes = useCallback(
    async (currentOffset: number, append = false) => {
      try {
        if (currentOffset === 0) setLoading(true);
        else setFetchingMore(true);

        let url = `/api/recipes?limit=${limit}&offset=${currentOffset}`;

        if (searchQuery.trim()) {
          url += `&search=${encodeURIComponent(searchQuery.trim())}`;
        }

        // Apply Active Filters (from Drawer, Chips, or Category Tabs)
        let finalDiet = activeDiet;
        let finalMaxCal = activeMaxCal;

        if (selectedChip !== 'All') {
          if (['vegan', 'keto', 'jain', 'halal'].includes(selectedChip)) {
            finalDiet = selectedChip;
          } else if (selectedChip === 'under-400') {
            finalMaxCal = 400;
          }
        }

        if (finalDiet) url += `&dietary_tag=${finalDiet}`;
        if (finalMaxCal) url += `&max_calories=${finalMaxCal}`;
        if (activeMaxTime) url += `&max_cook_time=${activeMaxTime}`;
        
        // Advanced Filters
        if (activeMaxSugar !== null) url += `&sugar_g=${activeMaxSugar}`;
        if (activeMaxSodium !== null) url += `&sodium_mg=${activeMaxSodium}`;
        if (activeMinProtein !== null) url += `&min_protein_g=${activeMinProtein}`;
        if (activeDifficulty) url += `&difficulty=${activeDifficulty}`;
        if (activeAudience) url += `&audience_type=${activeAudience}`;
        if (selectedCategory) url += `&meal_category=${selectedCategory}`;
        if (activeIncludeIngredients.trim()) url += `&include_ingredients=${encodeURIComponent(activeIncludeIngredients.trim())}`;
        if (activeExcludeIngredients.trim()) url += `&exclude_ingredients=${encodeURIComponent(activeExcludeIngredients.trim())}`;

        const data = await apiFetch(url);

        // Apply client-side chip filters that cannot be fully computed in DB queries
        let filteredData = data;
        if (selectedChip === 'high-protein') {
          filteredData = filteredData.filter((r: any) => 
            (r.protein_g && r.protein_g >= 20) || r.tags?.includes('high-protein') || r.dietary_tag === 'keto'
          );
        }

        if (append) {
          setRecipes((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const newItems = filteredData.filter((item: any) => !existingIds.has(item.id));
            return [...prev, ...newItems];
          });
        } else {
          setRecipes(filteredData);
        }

        setHasMore(data.length === limit);
      } catch (err: any) {
        toast(err.message || 'Failed to fetch recipes', 'error');
      } finally {
        setLoading(false);
        setFetchingMore(false);
      }
    },
    [searchQuery, selectedChip, selectedCategory, activeDiet, activeMaxCal, activeMaxTime, activeMaxSugar, activeMaxSodium, activeMinProtein, activeDifficulty, activeAudience, activeIncludeIngredients, activeExcludeIngredients]
  );

  // Reload recipes when filters, chip, search, or category tab changes
  useEffect(() => {
    setOffset(0);
    loadRecipes(0, false);
  }, [loadRecipes]);

  // Infinite scroll observer hook
  useEffect(() => {
    if (loading || !hasMore || fetchingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const nextOffset = offset + limit;
          setOffset(nextOffset);
          loadRecipes(nextOffset, true);
        }
      },
      { threshold: 0.8 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [loading, hasMore, fetchingMore, offset, loadRecipes]);

  const handleApplyFilters = () => {
    setActiveDiet(tempDiet);
    setActiveMaxCal(tempMaxCal === 1000 ? null : tempMaxCal);
    setActiveMaxTime(tempMaxTime === 90 ? null : tempMaxTime);
    setActiveMaxSugar(tempMaxSugar === 50 ? null : tempMaxSugar);
    setActiveMaxSodium(tempMaxSodium === 1000 ? null : tempMaxSodium);
    setActiveMinProtein(tempMinProtein === 0 ? null : tempMinProtein);
    setActiveDifficulty(tempDifficulty);
    setActiveAudience(tempAudience);
    setActiveIncludeIngredients(tempIncludeIngredients);
    setActiveExcludeIngredients(tempExcludeIngredients);
    setIsFilterOpen(false);
  };

  const handleResetFilters = () => {
    setTempDiet('');
    setTempMaxCal(1000);
    setTempMaxTime(90);
    setTempMaxSugar(50);
    setTempMaxSodium(1000);
    setTempMinProtein(0);
    setTempDifficulty('');
    setTempAudience('');
    setTempIncludeIngredients('');
    setTempExcludeIngredients('');

    setActiveDiet('');
    setActiveMaxCal(null);
    setActiveMaxTime(null);
    setActiveMaxSugar(null);
    setActiveMaxSodium(null);
    setActiveMinProtein(null);
    setActiveDifficulty('');
    setActiveAudience('');
    setActiveIncludeIngredients('');
    setActiveExcludeIngredients('');

    setSelectedChip('All');
    setSelectedCategory(null);
    setIsFilterOpen(false);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto w-full">
      {/* Target Profile Selector Header (Module 9) */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 p-4 rounded-3xl text-left">
        <div>
          <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-50">Discover Healthy Recipes</h2>
          <p className="text-xs text-zinc-450 dark:text-zinc-500 mt-0.5">Explore delicious options optimized for your health</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Eating For:</span>
          <select
            value={activeFamilyId}
            onChange={(e) => {
              const val = e.target.value;
              setActiveFamilyId(val);
              const found = familyProfiles.find(fp => fp.id === val);
              setSelectedFamilyMember(found || null);
            }}
            className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-850 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="">Me (Primary)</option>
            {familyProfiles.map(fp => (
              <option key={fp.id} value={fp.id}>{fp.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Header and Filter Icon */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <span className="absolute inset-y-0 left-4 flex items-center text-zinc-400">
            <Icons.Search size={20} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes, ingredients..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-900 text-sm text-zinc-800 dark:text-zinc-200"
          />
        </div>
        <button
          onClick={() => {
            if (!isUserPremium) {
              toast('Advanced Filters is a Premium feature. Please upgrade to unlock! 👑', 'error');
              setTimeout(() => {
                window.location.href = '/premium';
              }, 1500);
              return;
            }
            setIsFilterOpen(true);
          }}
          className="p-3 bg-white hover:bg-zinc-50 rounded-2xl border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 text-zinc-650 dark:text-zinc-350 hover:text-orange-600 transition-colors cursor-pointer"
        >
          <Icons.Filter />
        </button>
      </div>

      {/* Sliding Quick-Meal Category Horizontal bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categoryTabs.map((tab, idx) => {
          const isSelected = selectedCategory === tab.value;
          return (
            <button
              key={idx}
              onClick={() => setSelectedCategory(tab.value)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-5 py-2.5 rounded-2xl text-xs font-black border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-orange-600 border-orange-650 text-white shadow-md'
                  : 'bg-white border-zinc-150 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 hover:border-zinc-250'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Horizontal filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {filterChips.map((chip) => {
          const isSelected = selectedChip === chip.value;
          return (
            <button
              key={chip.label}
              onClick={() => setSelectedChip(chip.value)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-orange-50 border-orange-300 text-orange-800 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-450'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* AI SUGGESTIONS BANNER */}
      <div className="space-y-3">
        <h3 className="text-base font-extrabold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-100">
          <span>✨</span> AI Suggested for you
        </h3>
        
        {loadingSuggestions ? (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex-shrink-0 w-64 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : aiSuggestions.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {aiSuggestions.map((item, idx) => (
              <button
                key={idx}
                onClick={() => item.recipe_id && router.push(`/recipes/${item.recipe_id}`)}
                disabled={!item.recipe_id}
                className="flex-shrink-0 w-80 p-3 bg-white dark:bg-zinc-850 border border-zinc-150 dark:border-zinc-800 rounded-2xl flex gap-3 text-left hover:border-orange-300 dark:hover:border-orange-800 transition-colors"
              >
                <img
                  src={item.image_url || `https://image.pollinations.ai/prompt/Close%20up%20shot%20of%20${encodeURIComponent(item.name || 'food')}%2C%20realistic%20food%20photo%2C%20delicious?width=400&height=300&nologo=true`}
                  alt={item.name}
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex justify-between items-center mb-1 gap-1">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded bg-orange-100/60 dark:bg-orange-900/40">
                        {item.meal_slot}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                        {item.estimated_calories} kcal
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-850 dark:text-zinc-100 line-clamp-1">
                      {item.name}
                    </h4>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
                      {item.reason}
                    </p>
                  </div>
                  {item.recipe_id && (
                    <span className="text-[9px] font-extrabold text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-0.5 hover:underline">
                      View Recipe →
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-zinc-50 border border-zinc-100 dark:bg-zinc-900/30 dark:border-zinc-800 rounded-2xl text-center text-xs text-zinc-500">
            Log some meals in your tracker to receive AI recipe suggestions!
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm flex flex-col gap-3 p-4 h-64 animate-pulse">
              <div className="w-full h-32 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : recipes.length > 0 ? (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                onClick={() => router.push(`/recipes/${recipe.id}`)}
                className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between"
              >
                <div className="relative">
                  <img
                    src={recipe.image_url || '/placeholder-food.jpg'}
                    alt={recipe.name}
                    className="w-full h-32 md:h-40 object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  
                  {/* Dynamic Body-Match % Badge */}
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-orange-600/90 text-white shadow-md backdrop-blur-xs flex items-center gap-0.5">
                    ❤️ {getBodyMatchScore(recipe, selectedFamilyMember)}% Match
                  </span>


                  {/* Bookmark Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toast('Bookmarked successfully!', 'success');
                    }}
                    className="absolute top-3 right-3 p-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-full shadow-sm hover:bg-white text-zinc-600 dark:text-zinc-300 hover:text-amber-500 transition-colors"
                  >
                    <Icons.Star size={16} />
                  </button>

                  {/* Dietary chip */}
                  <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-orange-500 text-white shadow-md">
                    {recipe.dietary_tag}
                  </span>
                </div>
                
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm md:text-base text-zinc-900 dark:text-zinc-100 group-hover:text-orange-600 transition-colors line-clamp-1">
                      {recipe.name}
                    </h4>
                    <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-450 pt-1 mb-2">
                      <span className="flex items-center gap-1">
                        <Icons.Clock size={12} />
                        {recipe.prep_time_mins} min
                      </span>
                      <span className="font-extrabold text-zinc-700 dark:text-zinc-300">
                        {recipe.calories || 300} kcal
                      </span>
                    </div>
                  </div>

                  {/* Option B: Nutrition snapshot printed directly on the recipe card as small text labels */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-zinc-450 dark:text-zinc-400 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
                    <div>Protein: <strong className="text-zinc-700 dark:text-zinc-250 font-extrabold">{recipe.protein_g || 15}g</strong></div>
                    <div>Carbs: <strong className="text-zinc-700 dark:text-zinc-250 font-extrabold">{recipe.carbs_g || 40}g</strong></div>
                    <div>Fats: <strong className="text-zinc-700 dark:text-zinc-250 font-extrabold">{recipe.fat_g || 12}g</strong></div>
                    <div>Fiber: <strong className="text-zinc-700 dark:text-zinc-250 font-extrabold">{recipe.fiber_g || 6}g</strong></div>
                    <div>Sugar: <strong className="text-zinc-700 dark:text-zinc-250 font-extrabold">{recipe.sugar_g || 4}g</strong></div>
                    <div>Sodium: <strong className="text-zinc-700 dark:text-zinc-250 font-extrabold">{recipe.sodium_mg || 300}mg</strong></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Infinite Scroll Trigger */}
          {hasMore && (
            <div className="w-full py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div className="py-16 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800">
          <span className="text-4xl">🥑</span>
          <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">No recipes matched your search or filters.</p>
          <button
            onClick={handleResetFilters}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* FILTER DRAWER MODAL */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setIsFilterOpen(false)} />
          
          <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl border-t border-zinc-100 dark:border-zinc-850 p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom duration-300 pointer-events-auto max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto -mt-2 mb-2" />
            
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50">Filter Recipes</h3>
              <button
                onClick={handleResetFilters}
                className="text-xs font-bold text-zinc-400 hover:text-rose-500 cursor-pointer"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-4">
              {/* Diet Choice */}
              <div>
                <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">
                  Dietary Preference
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['vegan', 'vegetarian', 'keto', 'gluten-free', 'jain', 'halal'].map((diet) => {
                    const isSelected = tempDiet === diet;
                    return (
                      <button
                        key={diet}
                        onClick={() => setTempDiet(tempDiet === diet ? '' : diet)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-orange-50 border-orange-300 text-orange-850 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:bg-zinc-800 dark:border-zinc-850 dark:text-zinc-400'
                        }`}
                      >
                        {diet.replace('-', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Ingredient Specific Include/Exclude Filters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Must Include Ingredients</label>
                  <input
                    type="text"
                    value={tempIncludeIngredients}
                    onChange={(e) => setTempIncludeIngredients(e.target.value)}
                    placeholder="e.g. okra, eggplant"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Exclude Ingredients</label>
                  <input
                    type="text"
                    value={tempExcludeIngredients}
                    onChange={(e) => setTempExcludeIngredients(e.target.value)}
                    placeholder="e.g. peanuts, mushroom"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-800 text-xs"
                  />
                </div>
              </div>

              {/* Difficulty and Audience Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Difficulty</label>
                  <select
                    value={tempDifficulty}
                    onChange={(e) => setTempDifficulty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-250 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 text-xs"
                  >
                    <option value="">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-zinc-555 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Audience Type</label>
                  <select
                    value={tempAudience}
                    onChange={(e) => setTempAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-250 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 text-xs"
                  >
                    <option value="">All Audiences</option>
                    <option value="kids">Kids</option>
                    <option value="adults">Adults</option>
                    <option value="elderly">Elderly</option>
                  </select>
                </div>
              </div>

              {/* Calories Slider */}
              <div>
                <div className="flex justify-between text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  <span>Max Calories</span>
                  <span className="text-orange-600 font-black">{tempMaxCal} kcal</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={tempMaxCal}
                  onChange={(e) => setTempMaxCal(Number(e.target.value))}
                  className="w-full accent-orange-500 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer dark:bg-zinc-800"
                />
              </div>

              {/* Prep Time Slider */}
              <div>
                <div className="flex justify-between text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  <span>Max Cooking Time</span>
                  <span className="text-orange-600 font-black">{tempMaxTime} mins</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="90"
                  step="5"
                  value={tempMaxTime}
                  onChange={(e) => setTempMaxTime(Number(e.target.value))}
                  className="w-full accent-orange-500 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer dark:bg-zinc-800"
                />
              </div>

              {/* Advanced Nutrient Sliders: Protein, Sugar, Sodium */}
              <div className="space-y-3.5 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                <div>
                  <div className="flex justify-between text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">
                    <span>Min Protein</span>
                    <span className="text-orange-600 font-black">{tempMinProtein}g</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={tempMinProtein}
                    onChange={(e) => setTempMinProtein(Number(e.target.value))}
                    className="w-full accent-orange-500 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer dark:bg-zinc-800"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">
                    <span>Max Sugar Limit</span>
                    <span className="text-orange-600 font-black">{tempMaxSugar}g</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={tempMaxSugar}
                    onChange={(e) => setTempMaxSugar(Number(e.target.value))}
                    className="w-full accent-orange-500 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer dark:bg-zinc-800"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">
                    <span>Max Sodium Limit</span>
                    <span className="text-orange-600 font-black">{tempMaxSodium}mg</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={tempMaxSodium}
                    onChange={(e) => setTempMaxSodium(Number(e.target.value))}
                    className="w-full accent-orange-500 h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer dark:bg-zinc-800"
                  />
                </div>
              </div>

            </div>

            <button
              onClick={handleApplyFilters}
              className="w-full py-3.5 bg-orange-600 text-white font-bold rounded-xl shadow-md hover:bg-orange-700 transition-colors cursor-pointer"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
