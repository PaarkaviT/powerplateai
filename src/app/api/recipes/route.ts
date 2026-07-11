import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { autoTagRecipe } from '@/lib/openai';

// GET /recipes - Fetch recipes with filters and pagination
export async function GET(req: Request) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const { searchParams } = new URL(req.url);
    const dietary_tag = searchParams.get('dietary_tag');
    const max_calories = searchParams.get('max_calories');
    const search = searchParams.get('search');
    
    // New Advanced Filters
    const sugar_g = searchParams.get('sugar_g');
    const sodium_mg = searchParams.get('sodium_mg');
    const min_protein_g = searchParams.get('min_protein_g');
    const max_cook_time = searchParams.get('max_cook_time');
    const difficulty = searchParams.get('difficulty');
    const audience_type = searchParams.get('audience_type');
    const meal_category = searchParams.get('meal_category');
    const includeQuery = searchParams.get('include_ingredients');
    const excludeQuery = searchParams.get('exclude_ingredients');

    const includeIngredients = includeQuery
      ? includeQuery.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];
    const excludeIngredients = excludeQuery
      ? excludeQuery.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];

    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Fetch user's profile to get allergen lists, target calories, and cuisine preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('allergies, dietary_preference, daily_calorie_target, region_cuisine')
      .eq('id', user.id)
      .maybeSingle();

    const userAllergies: string[] = profile?.allergies || [];

    // Query recipes (include description and ingredients to check for allergens)
    let query = supabase
      .from('recipes')
      .select('id, name, description, image_url, dietary_tag, prep_time_mins, nutrition, tags, glycemic_index, ingredients, sugar_g, sodium_mg, difficulty, audience_type, cost_to_make, regional_names, seasonal_months');

    if (dietary_tag) {
      query = query.eq('dietary_tag', dietary_tag);
    }

    if (max_calories) {
      query = query.lte('nutrition->calories', parseInt(max_calories, 10));
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Advanced Postgres Filters
    if (difficulty) {
      query = query.eq('difficulty', difficulty.toLowerCase());
    }

    if (audience_type) {
      query = query.eq('audience_type', audience_type.toLowerCase());
    }

    if (sugar_g) {
      query = query.lte('sugar_g', parseFloat(sugar_g));
    }

    if (sodium_mg) {
      query = query.lte('sodium_mg', parseFloat(sodium_mg));
    }

    if (max_cook_time) {
      query = query.lte('prep_time_mins', parseInt(max_cook_time, 10));
    }

    if (min_protein_g) {
      query = query.gte('nutrition->protein_g', parseFloat(min_protein_g));
    }

    if (meal_category) {
      query = query.contains('tags', [meal_category.toLowerCase()]);
    }

    // Apply pagination range
    query = query.range(offset, offset + limit - 1);

    const { data: recipes, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Filter out recipes that match user allergies (case-insensitive check)
    let filteredRecipes = recipes || [];

    // Apply explicit exclude ingredients filter
    if (excludeIngredients.length > 0) {
      filteredRecipes = filteredRecipes.filter((r: any) => {
        const textElements: string[] = [
          (r.name || '').toLowerCase(),
          (r.description || '').toLowerCase(),
          ...(r.tags || []).map((t: string) => t.toLowerCase())
        ];
        if (r.ingredients && Array.isArray(r.ingredients)) {
          r.ingredients.forEach((ing: any) => {
            if (ing.name) textElements.push(ing.name.toLowerCase());
          });
        }
        return !excludeIngredients.some((ex) => 
          textElements.some((text) => text.includes(ex))
        );
      });
    }

    // Apply explicit include ingredients filter
    if (includeIngredients.length > 0) {
      filteredRecipes = filteredRecipes.filter((r: any) => {
        const ingNames = (r.ingredients || []).map((ing: any) => (ing.name || '').toLowerCase());
        const textElements = [
          (r.name || '').toLowerCase(),
          (r.description || '').toLowerCase(),
          ...ingNames
        ];
        return includeIngredients.some((inc) => 
          textElements.some((text) => text.includes(inc))
        );
      });
    }

    if (userAllergies.length > 0) {
      filteredRecipes = filteredRecipes.filter((r: any) => {
        const textElements: string[] = [];
        if (r.name) textElements.push(r.name.toLowerCase());
        if (r.description) textElements.push(r.description.toLowerCase());
        if (r.tags && Array.isArray(r.tags)) {
          r.tags.forEach((t: string) => textElements.push(t.toLowerCase()));
        }
        if (r.ingredients && Array.isArray(r.ingredients)) {
          r.ingredients.forEach((ing: any) => {
            if (ing.name) textElements.push(ing.name.toLowerCase());
          });
        }

        // Return true only if no allergen matches any word in the recipe details
        return !userAllergies.some((allergy) => {
          const cleanAllergen = allergy.trim().toLowerCase();
          if (!cleanAllergen) return false;
          return textElements.some((text) => text.includes(cleanAllergen));
        });
      });
    }

    const currentMonth = new Date().getMonth() + 1; // 1-12

    // Format output and compute Body-Match % score
    const formattedRecipes = filteredRecipes.map((r) => {
      const calories = r.nutrition && typeof r.nutrition === 'object'
        ? Number((r.nutrition as any).calories || 0)
        : 0;
      const protein_g = r.nutrition && typeof r.nutrition === 'object'
        ? Number((r.nutrition as any).protein_g || 0)
        : 0;
      const carbs_g = r.nutrition && typeof r.nutrition === 'object'
        ? Number((r.nutrition as any).carbs_g || 0)
        : 0;
      const fat_g = r.nutrition && typeof r.nutrition === 'object'
        ? Number((r.nutrition as any).fat_g || 0)
        : 0;
      const fiber_g = r.nutrition && typeof r.nutrition === 'object'
        ? Number((r.nutrition as any).fiber_g || 0)
        : 0;

      // 1. Calculate Body Match % (0 - 100)
      let match_score = 0;

      // Dietary preference match (50% max)
      if (profile?.dietary_preference) {
        const userDiet = profile.dietary_preference.toLowerCase();
        const recipeDiet = r.dietary_tag ? r.dietary_tag.toLowerCase() : '';
        
        if (userDiet === 'nonvegetarian') {
          match_score += 50;
        } else if (userDiet === 'vegetarian') {
          if (['vegetarian', 'vegan', 'jain'].includes(recipeDiet)) {
            match_score += 50;
          }
        } else if (userDiet === 'vegan') {
          if (recipeDiet === 'vegan') {
            match_score += 50;
          }
        } else if (userDiet === 'jain') {
          if (recipeDiet === 'jain') {
            match_score += 50;
          }
        } else if (recipeDiet === userDiet) {
          match_score += 50;
        }
      } else {
        match_score += 50;
      }

      // Calorie alignment match (30% max)
      const targetDailyCal = profile?.daily_calorie_target || 2000;
      const mealTarget = targetDailyCal / 3;
      if (calories > 0) {
        const diff = Math.abs(calories - mealTarget);
        if (diff <= 150) {
          match_score += 30;
        } else if (diff <= 300) {
          match_score += 15;
        }
      } else {
        match_score += 30;
      }

      // Cuisine match (20% max)
      if (profile?.region_cuisine) {
        const userCuisine = profile.region_cuisine.toLowerCase().replace('-', ' ');
        const isCuisineMatched = 
          (r.tags && Array.isArray(r.tags) && r.tags.some((t: string) => t.toLowerCase().includes(userCuisine))) ||
          (r.name && r.name.toLowerCase().includes(userCuisine)) ||
          (r.description && r.description.toLowerCase().includes(userCuisine));
        
        if (isCuisineMatched) {
          match_score += 20;
        }
      } else {
        match_score += 20;
      }

      // 2. Format name with regional parentheses if cuisine matches user region
      let finalName = r.name;
      if (profile?.region_cuisine && r.regional_names && typeof r.regional_names === 'object') {
        const regName = (r.regional_names as any)[profile.region_cuisine];
        if (regName) {
          finalName = `${r.name} (${regName})`;
        }
      }

      // 3. Seasonal check
      const isSeasonal = r.seasonal_months && Array.isArray(r.seasonal_months) && r.seasonal_months.includes(currentMonth);

      return {
        id: r.id,
        name: finalName,
        image_url: r.image_url,
        dietary_tag: r.dietary_tag,
        prep_time_mins: r.prep_time_mins,
        calories,
        protein_g,
        carbs_g,
        fat_g,
        fiber_g,
        tags: r.tags || [],
        glycemic_index: r.glycemic_index,
        match_score,
        is_seasonal: !!isSeasonal,
        sugar_g: r.sugar_g || 0,
        sodium_mg: r.sodium_mg || 0,
        difficulty: r.difficulty || 'medium',
        cost_to_make: r.cost_to_make || 0,
      };
    });

    // Sort by match_score descending so highest matches appear first!
    formattedRecipes.sort((a, b) => b.match_score - a.match_score);

    return NextResponse.json(formattedRecipes);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /recipes - Insert a new recipe
export async function POST(req: Request) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const body = await req.json();
    const {
      name,
      description,
      image_url,
      ingredients,
      steps,
      nutrition,
      prep_time_mins,
      servings,
      dietary_tag,
      tags,
      glycemic_index,
      sugar_g,
      sodium_mg,
      difficulty,
      audience_type,
      cost_to_make,
      regional_names,
      seasonal_months,
      bmi_range,
      gender_note,
    } = body;

    if (!name || !ingredients || !steps || !nutrition) {
      return NextResponse.json(
        { error: 'Missing required fields (name, ingredients, steps, nutrition)' },
        { status: 400 }
      );
    }

    const { data: recipe, error } = await supabase
      .from('recipes')
      .insert({
        name,
        description,
        image_url: image_url || null,
        ingredients,
        steps,
        nutrition,
        prep_time_mins: prep_time_mins ? Number(prep_time_mins) : 30,
        servings: servings ? Number(servings) : 1,
        dietary_tag: dietary_tag || 'nonvegetarian',
        tags: tags || [],
        glycemic_index: glycemic_index || 'medium',
        sugar_g: sugar_g ? Number(sugar_g) : 0,
        sodium_mg: sodium_mg ? Number(sodium_mg) : 0,
        difficulty: difficulty || 'medium',
        audience_type: audience_type || 'adults',
        cost_to_make: cost_to_make ? Number(cost_to_make) : 4.50,
        regional_names: regional_names || {},
        seasonal_months: seasonal_months || [],
        bmi_range: bmi_range || 'all',
        gender_note: gender_note || 'general',
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Call OpenAI auto-tagging in background only if tags are empty
    if (!tags || tags.length === 0) {
      autoTagRecipe(recipe.id, name, ingredients, steps);
    }

    return NextResponse.json(recipe, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
