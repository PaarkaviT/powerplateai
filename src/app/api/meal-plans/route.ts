import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// GET /meal-plans - Fetch all meal plans for the user
export async function GET(req: Request) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const { data: plans, error } = await supabase
      .from('meal_plans')
      .select('*, meal_plan_items(*, recipes(*))')
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(plans || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /meal-plans - Create a new meal plan
export async function POST(req: Request) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const body = await req.json();
    const { name, start_date, end_date } = body;

    if (!name || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields (name, start_date, end_date)' },
        { status: 400 }
      );
    }

    const { data: plan, error } = await supabase
      .from('meal_plans')
      .insert({
        user_id: user.id,
        name,
        start_date,
        end_date,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(plan, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
