"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Archive,
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Home,
  Loader2,
  PauseCircle,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { getRecentPropertyStatusChanges } from "@/actions/propertyApprovals";
import { useLanguage } from "@/contexts/LanguageContext";
import { profileDisplayName } from "@/lib/bilingualLabel";
import { propertyDisplayTitle } from "@/components/company/properties/LinkedPropertyCard";
import { cn } from "@/lib/utils";

function formatActivityDate(
  value: string,
  language: string,
): { date: string; time: string; period: string } {
  const d = new Date(value);
  const hours24 = d.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = format(d, "mm");
  const isPm = hours24 >= 12;
  return {
    // Numeric date stays LTR-safe (Arabic month names broke bidi).
    date: format(d, "dd/MM/yyyy"),
    time: `${hours12}:${minutes}`,
    period:
      language === "ar" ? (isPm ? "مساءً" : "صباحاً") : isPm ? "PM" : "AM",
  };
}

type StatusTone = "emerald" | "sky" | "amber" | "rose" | "violet" | "slate";

function statusTone(status: string): StatusTone {
  const key = status.toLowerCase();
  if (key.includes("rent") || key.includes("leas") || key === "مؤجر") return "sky";
  if (key.includes("sold") || key.includes("مباع")) return "emerald";
  if (key.includes("reserv") || key.includes("محجوز")) return "amber";
  if (key.includes("archiv") || key.includes("مؤرشف")) return "slate";
  if (
    key.includes("unavail") ||
    key.includes("غير متاح") ||
    key.includes("pause")
  ) {
    return "rose";
  }
  if (key.includes("avail") || key.includes("متاح")) return "violet";
  return "slate";
}

function statusIcon(status: string): LucideIcon {
  const key = status.toLowerCase();
  if (key.includes("archiv") || key.includes("مؤرشف")) return Archive;
  if (key.includes("pause") || key.includes("unavail") || key.includes("غير متاح")) {
    return Ban;
  }
  if (key.includes("sold") || key.includes("rent") || key.includes("مباع") || key.includes("مؤجر")) {
    return CheckCircle2;
  }
  if (key.includes("reserv") || key.includes("محجوز")) return PauseCircle;
  return Home;
}

const TONE: Record<StatusTone, { wrap: string; badge: string }> = {
  emerald: {
    wrap: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700",
    badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-800",
  },
  sky: {
    wrap: "bg-sky-500/10 border-sky-500/20 text-sky-700",
    badge: "bg-sky-500/10 border-sky-500/20 text-sky-800",
  },
  amber: {
    wrap: "bg-amber-500/10 border-amber-500/20 text-amber-700",
    badge: "bg-amber-500/10 border-amber-500/20 text-amber-800",
  },
  rose: {
    wrap: "bg-rose-500/10 border-rose-500/20 text-rose-700",
    badge: "bg-rose-500/10 border-rose-500/20 text-rose-800",
  },
  violet: {
    wrap: "bg-violet-500/10 border-violet-500/20 text-violet-700",
    badge: "bg-violet-500/10 border-violet-500/20 text-violet-800",
  },
  slate: {
    wrap: "bg-slate-500/10 border-slate-500/20 text-slate-700",
    badge: "bg-slate-500/10 border-slate-500/20 text-slate-700",
  },
};

export default function RecentStatusChangesWidget({
  companyId,
}: {
  companyId: string;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const { data = [], isLoading } = useQuery({
    queryKey: ["recent-property-status-changes", companyId],
    queryFn: async () => {
      const result = await getRecentPropertyStatusChanges(companyId, 14);
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
  });

  return (
    <div
      id="properties-status-changed"
      className="relative bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden"
    >
      <div
        className="top-0 absolute inset-x-0 bg-gradient-to-b from-emerald-500/[0.07] to-transparent h-20 pointer-events-none"
        aria-hidden
      />
      <div className="relative flex items-start gap-3 p-5 sm:p-6 border-border/60 border-b">
        <span className="flex justify-center items-center bg-emerald-500/10 mt-0.5 border border-emerald-500/20 rounded-xl w-10 h-10 text-emerald-600 shrink-0">
          <Activity className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-outfit font-semibold text-foreground text-base sm:text-lg tracking-tight">
            {t("Properties whose status changed")}
          </h3>
          <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
            {t("Completed property status updates in the last 14 days.")}
          </p>
        </div>
      </div>

      <div className="relative p-3 sm:p-4">
        {isLoading ? (
          <div className="space-y-2.5 px-1 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-3 animate-pulse rounded-xl border border-border/40 bg-muted/20 px-3 py-3"
              >
                <div className="bg-muted rounded-xl w-10 h-10 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="bg-muted rounded w-2/3 h-3" />
                  <div className="bg-muted rounded w-1/2 h-2.5" />
                </div>
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col justify-center items-center px-4 py-10 text-center">
            <span className="flex justify-center items-center bg-muted/50 mb-3 border border-border/50 rounded-2xl w-12 h-12 text-muted-foreground">
              <Activity className="w-5 h-5" />
            </span>
            <p className="font-medium text-foreground text-sm">
              {t("No recent status changes.")}
            </p>
          </div>
        ) : (
          <ul className="space-y-2 max-h-[22rem] sm:max-h-[28rem] overflow-y-auto pe-1">
            {data.map((row) => {
              const title =
                propertyDisplayTitle(
                  {
                    title: row.property_title || "",
                    title_ar: row.property_title_ar,
                  },
                  language,
                ) ||
                row.property_title ||
                "";
              const creatorName =
                profileDisplayName(
                  {
                    name_en: row.created_by_name_en,
                    name_ar: row.created_by_name_ar,
                    name: row.created_by_name,
                  },
                  language,
                ) || row.created_by_name;
              const tone = TONE[statusTone(row.status)];
              const Icon = statusIcon(row.status);
              const statusLabel = t(row.status);
              const { date: dateLabel, time: timeLabel, period: periodLabel } =
                formatActivityDate(row.created_at, language);

              return (
                <li key={row.id}>
                  <Link
                    href={`/company/properties/${row.property_id}`}
                    className="group flex items-start gap-3 rounded-xl border border-border/50 bg-muted/10 px-3 py-3 transition-all hover:bg-primary/[0.07] hover:border-primary/30 hover:shadow-[var(--shadow-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex justify-center items-center border rounded-xl w-10 h-10 shrink-0",
                        tone.wrap,
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </span>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {row.property_code ? (
                            <span className="inline-flex items-center mb-1 bg-background/80 px-1.5 py-0.5 border border-border/60 rounded-md font-mono text-[10px] text-muted-foreground tabular-nums">
                              {row.property_code}
                            </span>
                          ) : null}
                          <p
                            className="font-outfit font-semibold text-foreground group-hover:text-primary text-sm leading-snug line-clamp-2 transition-colors"
                            dir="auto"
                          >
                            {title || row.property_id}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 border rounded-md font-medium text-[11px] whitespace-nowrap shrink-0",
                            tone.badge,
                          )}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-[11px]">
                        {creatorName ? (
                          <span className="inline-flex items-center gap-1 min-w-0">
                            <User className="w-3 h-3 shrink-0 opacity-70" />
                            <span className="truncate" dir="auto">
                              {creatorName}
                            </span>
                          </span>
                        ) : null}
                        <span
                          className="inline-flex items-center gap-1.5 bg-muted/50 px-1.5 py-0.5 border border-border/50 rounded-md text-[11px] tabular-nums"
                          dir="ltr"
                        >
                          <CalendarDays className="w-3 h-3 shrink-0 opacity-70" />
                          <span className="whitespace-nowrap">
                            {dateLabel}
                            <span className="mx-1 opacity-40">·</span>
                            {timeLabel}
                            <span className="ms-1">{periodLabel}</span>
                          </span>
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="mt-3 w-4 h-4 text-muted-foreground/50 group-hover:text-primary rtl:rotate-180 shrink-0 transition-colors" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
