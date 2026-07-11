import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// DELETE /meal-plans/:planId/items/:itemId - Remove a recipe from a meal plan
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ planId: string; itemId: string }> }
) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const { planId, itemId } = await params;

    // Verify ownership of the plan
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

    // Delete item
    const { error } = await supabase
      .from('meal_plan_items')
      .delete()
      .eq('id', itemId)
      .eq('plan_id', planId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: 'Recipe removed from plan successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
