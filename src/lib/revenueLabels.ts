import {
  bilingualLabel,
  employeeDisplayName,
  profileDisplayName,
} from "@/lib/bilingualLabel";
import type { RevenueWithRelations } from "@/types/supabase-entities.types";

/** Closing-agent label for the current UI language. */
export function revenueAgentLabel(
  revenue: RevenueWithRelations,
  language: string,
): string {
  const profile = revenue.employee_profile;
  return (
    employeeDisplayName(profile?.employee, language, profile?.name) ||
    profileDisplayName(profile, language) ||
    revenue.employee_name ||
    ""
  );
}

/** Client label for the current UI language. */
export function revenueClientLabel(
  revenue: RevenueWithRelations,
  language: string,
): string {
  return bilingualLabel(revenue.client, language) || revenue.client_name || "";
}

/** Owner label for the current UI language (live owner join, snapshot fallback). */
export function revenueOwnerLabel(
  revenue: RevenueWithRelations,
  language: string,
): string {
  return bilingualLabel(revenue.owner, language) || revenue.owner_name || "";
}

export function revenueAgentAvatarUrl(
  revenue: RevenueWithRelations,
): string | null {
  return revenue.employee_profile?.employee?.avatar_url ?? null;
}

export function revenueClientAvatarUrl(
  revenue: RevenueWithRelations,
): string | null {
  return revenue.client?.avatar_url ?? null;
}
