import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { calculateCalorieTarget, calculateBMI } from '@/lib/nutrition';

// POST /profile/setup - Called during onboarding to initialize user profile
export async function POST(req: Request) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const body = await req.json();
    const {
      name,
      age,
      gender,
      height_cm,
      weight_kg,
      dietary_preference,
      health_goals,
      allergies,
      activity_level,
      region_cuisine,
      diabetic,
      hypertension,
      pregnancy,
    } = body;

    // Validate required fields as per spec: name, age, dietary_preference, health_goals
    if (
      !name ||
      age === undefined ||
      !dietary_preference ||
      !health_goals ||
      !Array.isArray(health_goals)
    ) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields (name, age, dietary_preference, health_goals)' },
        { status: 400 }
      );
    }

    // Calculate calorie target and BMI if optional metrics are provided
    let daily_calorie_target = null;
    let bmi = null;

    if (height_cm && weight_kg) {
      bmi = calculateBMI(Number(height_cm), Number(weight_kg));
    }

    if (gender && height_cm && weight_kg && activity_level) {
      daily_calorie_target = calculateCalorieTarget(
        Number(age),
        gender,
        Number(height_cm),
        Number(weight_kg),
        activity_level
      );
    }

    // Upsert user profile row
    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        name,
        age: Number(age),
        gender,
        height_cm: height_cm ? Number(height_cm) : null,
        weight_kg: weight_kg ? Number(weight_kg) : null,
        bmi,
        region_cuisine: region_cuisine || null,
        dietary_preference,
        health_goals,
        allergies: allergies || [],
        diabetic: !!diabetic,
        hypertension: !!hypertension,
        pregnancy: gender === 'female' ? !!pregnancy : false,
        activity_level,
        daily_calorie_target,
        onboarding_complete: true,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(profile, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

