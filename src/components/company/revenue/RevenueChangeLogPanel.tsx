"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  employeeDisplayName,
  profileDisplayName,
} from "@/lib/bilingualLabel";
import { cn } from "@/lib/utils";
import { useRevenueChangeLog } from "@/hooks/queries/useRevenues";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DirhamIcon, formatAedAmount } from "@/components/ui/dirham-icon";
import type { RevenueChangeLog } from "@/types/supabase-entities.types";

const PAGE_SIZE = 5;

function actorLabel(row: RevenueChangeLog, language: string): string {
  const profile = row.changed_by_profile;
  return (
    employeeDisplayName(profile?.employee, language) ||
    profileDisplayName(profile, language) ||
    row.changed_by_name ||
    ""
  );
}

function actorAvatarUrl(row: RevenueChangeLog): string | null {
  return (
    row.changed_by_profile?.employee?.avatar_url ||
    row.changed_by_profile?.avatar_url ||
    null
  );
}

function actionBadgeClass(action: string) {
  if (action.includes("reject") || action === "commission_unpaid") {
    return "bg-rose-500/10 text-rose-700 border-rose-500/20";
  }
  if (action.includes("approv") || action === "commission_paid") {
    return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  }
  if (action === "created") {
    return "bg-sky-500/10 text-sky-700 border-sky-500/20";
  }
  if (action === "updated") {
    return "bg-amber-500/10 text-amber-800 border-amber-500/20";
  }
  return "bg-primary/10 text-primary border-primary/20";
}

function CommissionDelta({
  from,
  to,
  label,
}: {
  from: number;
  to: number;
  label: string;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className="inline-flex items-center gap-0.5 rounded-md bg-muted/80 px-1.5 py-0.5 text-muted-foreground tabular-nums line-through"
        dir="ltr"
      >
        <DirhamIcon className="w-3 h-3" />
        {formatAedAmount(from)}
      </span>
      <ArrowLeft
        className="w-3.5 h-3.5 text-primary/70 shrink-0 rtl:rotate-0 rotate-180"
        aria-hidden
      />
      <span
        className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary tabular-nums"
        dir="ltr"
      >
        <DirhamIcon className="w-3 h-3" />
        {formatAedAmount(to)}
      </span>
    </span>
  );
}

function ChangeDetail({
  row,
  t,
}: {
  row: RevenueChangeLog;
  t: (key: string) => string;
}) {
  const oldCommission = row.old_data?.commission_value;
  const newCommission = row.new_data?.commission_value;
  if (
    row.action === "updated" &&
    oldCommission != null &&
    newCommission != null &&
    Number(oldCommission) !== Number(newCommission)
  ) {
    return (
      <CommissionDelta
        from={Number(oldCommission)}
        to={Number(newCommission)}
        label={t("Commission")}
      />
    );
  }

  if (row.action === "commission_paid") {
    return (
      <span className="text-muted-foreground text-xs">{t("Marked as paid")}</span>
    );
  }
  if (row.action === "commission_unpaid") {
    return (
      <span className="text-muted-foreground text-xs">
        {t("Marked as unpaid")}
      </span>
    );
  }

  if (row.note?.trim()) {
    return (
      <span className="text-muted-foreground text-xs leading-relaxed">
        {row.note.trim()}
      </span>
    );
  }

  return null;
}

export default function RevenueChangeLogPanel({
  companyId,
  revenueId,
}: {
  companyId: string;
  revenueId?: string;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === "ar" ? ar : enUS;
  const { data = [], isLoading } = useRevenueChangeLog(companyId, revenueId);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [companyId, revenueId, data.length]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, data.length);
  const rows = useMemo(
    () => data.slice(pageStart, pageEnd),
    [data, pageStart, pageEnd],
  );

  return (
    <section className="bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
      <div className="relative flex items-start gap-3 p-5 border-b border-border/60">
        <div
          className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] to-transparent pointer-events-none"
          aria-hidden
        />
        <span className="relative flex justify-center items-center bg-primary/10 border border-primary/15 rounded-xl w-10 h-10 text-primary shrink-0">
          <History className="w-5 h-5" />
        </span>
        <div className="relative min-w-0">
          <h2 className="font-outfit font-semibold text-foreground">
            {t("Financial amendments log")}
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            {t("Audit trail of revenue and commission changes.")}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex justify-center items-center bg-muted rounded-2xl w-12 h-12 text-muted-foreground">
              <History className="w-5 h-5" />
            </span>
            <p className="text-muted-foreground text-sm">
              {t("No financial amendments yet.")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <ul className="space-y-2.5">
              {rows.map((row) => {
                const name = actorLabel(row, language) || t("Unknown");
                const avatar = actorAvatarUrl(row);
                const propertyCode =
                  !revenueId && row.new_data?.property_code
                    ? String(row.new_data.property_code)
                    : null;
                const initial = name.trim().charAt(0) || "?";
                const detailHref = `/company/revenue/${row.revenue_id}`;
                const isClickable = !revenueId && Boolean(row.revenue_id);

                const content = (
                  <>
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 border rounded-full font-medium text-[10px]",
                          actionBadgeClass(row.action),
                        )}
                      >
                        {t(row.action)}
                      </span>
                      <time
                        className="inline-flex items-center gap-1.5 text-muted-foreground text-xs"
                        dateTime={row.created_at}
                      >
                        <CalendarDays className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                        <span>
                          {format(new Date(row.created_at), "d MMMM yyyy", {
                            locale: dateLocale,
                          })}
                        </span>
                        <span className="opacity-40" aria-hidden>
                          ·
                        </span>
                        <span className="tabular-nums" dir="ltr">
                          {format(new Date(row.created_at), "h:mm a", {
                            locale: dateLocale,
                          })}
                        </span>
                      </time>
                    </div>

                    <div className="flex items-start gap-2.5 mt-3 min-w-0">
                      <Avatar className="rounded-xl w-9 h-9 shrink-0 ring-2 ring-background shadow-sm">
                        {avatar ? (
                          <AvatarImage
                            src={avatar}
                            alt={name}
                            className="object-cover"
                          />
                        ) : null}
                        <AvatarFallback className="rounded-xl bg-primary/10 font-semibold text-primary text-xs">
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {name}
                        </p>
                        <ChangeDetail row={row} t={t} />
                      </div>
                      {isClickable ? (
                        <ChevronLeft className="mt-1 w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 rotate-180 rtl:rotate-0 transition-colors" />
                      ) : null}
                    </div>

                    {propertyCode ? (
                      <p
                        className="mt-2 font-mono text-[11px] text-muted-foreground truncate"
                        dir="ltr"
                      >
                        {propertyCode}
                      </p>
                    ) : null}
                  </>
                );

                return (
                  <li key={row.id}>
                    {isClickable ? (
                      <Link
                        href={detailHref}
                        className="group block bg-muted/20 hover:bg-muted/35 hover:border-primary/25 p-3 sm:p-3.5 border border-border/50 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="bg-muted/20 p-3 sm:p-3.5 border border-border/50 rounded-xl">
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {totalPages > 1 ? (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-1">
                <p className="order-2 sm:order-1 text-muted-foreground text-xs tabular-nums">
                  {t("Showing {{from}}–{{to}} of {{total}}", {
                    from: pageStart + 1,
                    to: pageEnd,
                    total: data.length,
                  })}
                </p>
                <div className="order-1 sm:order-2 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-xl w-9 h-9"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label={t("Previous")}
                  >
                    <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                  </Button>
                  <span className="px-2 font-medium text-foreground text-xs tabular-nums">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-xl w-9 h-9"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    aria-label={t("Next")}
                  >
                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
