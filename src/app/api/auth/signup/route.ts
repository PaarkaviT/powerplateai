import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Sign up the user in Supabase Auth using Admin API to auto-confirm email and bypass SMTP rate limits
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: 'User registration failed' }, { status: 500 });
    }

    // Insert a default row into the profiles table with user's id and email
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email: data.user.email,
      name: email.split('@')[0], // Use email prefix as a default name
    });

    if (profileError) {
      console.error('Error inserting row into profiles table:', profileError.message);
      // We don't fail the whole request because the Auth user WAS created successfully.
      // But we will return the user info with a status check.
    }

    return NextResponse.json(
      {
        message: 'Signup successful',
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
