"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  format,
  isBefore,
  isToday,
  isTomorrow,
} from "date-fns";
import { enUS, ar } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarClock,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { cn } from "@/lib/utils";
import { useUpcomingFollowUps } from "@/hooks/queries/useClients";
import type { ClientWithRelations as Client } from "@/types/supabase-entities.types";

const MAX_VISIBLE = 5;

interface ProcessedClient extends Client {
  followUpDateTime: Date;
  statusName: string;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueTomorrow: boolean;
}

function buildFollowUpDateTime(
  dateStr: string,
  timeStr?: string | null,
): Date {
  const datePart = dateStr.split(" ")[0];
  const time = timeStr || "00:00";
  return new Date(`${datePart}T${time}:00`);
}

const getStatusColorClass = (statusName?: string) => {
  if (!statusName) return "bg-slate-500/15 text-slate-700 border-slate-500/20";
  const colorClasses = [
    "bg-blue-500/15 text-blue-700 border-blue-500/20",
    "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
    "bg-violet-500/15 text-violet-700 border-violet-500/20",
    "bg-amber-500/15 text-amber-700 border-amber-500/20",
    "bg-rose-500/15 text-rose-700 border-rose-500/20",
    "bg-cyan-500/15 text-cyan-700 border-cyan-500/20",
    "bg-indigo-500/15 text-indigo-700 border-indigo-500/20",
    "bg-teal-500/15 text-teal-700 border-teal-500/20",
  ];
  let hash = 0;
  for (let i = 0; i < statusName.length; i++) {
    hash = statusName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorClasses[Math.abs(hash) % colorClasses.length];
};

export default function FollowUpCalendarWidget() {
  const { t, i18n } = useTranslation();
  const { company, currentUser } = useCompanyAuth();
  const router = useRouter();

  const restrictToEmployeeId =
    currentUser?.role !== "company_super_admin" ? currentUser?.id : undefined;

  const {
    data: followUpsData,
    isLoading,
    isError: hasError,
    refetch: refetchFollowUps,
  } = useUpcomingFollowUps(company?.id, restrictToEmployeeId);

  const now = new Date();
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  const followUps: ProcessedClient[] = useMemo(() => {
    return (followUpsData ?? [])
      .map((client) => {
        const followUpDateTime = buildFollowUpDateTime(
          client.follow_up_date as string,
          client.follow_up_time,
        );
        return {
          ...(client as unknown as Client),
          followUpDateTime,
          statusName: client.latest_status_name || t("Unknown"),
          isOverdue: isBefore(followUpDateTime, now),
          isDueToday: isToday(followUpDateTime),
          isDueTomorrow: isTomorrow(followUpDateTime),
        };
      })
      .sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return a.followUpDateTime.getTime() - b.followUpDateTime.getTime();
      });
  }, [followUpsData, t]);

  const stats = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let upcoming = 0;

    for (const client of followUps) {
      if (client.isOverdue) {
        overdue += 1;
      } else if (client.isDueToday) {
        today += 1;
      } else {
        upcoming += 1;
      }
    }

    return { overdue, today, upcoming, total: followUps.length };
  }, [followUps]);

  const visibleFollowUps = followUps.slice(0, MAX_VISIBLE);
  const hasMore = followUps.length > MAX_VISIBLE;

  const fetchFollowUps = () => refetchFollowUps();

  const handleClientClick = (client: ProcessedClient) => {
    router.push(`/company/clients/${client.id}`);
  };

  const getDateLabel = (client: ProcessedClient) => {
    if (client.isOverdue) return t("Overdue");
    if (client.isDueToday) return t("Today");
    if (client.isDueTomorrow) return t("Tomorrow");
    return format(client.followUpDateTime, "EEE, MMM d", { locale: dateLocale });
  };

  return (
    <div className="relative flex flex-col bg-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl h-full overflow-hidden">
      <div
        className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.07] to-transparent h-20 pointer-events-none"
        aria-hidden
      />

      <div className="relative flex sm:flex-row flex-col sm:justify-between sm:items-start gap-3 p-5 border-border/60 border-b">
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex justify-center items-center bg-primary/10 mt-0.5 border border-primary/20 rounded-xl w-10 h-10 text-primary shrink-0">
            <CalendarClock className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-outfit font-semibold text-foreground text-base sm:text-lg tracking-tight">
              {t("Upcoming Follow-ups")}
            </h3>
            <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
              {t("company_follow_ups_desc")}
            </p>
          </div>
        </div>
        {!isLoading && stats.total > 0 ? (
          <span className="inline-flex self-start items-center bg-muted/70 px-2.5 py-1 rounded-full font-medium text-muted-foreground text-xs tabular-nums">
            {stats.total} {t("Scheduled")}
          </span>
        ) : null}
      </div>

      {!isLoading && !hasError && stats.total > 0 ? (
        <div className="relative gap-2 grid grid-cols-3 px-5 pt-4">
          <div
            className={cn(
              "px-3 py-2.5 border rounded-xl text-center",
              stats.overdue > 0
                ? "bg-destructive/5 border-destructive/20"
                : "bg-muted/30 border-border/50",
            )}
          >
            <p
              className={cn(
                "font-outfit font-bold text-lg tabular-nums",
                stats.overdue > 0 ? "text-destructive" : "text-foreground",
              )}
              dir="ltr"
            >
              {stats.overdue}
            </p>
            <p className="mt-0.5 font-medium text-muted-foreground text-[11px]">
              {t("Overdue")}
            </p>
          </div>
          <div className="bg-amber-500/5 px-3 py-2.5 border border-amber-500/20 rounded-xl text-center">
            <p
              className="font-outfit font-bold text-amber-700 text-lg tabular-nums"
              dir="ltr"
            >
              {stats.today}
            </p>
            <p className="mt-0.5 font-medium text-muted-foreground text-[11px]">
              {t("Today")}
            </p>
          </div>
          <div className="bg-primary/5 px-3 py-2.5 border border-primary/15 rounded-xl text-center">
            <p
              className="font-outfit font-bold text-primary text-lg tabular-nums"
              dir="ltr"
            >
              {stats.upcoming}
            </p>
            <p className="mt-0.5 font-medium text-muted-foreground text-[11px]">
              {t("Upcoming")}
            </p>
          </div>
        </div>
      ) : null}

      <div className="relative flex-1 px-3 sm:px-4 py-3 min-h-[220px] max-h-[360px] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border border-border/40 rounded-xl"
              >
                <Skeleton className="rounded-lg w-12 h-12 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-2/3 h-4" />
                  <Skeleton className="w-1/2 h-3" />
                </div>
              </div>
            ))}
          </div>
        ) : hasError ? (
          <div className="flex flex-col justify-center items-center px-4 py-10 text-center">
            <AlertCircle className="mb-3 w-10 h-10 text-destructive/70" />
            <p className="mb-4 font-medium text-destructive text-sm">
              {t("Failed to load follow-ups.")}
            </p>
            <Button
              onClick={fetchFollowUps}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t("Retry")}
            </Button>
          </div>
        ) : followUps.length === 0 ? (
          <div className="flex flex-col justify-center items-center bg-muted/20 px-4 py-10 border border-border border-dashed rounded-xl h-full text-center">
            <CalendarClock className="opacity-35 mb-3 w-10 h-10 text-muted-foreground" />
            <p className="font-medium text-foreground text-sm">
              {t("No scheduled follow-ups")}
            </p>
            <p className="mx-auto mt-1.5 max-w-[220px] text-muted-foreground text-xs leading-relaxed">
              {t(
                "Set follow-up dates when updating client statuses to see them here.",
              )}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {visibleFollowUps.map((client) => {
              const statusColor = getStatusColorClass(client.statusName);
              const dateLabel = getDateLabel(client);

              return (
                <li key={client.id}>
                  <button
                    type="button"
                    onClick={() => handleClientClick(client)}
                    className={cn(
                      "group relative flex items-center gap-3 hover:bg-muted/40 p-3 border border-border/50 hover:border-primary/20 rounded-xl w-full text-start transition-all",
                      client.isOverdue &&
                        "bg-destructive/[0.03] hover:bg-destructive/[0.06] border-destructive/20",
                      client.isDueToday &&
                        !client.isOverdue &&
                        "bg-amber-500/[0.04] border-amber-500/20",
                    )}
                  >
                    <div
                      className={cn(
                        "flex flex-col justify-center items-center border rounded-xl w-12 h-12 shrink-0",
                        client.isOverdue
                          ? "bg-destructive/10 border-destructive/20 text-destructive"
                          : client.isDueToday
                            ? "bg-amber-500/10 border-amber-500/25 text-amber-700"
                            : "bg-primary/5 border-primary/15 text-primary",
                      )}
                    >
                      <span
                        className="font-outfit font-bold text-base leading-none tabular-nums"
                        dir="ltr"
                      >
                        {format(client.followUpDateTime, "d")}
                      </span>
                      <span className="mt-0.5 font-medium text-[10px] uppercase leading-none">
                        {format(client.followUpDateTime, "MMM", {
                          locale: dateLocale,
                        })}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-semibold text-foreground group-hover:text-primary text-sm truncate transition-colors">
                          {client.name}
                        </p>
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 border rounded-md font-medium text-[10px] whitespace-nowrap shrink-0",
                            statusColor,
                          )}
                        >
                          {client.statusName}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-muted-foreground text-xs">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 font-medium",
                            client.isOverdue
                              ? "text-destructive"
                              : client.isDueToday
                                ? "text-amber-700"
                                : "text-muted-foreground",
                          )}
                        >
                          <Clock className="w-3 h-3 shrink-0" />
                          <span dir="ltr">{dateLabel}</span>
                          {client.follow_up_time ? (
                            <span dir="ltr">· {client.follow_up_time}</span>
                          ) : null}
                        </span>

                        {currentUser?.role === "company_super_admin" &&
                        client.employee ? (
                          <span className="text-muted-foreground/80 truncate">
                            {t("Agent:")} {client.employee.name}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!isLoading && !hasError && followUps.length > 0 ? (
        <div className="relative px-4 sm:px-5 py-3 border-border/60 border-t">
          <Link
            href="/company/clients"
            className="group inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary/80 text-sm transition-colors"
          >
            {hasMore
              ? t("View all follow-ups", { count: followUps.length })
              : t("View all clients")}
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
          </Link>
        </div>
      ) : null}
    </div>
  );
};
