import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// DELETE /meal-logs/:id - Delete a logged meal and subtract its metrics from daily totals
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const { id } = await params;

    // Fetch the log entry to verify ownership and retrieve info for decrementing totals
    const { data: log, error: logFetchError } = await supabase
      .from('meal_logs')
      .select('*, recipes(nutrition, sugar_g, sodium_mg)')
      .eq('id', id)
      .maybeSingle();

    if (logFetchError || !log) {
      return NextResponse.json({ error: 'Meal log not found' }, { status: 404 });
    }

    if (log.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: This log does not belong to you' }, { status: 403 });
    }

    const logDateStr = log.logged_at.split('T')[0];
    const numServings = Number(log.servings || 1);
    const recipeData = log.recipes as any;
    const nutrition = recipeData && recipeData.nutrition ? recipeData.nutrition : {};

    const caloriesToSub = Number(nutrition.calories || 0) * numServings;
    const proteinToSub = Number(nutrition.protein_g || 0) * numServings;
    const carbsToSub = Number(nutrition.carbs_g || 0) * numServings;
    const fatToSub = Number(nutrition.fat_g || 0) * numServings;
    const fiberToSub = Number(nutrition.fiber_g || 0) * numServings;
    const sugarToSub = Number(recipeData?.sugar_g || 0) * numServings;
    const sodiumToSub = Number(recipeData?.sodium_mg || 0) * numServings;

    // 1. Delete the meal log row
    const { error: deleteError } = await supabase
      .from('meal_logs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    // 2. Decrement from daily_nutrition_logs
    const { data: dailyLog } = await supabase
      .from('daily_nutrition_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', logDateStr)
      .maybeSingle();

    if (dailyLog) {
      const newCal = Math.max(0, Number(dailyLog.total_calories || 0) - caloriesToSub);
      const newProt = Math.max(0, Number(dailyLog.total_protein_g || 0) - proteinToSub);
      const newCarb = Math.max(0, Number(dailyLog.total_carbs_g || 0) - carbsToSub);
      const newFat = Math.max(0, Number(dailyLog.total_fat_g || 0) - fatToSub);
      const newFib = Math.max(0, Number(dailyLog.total_fiber_g || 0) - fiberToSub);
      const newSugar = Math.max(0, Number(dailyLog.total_sugar_g || 0) - sugarToSub);
      const newSodium = Math.max(0, Number(dailyLog.total_sodium_mg || 0) - sodiumToSub);

      await supabase
        .from('daily_nutrition_logs')
        .update({
          total_calories: newCal,
          total_protein_g: newProt,
          total_carbs_g: newCarb,
          total_fat_g: newFat,
          total_fiber_g: newFib,
          total_sugar_g: newSugar,
          total_sodium_mg: newSodium,
        })
        .eq('id', dailyLog.id);
    }

    return NextResponse.json({ message: 'Meal log deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
