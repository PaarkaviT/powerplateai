import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// DELETE /api/profile/family/[id] - Remove a family profile
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const { error } = await supabase
      .from('family_profiles')
      .delete()
      .eq('id', id)
      .eq('parent_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
