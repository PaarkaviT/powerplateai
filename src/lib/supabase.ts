import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables: SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

// Service-role client for database queries and admin auth operations.
// Global Authorization header is pinned to the service key so it is never overwritten by user sessions.
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
  },
});

// Fresh isolated client per request for user password sign-in so the shared singleton is never mutated.
export function createAuthClient() {
  return createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
