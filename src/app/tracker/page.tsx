'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '@/components/Icons';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/Toast';

export default function Tracker() {
  const [todayData, setTodayData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Add Meal Context
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [activeQuickSlot, setActiveQuickSlot] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  // AI Nutrition Insights Gaps
  const [aiGaps, setAiGaps] = useState<any[]>([]);
  const [loadingGaps, setLoadingGaps] = useState(false);

  // Load tracker details
  const loadTrackerData = useCallback(async () => {
    try {
      const today = await apiFetch('/api/meal-logs/today');
      setTodayData(today);

      const history = await apiFetch('/api/meal-logs/history?days=7');
      setHistoryData(history);
    } catch (err: any) {
      toast(err.message || 'Failed to load tracking data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrackerData();
  }, [loadTrackerData]);

  // Load recipes for Quick Add Search Modal
  useEffect(() => {
    if (!isQuickAddOpen) return;
    setLoadingRecipes(true);
    let url = '/api/recipes?limit=20';
    if (searchQuery.trim()) {
      url += `&search=${encodeURIComponent(searchQuery.trim())}`;
    }
    apiFetch(url)
      .then((data) => setRecipes(data))
      .catch((err) => console.error(err))
      .finally(() => setLoadingRecipes(false));
  }, [isQuickAddOpen, searchQuery]);

  const handleQuickAdd = async (recipeId: string) => {
    if (!activeQuickSlot) return;

    try {
      await apiFetch('/api/meal-logs', {
        method: 'POST',
        body: JSON.stringify({
          recipe_id: recipeId,
          meal_slot: activeQuickSlot,
          servings: 1,
          logged_at: new Date().toISOString(),
        }),
      });

      toast('Logged to your tracker!', 'success');
      setIsQuickAddOpen(false);
      loadTrackerData(); // Auto-refresh totals without reloading the page
    } catch (err: any) {
      toast(err.message || 'Failed to log food', 'error');
    }
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      await apiFetch(`/api/meal-logs?id=${logId}`, { method: 'DELETE' });
      toast('Meal log removed', 'success');
      loadTrackerData(); // Auto-refresh totals
    } catch (err: any) {
      toast(err.message || 'Failed to delete log', 'error');
    }
  };

  const handleAnalyzeGaps = async () => {
    setLoadingGaps(true);
    try {
      const gaps = await apiFetch('/api/ai/nutrition-gap', { method: 'POST' });
      setAiGaps(gaps);
      toast('AI nutrition analysis complete!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to run AI analysis', 'error');
    } finally {
      setLoadingGaps(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-zinc-500">Retrieving nutrition logbook...</p>
      </div>
    );
  }

  const totals = todayData?.totals || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 };
  const target = todayData?.calorie_target || 2000;
  const remaining = todayData?.remaining_calories || 0;
  const logs = todayData?.logs || [];

  // Group logs by slot
  const groupedLogs = {
    breakfast: logs.filter((l: any) => l.meal_slot === 'breakfast'),
    lunch: logs.filter((l: any) => l.meal_slot === 'lunch'),
    dinner: logs.filter((l: any) => l.meal_slot === 'dinner'),
    snack: logs.filter((l: any) => l.meal_slot === 'snack'),
  };

  // SVG Calorie Ring metrics
  const radius = 60;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const pct = Math.min(1, totals.calories / target);
  const strokeDashoffset = circumference - pct * circumference;

  // Custom SVG trend line chart plotting
  const chartWidth = 500;
  const chartHeight = 160;
  const padding = 20;

  // Prepare 7 days dates/calories
  const trendPoints = [...historyData];
  // Pad history if less than 7 days to keep chart beautiful
  if (trendPoints.length < 7) {
    const padded = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const match = historyData.find((h) => h.date === dStr);
      padded.push(match || { date: dStr, total_calories: 0 });
    }
    trendPoints.splice(0, trendPoints.length, ...padded);
  }

  const maxCalVal = Math.max(target * 1.2, ...trendPoints.map((p) => Number(p.total_calories || 0)));
  
  // Calculate points coordinates
  const svgPoints = trendPoints.map((point, idx) => {
    const x = padding + (idx / 6) * (chartWidth - padding * 2);
    const cal = Number(point.total_calories || 0);
    const y = chartHeight - padding - (cal / maxCalVal) * (chartHeight - padding * 2);
    return { x, y, cal, date: point.date };
  });

  const pathD = svgPoints.length > 0
    ? `M ${svgPoints[0].x} ${svgPoints[0].y} ` + svgPoints.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const targetLineY = chartHeight - padding - (target / maxCalVal) * (chartHeight - padding * 2);

  // Dynamic Weekly Achievements Calculations
  const sugarStreakDays = historyData.filter(d => Number(d.total_sugar_g || 0) <= 35).length;
  const proteinGoalDays = historyData.filter(d => Number(d.total_protein_g || 0) >= 100).length;

  const avgAchieved = (sugarStreakDays + proteinGoalDays) / 2;
  let bannerGradient = 'from-orange-500 via-amber-500 to-orange-600 border-orange-400'; // Default orange (Moderate: 3-4 days)
  
  if (avgAchieved >= 5) {
    bannerGradient = 'from-emerald-600 via-teal-600 to-emerald-700 border-emerald-500'; // Green (Healthy: 5+ days)
  } else if (avgAchieved < 3) {
    bannerGradient = 'from-rose-500 via-red-600 to-rose-600 border-rose-400'; // Red (Needs focus: 0-2 days)
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto w-full pb-20">
      
      {/* 1. WEEKLY PROGRESS ACHIEVEMENTS BANNER */}
      <div className={`bg-gradient-to-tr ${bannerGradient} border rounded-3xl p-6 text-white shadow-md flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center`}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider opacity-85">🏆 Weekly Progress Achievements</p>
          <h3 className="text-lg font-black mt-1">Healthy Habits Tracker</h3>
          <p className="text-xs opacity-75 mt-0.5">Your achievements over the past 7 days</p>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl flex-1 sm:flex-none">
            <p className="text-[9px] uppercase font-bold opacity-80">Sugar Streak</p>
            <p className="text-sm font-black mt-0.5">{sugarStreakDays} / 7 days</p>
            <span className="text-[9px] font-semibold text-orange-100 opacity-90">Under 35g limit</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl flex-1 sm:flex-none">
            <p className="text-[9px] uppercase font-bold opacity-80">Protein Goal</p>
            <p className="text-sm font-black mt-0.5">{proteinGoalDays} / 7 days</p>
            <span className="text-[9px] font-semibold text-orange-100 opacity-90 font-bold">Hit 100g target</span>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC NUTRIENT WARNINGS */}
      {(totals.sugar_g > 35 || totals.sodium_mg > 1500) && (
        <div className="space-y-2">
          {totals.sugar_g > 35 && (
            <div className="p-4 bg-rose-50 border border-rose-250 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 text-xs font-bold rounded-2xl flex items-center gap-2">
              <span>⚠️</span>
              <span><strong>Sugar Limit Exceeded:</strong> You have consumed {Math.round(totals.sugar_g)}g of sugar today (Daily Limit: 35g). We suggest swapping sweet items for high-fiber foods.</span>
            </div>
          )}
          {totals.sodium_mg > 1500 && (
            <div className="p-4 bg-rose-50 border border-rose-250 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 text-xs font-bold rounded-2xl flex items-center gap-2">
              <span>⚠️</span>
              <span><strong>Sodium Limit Exceeded:</strong> You have consumed {Math.round(totals.sodium_mg)}mg of sodium today (Daily Limit: 1500mg). We recommend choosing low-sodium whole food options.</span>
            </div>
          )}
        </div>
      )}

      {/* Tracker Card: Calorie Ring & Macro Bars */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row gap-8 items-center justify-around">
        
        {/* SVG Calorie Ring */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative flex items-center justify-center">
            <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
              <circle
                stroke="rgba(229, 231, 235, 0.3)"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                stroke="#10b981"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="transition-all duration-500 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-xl font-black block tracking-tight">
                {totals.calories.toLocaleString()}
              </span>
              <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">
                / {target} kcal
              </span>
            </div>
          </div>
          <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
            {remaining > 0 ? `${remaining.toLocaleString()} kcal remaining` : 'Daily calorie target achieved! 🎉'}
          </p>
        </div>

        {/* Macro progress bars */}
        <div className="w-full max-w-sm space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
            Macronutrients
          </h3>
          
          {/* Protein */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-zinc-600 dark:text-zinc-300">Protein</span>
              <span className="text-zinc-900 dark:text-zinc-100">{Math.round(totals.protein_g)}g / 120g</span>
            </div>
            <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (totals.protein_g / 120) * 100)}%` }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-zinc-600 dark:text-zinc-300">Carbohydrates</span>
              <span className="text-zinc-900 dark:text-zinc-100">{Math.round(totals.carbs_g)}g / 200g</span>
            </div>
            <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (totals.carbs_g / 200) * 100)}%` }}
              />
            </div>
          </div>

          {/* Fats */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-zinc-600 dark:text-zinc-300">Dietary Fats</span>
              <span className="text-zinc-900 dark:text-zinc-100">{Math.round(totals.fat_g)}g / 60g</span>
            </div>
            <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (totals.fat_g / 60) * 100)}%` }}
              />
            </div>
          </div>

          {/* Fiber */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-zinc-600 dark:text-zinc-300">Fiber</span>
              <span className="text-zinc-900 dark:text-zinc-100">{Math.round(totals.fiber_g)}g / 25g</span>
            </div>
            <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (totals.fiber_g / 25) * 100)}%` }}
              />
            </div>
          </div>

          {/* Sugar & Sodium display bars */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-zinc-400">Sugar</p>
              <p className={`text-sm font-extrabold mt-0.5 ${totals.sugar_g > 35 ? 'text-rose-500' : 'text-zinc-800 dark:text-zinc-200'}`}>
                {Math.round(totals.sugar_g)}g / 35g
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-zinc-400">Sodium</p>
              <p className={`text-sm font-extrabold mt-0.5 ${totals.sodium_mg > 1500 ? 'text-rose-500' : 'text-zinc-800 dark:text-zinc-200'}`}>
                {Math.round(totals.sodium_mg)}mg / 1500mg
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Logged Meals List */}
      <div className="space-y-4">
        <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">Today's Meal Log</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.keys(groupedLogs).map((slotKey) => {
            const slotName = slotKey.charAt(0).toUpperCase() + slotKey.slice(1);
            const slotLogs = groupedLogs[slotKey as keyof typeof groupedLogs];
            
            return (
              <div
                key={slotKey}
                className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl p-5 shadow-xs space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-black text-zinc-850 dark:text-zinc-200">{slotName}</h4>
                  <button
                    onClick={() => {
                      setActiveQuickSlot(slotKey);
                      setIsQuickAddOpen(true);
                    }}
                    className="flex items-center gap-0.5 text-xs font-bold text-orange-600 hover:text-orange-750 cursor-pointer"
                  >
                    <Icons.Plus size={12} /> Add
                  </button>
                </div>

                <div className="space-y-2.5">
                  {slotLogs.length > 0 ? (
                    slotLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-850 rounded-xl border border-zinc-150 dark:border-zinc-800/50"
                      >
                        <div className="flex items-center gap-3">
                          {log.recipes?.image_url && (
                            <img
                              src={log.recipes.image_url}
                              alt={log.recipes.name}
                              className="w-10 h-10 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1">
                              {log.recipes?.name || 'Recipe'}
                            </p>
                            <p className="text-[10px] text-zinc-450 dark:text-zinc-400 mt-0.5">
                              {log.servings} serving{log.servings > 1 ? 's' : ''} • {Math.round((log.recipes?.nutrition?.calories || 300) * log.servings)} kcal
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1.5 hover:bg-rose-50 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                        >
                          <Icons.Trash size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-xs text-zinc-400 py-3">No meal logged</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI NUTRITION GAP CARD */}
      <div className="bg-orange-50/20 border border-orange-100/50 dark:bg-orange-950/10 dark:border-orange-900/30 rounded-3xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-extrabold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50">
            <span>🤖</span> Nutrition Insights
          </h3>
          {aiGaps.length === 0 && (
            <button
              onClick={handleAnalyzeGaps}
              disabled={loadingGaps}
              className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-orange-700 disabled:opacity-50 transition-colors flex justify-center items-center cursor-pointer"
            >
              {loadingGaps ? 'Analyzing...' : 'Analyze my week'}
            </button>
          )}
        </div>

        {aiGaps.length > 0 ? (
          <div className="space-y-3">
            {aiGaps.map((gap: any, idx: number) => (
              <div
                key={idx}
                className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-150 dark:border-zinc-800/80 shadow-xs flex gap-3"
              >
                <span className="text-lg">
                  {gap.status?.toLowerCase() === 'deficient' || gap.status?.toLowerCase() === 'low' ? '⚠️' : '✅'}
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-zinc-800 dark:text-zinc-200">{gap.nutrient}</h4>
                    <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded ${
                      gap.status?.toLowerCase() === 'deficient'
                        ? 'bg-rose-100 text-rose-700'
                        : gap.status?.toLowerCase() === 'low'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {gap.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {gap.recommendation}
                  </p>
                </div>
              </div>
            ))}
            <button
              onClick={handleAnalyzeGaps}
              disabled={loadingGaps}
              className="text-xs font-bold text-orange-600 hover:text-orange-705 underline mt-2 block cursor-pointer"
            >
              Re-analyze logs
            </button>
          </div>
        ) : (
          !loadingGaps && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Run the AI analysis to check if you are missing any essential vitamins, fiber, or healthy fats this week.
            </p>
          )
        )}
      </div>

      {/* 7-DAY NUTRITION TREND LINE CHART */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50">7-Day Calorie Intake</h3>
        
        {/* SVG Chart canvas */}
        <div className="relative w-full aspect-[5/2.2] bg-zinc-50/50 dark:bg-zinc-950/20 rounded-2xl border border-zinc-100 dark:border-zinc-850 p-2 overflow-hidden flex items-center justify-center">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full select-none overflow-visible">
            {/* Grid Line target limit */}
            <line
              x1={padding}
              y1={targetLineY}
              x2={chartWidth - padding}
              y2={targetLineY}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />
            {/* Target text */}
            <text
              x={chartWidth - padding * 4}
              y={targetLineY - 6}
              fill="#ef4444"
              className="text-[9px] font-black tracking-wide"
            >
              Goal: {target} kcal
            </text>

            {/* Path representing data points */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data circles */}
            {svgPoints.map((p, idx) => (
              <g key={idx}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  fill="#ffffff"
                  stroke="#10b981"
                  strokeWidth="2.5"
                />
                {/* Tooltip-style hover text */}
                <text
                  x={p.x}
                  y={p.y - 10}
                  textAnchor="middle"
                  fill="currentColor"
                  className="text-[8px] font-bold text-zinc-600 dark:text-zinc-400"
                >
                  {p.cal > 0 ? `${Math.round(p.cal)}` : ''}
                </text>
                {/* X Axis Labels */}
                <text
                  x={p.x}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  fill="currentColor"
                  className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500"
                >
                  {p.date.split('-')[2]}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* QUICK ADD SEARCH DIALOG POPUP */}
      {isQuickAddOpen && activeQuickSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setIsQuickAddOpen(false)} />
          
          <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-2xl p-6 space-y-6 pointer-events-auto mx-4 flex flex-col max-h-[460px]">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-zinc-900 dark:text-zinc-50">
                Quick Add: {activeQuickSlot.charAt(0).toUpperCase() + activeQuickSlot.slice(1)}
              </h3>
              <button
                onClick={() => setIsQuickAddOpen(false)}
                className="text-zinc-400 hover:text-zinc-650 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-zinc-400">
                <Icons.Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food recipe..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-800 text-sm"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[200px]">
              {loadingRecipes ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-1" />
                  <p className="text-[9px] text-zinc-400">Loading...</p>
                </div>
              ) : recipes.length > 0 ? (
                recipes.map((r) => (
                  <div
                    key={r.id}
                    className="p-2.5 bg-zinc-50 dark:bg-zinc-850 hover:bg-orange-50/20 dark:hover:bg-orange-950/10 border border-zinc-150 dark:border-zinc-800/80 rounded-2xl flex items-center justify-between"
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
                        <p className="text-[9px] text-zinc-455 dark:text-zinc-500 mt-0.5">{r.calories || 300} kcal</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleQuickAdd(r.id)}
                      className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-[9px] font-bold shadow-sm hover:bg-orange-700 transition-colors cursor-pointer"
                    >
                      Log
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
