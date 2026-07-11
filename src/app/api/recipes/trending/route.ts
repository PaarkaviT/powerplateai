import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// GET /recipes/trending - Fetch top 10 most-logged recipes
export async function GET(req: Request) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    // Fetch all logs with joined recipe information
    const { data: logs, error } = await supabase
      .from('meal_logs')
      .select('recipe_id, recipes(id, name, image_url, nutrition)');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!logs || logs.length === 0) {
      return NextResponse.json([]);
    }

    // Aggregate counts and map recipe details in JavaScript for robustness
    const countsMap: Record<string, { count: number; recipe: any }> = {};

    for (const log of logs) {
      if (!log.recipe_id || !log.recipes) {
        continue;
      }
      
      const recipeId = log.recipe_id;
      const recipeData = log.recipes as any;

      if (!countsMap[recipeId]) {
        const calories = recipeData.nutrition && typeof recipeData.nutrition === 'object'
          ? recipeData.nutrition.calories
          : null;

        countsMap[recipeId] = {
          count: 0,
          recipe: {
            id: recipeData.id || recipeId,
            name: recipeData.name,
            image_url: recipeData.image_url,
            calories,
          },
        };
      }
      countsMap[recipeId].count += 1;
    }

    // Sort by count descending and take the top 10
    const trendingRecipes = Object.values(countsMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((item) => item.recipe);

    return NextResponse.json(trendingRecipes);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
