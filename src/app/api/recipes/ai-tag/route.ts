import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { suggestRecipeTags } from '@/lib/openai';

export async function POST(req: Request) {
  try {
    const { errorResponse } = await requireAuth(req);
    if (errorResponse) {
      return errorResponse;
    }

    const body = await req.json();
    const { name, ingredients, steps } = body;

    if (!name || !ingredients || !steps) {
      return NextResponse.json(
        { error: 'Missing required parameters: name, ingredients, steps' },
        { status: 400 }
      );
    }

    const tagsPrediction = await suggestRecipeTags(
      name,
      ingredients,
      Array.isArray(steps) ? steps : [steps]
    );

    return NextResponse.json(tagsPrediction);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
