'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase.types';

// Lazily construct a single Supabase client for the browser. @supabase/ssr
// stores the session in cookies (not localStorage), so the same auth state
// is readable server-side by middleware.ts and Server Actions.
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

function getSupabaseClient() {
  if (client) return client;

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  return client;
}

const supabase = getSupabaseClient();

export default supabase;
export { supabase };
