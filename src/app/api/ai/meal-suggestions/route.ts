import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { openai } from '@/lib/openai';

// POST /ai/meal-suggestions - Generate daily personalized meal recommendations with database checks and cache layers
export async function POST(req: Request) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Check suggestion cache for today's date
    const { data: cacheRow, error: cacheError } = await supabase
      .from('ai_suggestion_cache')
      .select('suggestions')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .maybeSingle();

    if (cacheRow && cacheRow.suggestions) {
      return NextResponse.json(cacheRow.suggestions);
    }

    // 2. Fetch User Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('dietary_preference, allergies, health_goals, daily_calorie_target')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 3. Fetch past 3 days of meal logs to suggest items they haven't eaten recently
    const past3Days = new Date();
    past3Days.setDate(past3Days.getDate() - 3);
    const startDateStr = past3Days.toISOString().split('T')[0];

    const { data: recentLogs, error: logError } = await supabase
      .from('meal_logs')
      .select('recipes(name)')
      .eq('user_id', user.id)
      .gte('logged_at', startDateStr + 'T00:00:00.000Z');

    const recentMealsEaten = (recentLogs || [])
      .map((item: any) => item.recipes?.name)
      .filter(Boolean);

    // 4. Query OpenAI
    const systemPrompt =
      "You are a meal planning assistant. Given a user's dietary preference, allergies, health goals, calorie target, " +
      "and recent meals, suggest 3 recipe ideas they haven't eaten recently. For each, return a JSON object with: " +
      "name, reason, estimated_calories, and meal_slot. " +
      "Format output as a JSON object: { suggestions: [{ name, reason, estimated_calories, meal_slot }] } " +
      "where meal_slot must be one of: breakfast, lunch, dinner, snack.";

    const userContent = `User Profile:
- Dietary Preference: ${profile.dietary_preference}
- Allergies: ${profile.allergies ? profile.allergies.join(', ') : 'None'}
- Health Goals: ${profile.health_goals ? profile.health_goals.join(', ') : 'None'}
- Calorie Target: ${profile.daily_calorie_target || 2000} kcal

Recent meals eaten in last 3 days:
${recentMealsEaten.length > 0 ? recentMealsEaten.join(', ') : 'None logged'}`;

    const response = await openai.chat.completions.create({
      model: 'gemini-2.5-flash',
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

    const parsed = JSON.parse(contentText);
    const suggestionsList: any[] = parsed.suggestions || [];

    // 5. Check recipes table for matching recipe names
    const suggestionsWithMatchedIds = await Promise.all(
      suggestionsList.map(async (s: any) => {
        let recipeId = null;
        if (s.name) {
          const { data: matches } = await supabase
            .from('recipes')
            .select('id')
            .ilike('name', `%${s.name}%`)
            .limit(1);

          if (matches && matches.length > 0) {
            recipeId = matches[0].id;
          }
        }

        return {
          name: s.name,
          reason: s.reason,
          estimated_calories: s.estimated_calories,
          meal_slot: s.meal_slot,
          recipe_id: recipeId,
        };
      })
    );

    // 6. Save in suggestion cache
    const { error: upsertError } = await supabase
      .from('ai_suggestion_cache')
      .upsert({
        user_id: user.id,
        date: todayStr,
        suggestions: suggestionsWithMatchedIds,
      });

    if (upsertError) {
      console.error('Failed to cache AI meal suggestions:', upsertError.message);
    }

    return NextResponse.json(suggestionsWithMatchedIds);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
