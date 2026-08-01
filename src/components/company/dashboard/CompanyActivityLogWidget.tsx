"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Briefcase,
  CalendarDays,
  ChevronRight,
  History,
  Home,
  Loader2,
  User,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { getCompanyActivityLog } from "@/actions/statusHistory";
import { useLanguage } from "@/contexts/LanguageContext";
import { bilingualLabel, profileDisplayName } from "@/lib/bilingualLabel";
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

const ENTITY_META: Record<
  string,
  { labelKey: string; icon: LucideIcon; tone: string }
> = {
  property: {
    labelKey: "Property",
    icon: Home,
    tone: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700",
  },
  client: {
    labelKey: "Client",
    icon: Users,
    tone: "bg-sky-500/10 border-sky-500/20 text-sky-700",
  },
  owner: {
    labelKey: "Owner",
    icon: Briefcase,
    tone: "bg-violet-500/10 border-violet-500/20 text-violet-700",
  },
};

export default function CompanyActivityLogWidget({
  companyId,
}: {
  companyId: string;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const { data = [], isLoading } = useQuery({
    queryKey: ["company-activity-log", companyId],
    queryFn: async () => {
      const result = await getCompanyActivityLog(companyId);
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
  });

  const hrefFor = (row: (typeof data)[number]) => {
    if (!row.entity_id) return null;
    if (row.entity_type === "client") return `/company/clients/${row.entity_id}`;
    if (row.entity_type === "owner") return `/company/owners/${row.entity_id}`;
    return `/company/properties/${row.entity_id}`;
  };

  return (
    <div
      id="company-activity-log"
      className="relative bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden"
    >
      <div
        className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.07] to-transparent h-20 pointer-events-none"
        aria-hidden
      />
      <div className="relative flex items-start gap-3 p-5 sm:p-6 border-b border-border/60">
        <span className="flex justify-center items-center bg-primary/10 mt-0.5 border border-primary/15 rounded-xl w-10 h-10 text-primary shrink-0">
          <History className="w-5 h-5" />
        </span>
        <div>
          <h3 className="font-outfit font-semibold text-base sm:text-lg tracking-tight">
            {t("Full activity log")}
          </h3>
          <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
            {t("Company-wide status and follow-up activity.")}
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
                  <div className="bg-muted rounded w-1/3 h-2.5" />
                  <div className="bg-muted rounded w-2/3 h-3" />
                  <div className="bg-muted rounded w-1/2 h-2.5" />
                </div>
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col justify-center items-center px-4 py-10 text-center">
            <span className="flex justify-center items-center bg-muted/50 mb-3 border border-border/50 rounded-2xl w-12 h-12 text-muted-foreground">
              <History className="w-5 h-5" />
            </span>
            <p className="font-medium text-foreground text-sm">
              {t("No activity yet.")}
            </p>
          </div>
        ) : (
          <ul className="space-y-2 max-h-[28rem] overflow-y-auto pe-1">
            {data.map((row) => {
              const href = hrefFor(row);
              const meta = ENTITY_META[row.entity_type] ?? ENTITY_META.property;
              const Icon = meta.icon;

              const title =
                row.entity_type === "property"
                  ? propertyDisplayTitle(
                      {
                        title: row.entity_label_en || row.entity_label || "",
                        title_ar: row.entity_label_ar,
                      },
                      language,
                    ) ||
                    row.entity_label ||
                    row.entity_id ||
                    t("Record")
                  : bilingualLabel(
                      {
                        name_en: row.entity_label_en,
                        name_ar: row.entity_label_ar,
                        name: row.entity_label,
                      },
                      language,
                    ) ||
                    row.entity_id ||
                    t("Record");

              const statusLabel =
                row.entity_type === "property"
                  ? row.status
                    ? t(row.status)
                    : t("Updated")
                  : bilingualLabel(
                      {
                        name_en: row.status_name_en,
                        name_ar: row.status_name_ar,
                        name: row.status_name || row.status,
                      },
                      language,
                    ) || t("Updated");

              const creatorName = profileDisplayName(
                {
                  name_en: row.created_by_name_en,
                  name_ar: row.created_by_name_ar,
                  name: row.created_by_name,
                },
                language,
              );
              const { date: dateLabel, time: timeLabel, period: periodLabel } =
                formatActivityDate(row.created_at, language);

              const content = (
                <>
                  <span
                    className={cn(
                      "mt-0.5 flex justify-center items-center border rounded-xl w-10 h-10 shrink-0",
                      meta.tone,
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </span>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center bg-background/80 px-2 py-0.5 border border-border/60 rounded-md font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                        {t(meta.labelKey)}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 bg-muted/50 px-1.5 py-0.5 border border-border/50 rounded-md text-muted-foreground text-[10px] tabular-nums"
                        dir="ltr"
                      >
                        <CalendarDays className="w-3 h-3 opacity-70 shrink-0" />
                        <span className="whitespace-nowrap">
                          {dateLabel}
                          <span className="mx-1 opacity-40">·</span>
                          {timeLabel}
                          <span className="ms-1">{periodLabel}</span>
                        </span>
                      </span>
                    </div>

                    <p
                      className="font-outfit font-semibold text-foreground group-hover:text-primary text-sm leading-snug line-clamp-2 transition-colors"
                      dir="auto"
                    >
                      {title}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center bg-primary/10 px-2 py-0.5 border border-primary/15 rounded-md font-medium text-[11px] text-primary">
                        {statusLabel}
                      </span>
                      {creatorName ? (
                        <span className="inline-flex items-center gap-1 min-w-0 text-muted-foreground text-[11px]">
                          <User className="w-3 h-3 shrink-0 opacity-70" />
                          <span className="truncate" dir="auto">
                            {creatorName}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {href ? (
                    <ChevronRight className="mt-3 w-4 h-4 text-muted-foreground/50 group-hover:text-primary rtl:rotate-180 shrink-0 transition-colors" />
                  ) : null}
                </>
              );

              return (
                <li key={`${row.entity_type}-${row.id}`}>
                  {href ? (
                    <Link
                      href={href}
                      className="group flex items-start gap-3 rounded-xl border border-border/50 bg-muted/10 px-3 py-3 transition-all hover:bg-primary/[0.07] hover:border-primary/30 hover:shadow-[var(--shadow-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/10 px-3 py-3">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
