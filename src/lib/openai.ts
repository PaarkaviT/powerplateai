import OpenAI from 'openai';
import { supabase } from './supabase';

const openaiKey = process.env.OPENAI_API_KEY;

export const openai = new OpenAI({
  apiKey: openaiKey || 'dummy-key-for-build-validation',
});

export async function autoTagRecipe(
  recipeId: string,
  name: string,
  ingredients: any[],
  steps: string[]
) {
  try {
    const systemPrompt = 
      "You are a nutrition expert. Given a recipe's ingredients and cooking method, return a JSON object with: " +
      "dietary_tags (array of strings: choose from vegan, vegetarian, keto, gluten-free, high-protein, low-calorie), " +
      "a one-sentence nutrition_summary, and a glycemic_index_estimate (low, medium, or high).";

    const userContent = `Recipe Name: ${name}
Ingredients: ${JSON.stringify(ingredients)}
Steps: ${steps.join('\n')}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // fast, cheap, and handles JSON mode perfectly
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
    });

    const contentText = response.choices[0].message.content;
    if (!contentText) {
      throw new Error('Empty response received from OpenAI');
    }

    const data = JSON.parse(contentText);
    
    // Extract tags
    const dietaryTags: string[] = data.dietary_tags || [];
    // The recipes table has "dietary_tag" (a single text field) and "tags" (a text array).
    // We map the first matched tag to dietary_tag, and keep the whole list in tags.
    const primaryDietaryTag = dietaryTags.length > 0 ? dietaryTags[0] : 'omnivore';
    const glycemicIndex = (data.glycemic_index_estimate || 'medium').toLowerCase();

    const { error } = await supabase
      .from('recipes')
      .update({
        dietary_tag: primaryDietaryTag,
        tags: dietaryTags,
        nutrition_summary: data.nutrition_summary,
        glycemic_index: ['low', 'medium', 'high'].includes(glycemicIndex) ? glycemicIndex : 'medium',
      })
      .eq('id', recipeId);

    if (error) {
      console.error('Failed to save auto-generated AI tags in Supabase:', error.message);
    }
  } catch (err: any) {
    console.error('Error inside autoTagRecipe service:', err.message || err);
  }
}

export async function suggestRecipeTags(
  name: string,
  ingredients: any[],
  steps: string[]
): Promise<{
  dietary_tag: string;
  tags: string[];
  glycemic_index: 'low' | 'medium' | 'high';
  nutrition_summary: string;
  bmi_range: string;
  gender_note: string;
}> {
  const systemPrompt = 
    "You are a nutrition expert. Given a recipe's name, ingredients, and steps, return a JSON object with: " +
    "1. dietary_tag (choose one: omnivore, vegetarian, vegan, jain, halal, keto, gluten-free)\n" +
    "2. tags (array of strings, e.g. ['breakfast', 'high-protein', 'quick'])\n" +
    "3. glycemic_index (choose one: low, medium, high)\n" +
    "4. nutrition_summary (one-sentence overview)\n" +
    "5. bmi_range (choose one: underweight, normal, overweight, obese, all)\n" +
    "6. gender_note (choose one: general, pregnancy, male)";

  const userContent = `Recipe Name: ${name}
Ingredients: ${JSON.stringify(ingredients)}
Steps: ${steps.join('\n')}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
  });

  const contentText = response.choices[0].message.content;
  if (!contentText) {
    throw new Error('Empty response received from OpenAI');
  }
  return JSON.parse(contentText) as any;
}

