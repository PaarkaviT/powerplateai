import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { calculateCalorieTarget, calculateBMI } from '@/lib/nutrition';

// GET /profile - Fetch the logged-in user's profile
export async function GET(req: Request) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// PATCH /profile - Update one or more fields in the user's profile and recalculate calories
export async function PATCH(req: Request) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const body = await req.json();

    // Fetch existing profile to get current values (necessary for calorie calculation if some fields are not in the update body)
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchError || !existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Merge the existing values with the updates to get the complete profile state
    const merged = {
      age: body.age !== undefined ? body.age : existingProfile.age,
      gender: body.gender !== undefined ? body.gender : existingProfile.gender,
      height_cm: body.height_cm !== undefined ? body.height_cm : existingProfile.height_cm,
      weight_kg: body.weight_kg !== undefined ? body.weight_kg : existingProfile.weight_kg,
      activity_level: body.activity_level !== undefined ? body.activity_level : existingProfile.activity_level,
    };

    let daily_calorie_target = existingProfile.daily_calorie_target;
    let bmi = existingProfile.bmi;

    // Recalculate BMI if height or weight changed
    if (merged.height_cm !== null && merged.weight_kg !== null) {
      bmi = calculateBMI(Number(merged.height_cm), Number(merged.weight_kg));
    }

    // Recalculate target if all required fields are present
    if (
      merged.age !== null &&
      merged.gender !== null &&
      merged.height_cm !== null &&
      merged.weight_kg !== null &&
      merged.activity_level !== null
    ) {
      daily_calorie_target = calculateCalorieTarget(
        Number(merged.age),
        merged.gender,
        Number(merged.height_cm),
        Number(merged.weight_kg),
        merged.activity_level
      );
    }

    // If gender is updated and is not female, reset pregnancy to false
    const extraUpdates: any = {};
    if (body.gender !== undefined && body.gender !== 'female') {
      extraUpdates.pregnancy = false;
    }

    // Update in database
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        ...body,
        ...extraUpdates,
        bmi,
        daily_calorie_target,
      })
      .eq('id', user.id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json(updatedProfile);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

