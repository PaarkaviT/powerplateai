import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { openai } from '@/lib/openai';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const body = await req.json();
    const { concept } = body;

    if (!concept) {
      return NextResponse.json(
        { error: 'Missing required parameter: concept' },
        { status: 400 }
      );
    }

    const systemPrompt =
      "You are a professional chef and nutritionist. Given a recipe concept or name, generate a complete recipe object in JSON format. " +
      "The JSON response MUST exactly match this structure:\n" +
      "{\n" +
      "  \"name\": \"Name of the recipe\",\n" +
      "  \"description\": \"Brief 1-2 sentence description\",\n" +
      "  \"ingredients\": [ { \"name\": \"ingredient name\", \"quantity\": 100, \"unit\": \"g\" } ],\n" +
      "  \"steps\": [ \"Step 1 description\", \"Step 2 description\" ],\n" +
      "  \"calories\": 350,\n" +
      "  \"protein_g\": 20,\n" +
      "  \"carbs_g\": 40,\n" +
      "  \"fat_g\": 12,\n" +
      "  \"sugar_g\": 5,\n" +
      "  \"sodium_mg\": 300,\n" +
      "  \"dietary_tag\": \"vegetarian\",\n" +
      "  \"tags\": [\"breakfast\", \"high-protein\"],\n" +
      "  \"glycemic_index\": \"low\",\n" +
      "  \"nutrition_summary\": \"One-sentence nutrition summary.\",\n" +
      "  \"bmi_range\": \"all\",\n" +
      "  \"gender_note\": \"general\"\n" +
      "}\n\n" +
      "Rule for dietary_tag: choose one of: nonvegetarian, vegetarian, vegan, jain, halal, keto, gluten-free.\n" +
      "Rule for glycemic_index: choose one of: low, medium, high.\n" +
      "Rule for bmi_range: choose one of: underweight, normal, overweight, obese, all.\n" +
      "Rule for gender_note: choose one of: general, pregnancy, male.\n" +
      "Ensure all numeric nutrition values are realistic and sensible.";

    const response = await openai.chat.completions.create({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a recipe for: ${concept}` },
      ],
      response_format: { type: 'json_object' },
    });

    const contentText = response.choices[0].message.content;
    if (!contentText) {
      throw new Error('Empty response received from Gemini');
    }

    const recipeData = JSON.parse(contentText);

    // Auto-generate high-quality food photography image url using Pollinations AI
    const sanitizedName = recipeData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const imageUrl = `https://image.pollinations.ai/p/delicious_${sanitizedName}_plated_high_resolution_food_photography?width=600&height=400&nologo=true`;

    const nutritionObj = {
      calories: Number(recipeData.calories || 350),
      protein_g: Number(recipeData.protein_g || 20),
      carbs_g: Number(recipeData.carbs_g || 40),
      fat_g: Number(recipeData.fat_g || 12),
      fiber_g: Number(recipeData.fiber_g || 4),
    };

    // Insert new recipe into database via service role client (bypasses RLS limits)
    const { data: newRecipe, error: insertError } = await supabase
      .from('recipes')
      .insert({
        name: recipeData.name,
        description: recipeData.description,
        image_url: imageUrl,
        ingredients: recipeData.ingredients,
        steps: recipeData.steps,
        nutrition: nutritionObj,
        prep_time_mins: 25,
        servings: 2,
        dietary_tag: recipeData.dietary_tag || 'nonvegetarian',
        tags: recipeData.tags || [],
        glycemic_index: recipeData.glycemic_index || 'medium',
        sugar_g: Number(recipeData.sugar_g || 5),
        sodium_mg: Number(recipeData.sodium_mg || 300),
        bmi_range: recipeData.bmi_range || 'all',
        gender_note: recipeData.gender_note || 'general',
      })
      .select('id')
      .single();

    if (insertError || !newRecipe) {
      throw new Error(`Failed to insert generated recipe: ${insertError?.message || 'unknown error'}`);
    }

    const recipeId = newRecipe.id;

    // Update today's suggestion cache with the new recipe ID
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: cacheRow } = await supabase
      .from('ai_suggestion_cache')
      .select('suggestions')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .maybeSingle();

    if (cacheRow && cacheRow.suggestions && Array.isArray(cacheRow.suggestions)) {
      const updatedSuggestions = cacheRow.suggestions.map((s: any) => {
        // Match suggestions by close name match or fuzzy concept comparison
        if (s.name.toLowerCase().includes(concept.toLowerCase()) || concept.toLowerCase().includes(s.name.toLowerCase())) {
          return {
            ...s,
            recipe_id: recipeId,
            image_url: imageUrl,
          };
        }
        return s;
      });

      await supabase
        .from('ai_suggestion_cache')
        .upsert({
          user_id: user.id,
          date: todayStr,
          suggestions: updatedSuggestions,
        });
    }

    return NextResponse.json({ recipe_id: recipeId });
  } catch (err: any) {
    console.error('Error generating and saving recipe concept:', err.message || err);
    return NextResponse.json(
      { error: err.message || 'Failed to auto-generate and save recipe' },
      { status: 500 }
    );
  }
}
