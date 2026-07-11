import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// POST /meal-logs - Log a meal that the user ate and update daily nutrition accumulation
export async function POST(req: Request) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const body = await req.json();
    const { recipe_id, meal_slot, servings, logged_at } = body;

    if (!recipe_id || !meal_slot || servings === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields (recipe_id, meal_slot, servings)' },
        { status: 400 }
      );
    }

    // Determine the date part from logged_at (default to current date)
    const logDateStr = logged_at
      ? logged_at.split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Fetch the recipe's nutrition information
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('nutrition, sugar_g, sodium_mg')
      .eq('id', recipe_id)
      .maybeSingle();

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const numServings = Number(servings);
    const nutrition = (recipe.nutrition || {}) as any;
    
    const caloriesToAdd = Number(nutrition.calories || 0) * numServings;
    const proteinToAdd = Number(nutrition.protein_g || 0) * numServings;
    const carbsToAdd = Number(nutrition.carbs_g || 0) * numServings;
    const fatToAdd = Number(nutrition.fat_g || 0) * numServings;
    const fiberToAdd = Number(nutrition.fiber_g || 0) * numServings;
    const sugarToAdd = Number(recipe.sugar_g || 0) * numServings;
    const sodiumToAdd = Number(recipe.sodium_mg || 0) * numServings;

    // 1. Insert meal log
    const { data: log, error: logError } = await supabase
      .from('meal_logs')
      .insert({
        user_id: user.id,
        recipe_id,
        meal_slot,
        servings: numServings,
        logged_at: logged_at || new Date().toISOString(),
      })
      .select('*')
      .single();

    if (logError) {
      return NextResponse.json({ error: logError.message }, { status: 400 });
    }

    // 2. Accumulate in daily_nutrition_logs
    const { data: dailyLog, error: dailyGetError } = await supabase
      .from('daily_nutrition_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', logDateStr)
      .maybeSingle();

    if (dailyLog) {
      // Update existing record
      await supabase
        .from('daily_nutrition_logs')
        .update({
          total_calories: Number(dailyLog.total_calories || 0) + caloriesToAdd,
          total_protein_g: Number(dailyLog.total_protein_g || 0) + proteinToAdd,
          total_carbs_g: Number(dailyLog.total_carbs_g || 0) + carbsToAdd,
          total_fat_g: Number(dailyLog.total_fat_g || 0) + fatToAdd,
          total_fiber_g: Number(dailyLog.total_fiber_g || 0) + fiberToAdd,
          total_sugar_g: Number(dailyLog.total_sugar_g || 0) + sugarToAdd,
          total_sodium_mg: Number(dailyLog.total_sodium_mg || 0) + sodiumToAdd,
        })
        .eq('id', dailyLog.id);
    } else {
      // Create new record
      await supabase.from('daily_nutrition_logs').insert({
        user_id: user.id,
        date: logDateStr,
        total_calories: caloriesToAdd,
        total_protein_g: proteinToAdd,
        total_carbs_g: carbsToAdd,
        total_fat_g: fatToAdd,
        total_fiber_g: fiberToAdd,
        total_sugar_g: sugarToAdd,
        total_sodium_mg: sodiumToAdd,
      });
    }

    return NextResponse.json(log, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
