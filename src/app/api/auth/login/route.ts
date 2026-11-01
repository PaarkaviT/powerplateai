import { NextResponse } from 'next/server';
import { supabase, createAuthClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawEmail = body.email;
    const password = body.password;

    if (!rawEmail || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const email = String(rawEmail).trim().toLowerCase();
    const authClient = createAuthClient();

    // Sign in the user using an isolated Supabase Auth client so the singleton service client is never mutated
    let { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    // If login fails because the user hasn't registered yet, check if the email exists.
    // If the email is not registered yet and password >= 6 chars, auto-provision the account so first-time users can sign in directly.
    if (error) {
      if (password.length >= 6) {
        const { data: created, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (!createError && created?.user) {
          await supabase.from('profiles').upsert({
            id: created.user.id,
            email: created.user.email,
            name: email.split('@')[0],
          });

          const retryAuth = createAuthClient();
          const retry = await retryAuth.auth.signInWithPassword({ email, password });
          data = retry.data;
          error = retry.error;
        } else if (createError && createError.message?.toLowerCase().includes('already')) {
          return NextResponse.json(
            { error: 'Incorrect password for this account. Please try again.' },
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters long.' },
          { status: 400 }
        );
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!data?.session || !data?.user) {
      return NextResponse.json({ error: 'Session could not be established' }, { status: 500 });
    }

    // Fetch or initialize the user's profile row so the client can route immediately
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!profile) {
      const { data: newProfile } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: data.user.email,
          name: email.split('@')[0],
        })
        .select('*')
        .maybeSingle();
      profile = newProfile || null;
    }

    return NextResponse.json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      profile,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
