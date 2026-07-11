import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { openai } from '@/lib/openai';

// POST /ai/nutrition-gap - Analyze recent eating logs to determine nutritional gaps
export async function POST(req: Request) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    // 1. Fetch user's profile details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('dietary_preference, health_goals, daily_calorie_target')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 2. Fetch daily nutrition logs for the past 7 days
    const past7Days = new Date();
    past7Days.setDate(past7Days.getDate() - 7);
    const startDateStr = past7Days.toISOString().split('T')[0];

    const { data: logs, error: logsError } = await supabase
      .from('daily_nutrition_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDateStr);

    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 400 });
    }

    // 3. Construct AI payload
    const systemPrompt =
      "You are a nutrition coach. Given a user's profile (dietary preference, health goals, daily calorie target) " +
      "and their last 7 days of macro intake (calories, protein, carbs, fat, fiber), identify the top 3 nutritional gaps " +
      "and explain them in plain language. Return JSON format: { gaps: [{ nutrient, status, recommendation }] }.";

    const userContent = `User Profile:
- Dietary Preference: ${profile.dietary_preference}
- Health Goals: ${profile.health_goals ? profile.health_goals.join(', ') : 'None'}
- Daily Calorie Target: ${profile.daily_calorie_target || 2000} kcal

Last 7 Days Nutrition Logs:
${JSON.stringify(logs || [])}`;

    // 4. Query OpenAI
    const response = await openai.chat.completions.create({
      model: 'gemini-2.5-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
    });

    const contentText = response.choices[0].message.content;
    if (!contentText) {
      throw new Error('Empty response from OpenAI');
    }

    const data = JSON.parse(contentText);
    return NextResponse.json(data.gaps || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
