import { useTranslation } from "react-i18next";
import { useOwnerLatestStatus } from "@/hooks/queries/useOwners";

interface OwnerStatusBadge {
  /** Badge chip classes (bg / text / border). */
  color: string;
  /** Avatar status-dot classes. */
  dot: string;
  text: string;
  icon: "loader" | "check" | "warning" | "help";
  isOld: boolean;
}

const FRESH_DAYS = 30;

const BADGE = {
  updated: {
    color:
      "bg-teal-500/10 text-teal-700 border-teal-500/25 dark:text-teal-400",
    dot: "bg-teal-500 ring-4 ring-teal-500/25 shadow-[0_0_0_1px_rgba(20,184,166,0.35)]",
    icon: "check" as const,
    isOld: false,
  },
  outdated: {
    color:
      "bg-amber-500/10 text-amber-800 border-amber-500/30 dark:text-amber-400",
    dot: "bg-amber-500 ring-4 ring-amber-500/30 shadow-[0_0_0_1px_rgba(245,158,11,0.4)]",
    icon: "warning" as const,
    isOld: true,
  },
  loading: {
    color: "bg-slate-500/10 text-slate-600 border-slate-500/20",
    dot: "bg-slate-400 ring-4 ring-slate-400/20 animate-pulse",
    icon: "loader" as const,
    isOld: false,
  },
  unknown: {
    color: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    dot: "bg-slate-400 ring-4 ring-slate-400/15",
    icon: "help" as const,
    isOld: true,
  },
} as const;

function daysSince(date: Date, now = new Date()): number {
  const ms = now.getTime() - date.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function freshnessBadge(
  date: Date,
  t: (key: string) => string,
): OwnerStatusBadge {
  const tone =
    daysSince(date) <= FRESH_DAYS ? BADGE.updated : BADGE.outdated;
  return {
    ...tone,
    text: tone.isOld ? t("Outdated") : t("Updated"),
  };
}

/**
 * Owner freshness badge based on the latest Status & History update.
 * Rule: Updated if last status (or owner created_at fallback) is within 30 days;
 * otherwise Outdated. New owners with no status history use created_at so they
 * are not marked Outdated immediately.
 */
export const useOwnerStatusBadge = (
  ownerId?: string,
  companyId?: string,
  fallbackDate?: string | null,
): OwnerStatusBadge => {
  const { t } = useTranslation();
  const { data: latest, isLoading, isError } = useOwnerLatestStatus(
    ownerId,
    companyId,
  );

  if (isLoading) {
    return { ...BADGE.loading, text: t("Checking...") };
  }

  if (isError) {
    return { ...BADGE.unknown, text: t("Unknown") };
  }

  if (latest?.created_at) {
    return freshnessBadge(new Date(latest.created_at), t);
  }

  if (fallbackDate) {
    return freshnessBadge(new Date(fallbackDate), t);
  }

  return { ...BADGE.updated, text: t("Updated") };
};
