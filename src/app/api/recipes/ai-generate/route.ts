import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { openai } from '@/lib/openai';

export async function POST(req: Request) {
  try {
    const { errorResponse } = await requireAuth(req);
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
      model: 'gemini-2.5-pro',
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

    return NextResponse.json({
      ...recipeData,
      image_url: imageUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate recipe' },
      { status: 500 }
    );
  }
}
