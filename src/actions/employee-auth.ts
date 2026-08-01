"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

/**
 * Login helper: whether this email belongs to a disabled company employee.
 * Used when Auth rejects the login (e.g. banned) so the UI can show a clear message.
 */
export async function isCompanyEmployeeLoginDisabled(
  email: string,
): Promise<ActionResult<boolean>> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { data: false };

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("employees")
    .select("disabled")
    .ilike("email", normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[employees] isCompanyEmployeeLoginDisabled:", error.message);
    return { data: false };
  }
  return { data: Boolean(data?.disabled) };
}
