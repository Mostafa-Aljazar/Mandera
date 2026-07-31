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

export async function getAccessContext(): Promise<ActionResult<AccessContext>> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated" };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, company_id")
    .eq("id", user.id)
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
