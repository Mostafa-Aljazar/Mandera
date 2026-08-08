"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import type { UserRole } from "@/types/supabase-entities.types";
import { isCompanyRole } from "@/lib/permissions";

export type AccessContext = {
  userId: string;
  role: UserRole;
  companyId: string | null;
};

type ActionResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

/**
 * Every company action funnels through here, so its cost is paid on each one.
 *
 * getClaims() verifies the access token's ES256 signature against the project
 * JWKS (cached in-process), so it is a local check — ~1ms versus the ~210ms
 * network round-trip getUser() makes to the auth server every single call.
 * It is NOT getSession(), which performs no verification at all; the signature
 * check here is what makes the claims trustworthy. Session *refresh* is the
 * middleware's job, once per request.
 */
export async function getAccessContext(): Promise<ActionResult<AccessContext>> {
  const supabase = await getServerSupabase();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (authError || !userId) return { error: "Not authenticated" };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, company_id")
    .eq("id", userId)
    .single();

  if (error || !profile) return { error: error?.message || "Profile not found" };

  return {
    data: {
      userId: profile.id,
      role: profile.role as UserRole,
      companyId: profile.company_id,
    },
  };
}

export async function assertCompanyMember(
  companyId: string,
): Promise<ActionResult<AccessContext>> {
  const access = await getAccessContext();
  if (access.error || !access.data) return { error: access.error || "Not authenticated" };

  if (access.data.role === "master_admin") return { data: access.data };

  if (!isCompanyRole(access.data.role) || access.data.companyId !== companyId) {
    return { error: "Access denied" };
  }

  return { data: access.data };
}
