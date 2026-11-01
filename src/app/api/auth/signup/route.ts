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

    if (String(password).length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const email = String(rawEmail).trim().toLowerCase();

    // Sign up the user in Supabase Auth using Admin API to auto-confirm email and bypass SMTP rate limits
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    // If the user already exists, try signing them in directly with the provided password
    if (error) {
      if (error.message?.toLowerCase().includes('already')) {
        const authClient = createAuthClient();
        const { data: loginData, error: loginError } = await authClient.auth.signInWithPassword({
          email,
          password,
        });

        if (!loginError && loginData?.session && loginData?.user) {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', loginData.user.id)
            .maybeSingle();

          return NextResponse.json({
            message: 'Signed in to existing account',
            token: loginData.session.access_token,
            user: {
              id: loginData.user.id,
              email: loginData.user.email,
            },
            profile: existingProfile || null,
          });
        }
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in with your password.' },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: 'User registration failed' }, { status: 500 });
    }

    // Upsert a default row into the profiles table with user's id and email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        email: data.user.email,
        name: email.split('@')[0], // Use email prefix as a default name
      })
      .select('*')
      .maybeSingle();

    if (profileError) {
      console.error('Error inserting row into profiles table:', profileError.message);
    }

    // Sign in the newly registered user on an isolated client so they receive a session token right away
    const authClient = createAuthClient();
    const { data: sessionData } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    return NextResponse.json(
      {
        message: 'Signup successful',
        token: sessionData?.session?.access_token || null,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
        profile: profile || null,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
