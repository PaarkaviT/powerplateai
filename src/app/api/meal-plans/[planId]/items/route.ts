import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// POST /meal-plans/:planId/items - Add a recipe to a specific slot in a meal plan
export async function POST(
  req: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const { planId } = await params;
    const body = await req.json();
    const { recipe_id, day_of_week, meal_slot } = body;

    if (!recipe_id || !day_of_week || !meal_slot) {
      return NextResponse.json(
        { error: 'Missing required fields (recipe_id, day_of_week, meal_slot)' },
        { status: 400 }
      );
    }

    // Verify ownership of the target plan
    const { data: plan, error: planError } = await supabase
      .from('meal_plans')
      .select('user_id')
      .eq('id', planId)
      .maybeSingle();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 });
    }

    if (plan.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: This plan does not belong to you' }, { status: 403 });
    }

    // Insert item
    const { data: item, error } = await supabase
      .from('meal_plan_items')
      .insert({
        plan_id: planId,
        recipe_id,
        day_of_week,
        meal_slot,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
