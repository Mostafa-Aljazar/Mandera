import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase.types';

// Server-only helper: builds a fresh Supabase client per request, wired to
// the incoming request's cookies via next/headers. Used by Server Actions
// and Server Components — never import this from client components.
export async function getServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component — safe to ignore when
            // middleware is also refreshing the session on every request.
          }
        },
      },
    },
  );
}

// Admin client backed by the secret key: bypasses RLS entirely. Only use
// for operations that must cross company/tenant boundaries by design
// (e.g. master-admin actions, or provisioning a profile row right after
// sign-up before RLS would otherwise allow it). Never expose this client
// or its key to the browser.
export function getSupabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
