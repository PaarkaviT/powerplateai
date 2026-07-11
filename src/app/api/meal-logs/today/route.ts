import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// GET /meal-logs/today - Get logged meals and cumulative daily nutrition info for today
export async function GET(req: Request) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const startOfDay = todayStr + 'T00:00:00.000Z';
    const endOfDay = todayStr + 'T23:59:59.999Z';

    // 1. Fetch meals logged today
    const { data: logs, error: logsError } = await supabase
      .from('meal_logs')
      .select('*, recipes(name, nutrition, image_url)')
      .eq('user_id', user.id)
      .gte('logged_at', startOfDay)
      .lte('logged_at', endOfDay);

    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 400 });
    }

    // 2. Fetch daily nutrition totals for today
    const { data: dailyLog, error: dailyLogError } = await supabase
      .from('daily_nutrition_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .maybeSingle();

    if (dailyLogError) {
      return NextResponse.json({ error: dailyLogError.message }, { status: 400 });
    }

    // 3. Fetch user's daily calorie target from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_calorie_target')
      .eq('id', user.id)
      .maybeSingle();

    const calorie_target = profile?.daily_calorie_target || 2000; // default value if profile not setup yet

    const totals = {
      calories: dailyLog?.total_calories || 0,
      protein_g: dailyLog?.total_protein_g || 0,
      carbs_g: dailyLog?.total_carbs_g || 0,
      fat_g: dailyLog?.total_fat_g || 0,
      fiber_g: dailyLog?.total_fiber_g || 0,
      sugar_g: dailyLog?.total_sugar_g || 0,
      sodium_mg: dailyLog?.total_sodium_mg || 0,
    };

    const remaining_calories = Math.max(0, calorie_target - totals.calories);

    return NextResponse.json({
      logs: logs || [],
      totals,
      calorie_target,
      remaining_calories,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
