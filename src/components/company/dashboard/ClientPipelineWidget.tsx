"use client";

import React, { useMemo } from "react";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useClientPipeline } from "@/hooks/queries/useClientPipeline";
import { TrendingUp, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import { bilingualLabel } from "@/lib/bilingualLabel";
import { cn } from "@/lib/utils";

export default function ClientPipelineWidget() {
  const { company } = useCompanyAuth();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { data, isLoading } = useClientPipeline(company?.id);

  const pipelineData = useMemo(() => {
    const rows = data?.statuses ?? [];
    return [...rows].sort(
      (a, b) => (a.priority_order ?? 999) - (b.priority_order ?? 999),
    );
  }, [data?.statuses]);
  const totalClients = data?.totalClients ?? 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center bg-card mb-6 border border-border/60 rounded-2xl w-full h-28">
        <Loader2 className="w-5 h-5 text-primary/50 animate-spin" />
      </div>
    );
  }

  if (pipelineData.length === 0) {
    return null;
  }

  return (
    <section className="mb-6 sm:mb-8">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <span className="flex justify-center items-center bg-primary/10 rounded-lg w-8 h-8 text-primary shrink-0">
          <TrendingUp className="w-4 h-4" />
        </span>
        <h2 className="font-outfit font-semibold text-foreground text-base sm:text-lg tracking-tight">
          {t("Client Pipeline")}
        </h2>
      </div>

      <div className="gap-2.5 sm:gap-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {pipelineData.map((status, index) => {
          const percentage =
            totalClients > 0
              ? Math.round((status.count / totalClients) * 100)
              : 0;
          const hasClients = status.count > 0;

          return (
            <div
              key={status.id}
              className={cn(
                "relative flex flex-col bg-card p-3 sm:p-3.5 border rounded-xl min-h-[96px] sm:min-h-[108px] transition-colors",
                hasClients
                  ? "border-primary/25 shadow-[var(--shadow-subtle)]"
                  : "border-border/60",
              )}
            >
              <div
                className={cn(
                  "top-0 inset-x-0 absolute rounded-t-xl h-0.5",
                  hasClients ? "bg-primary" : "bg-muted",
                )}
              />

              <div className="flex justify-between items-start gap-2 mb-2">
                <h3
                  className="font-medium text-[12px] sm:text-[13px] text-foreground leading-snug line-clamp-2"
                  title={bilingualLabel(status, language)}
                >
                  {bilingualLabel(status, language)}
                </h3>
                <span
                  className="bg-muted/70 px-1.5 py-0.5 rounded font-semibold text-[10px] text-muted-foreground tabular-nums shrink-0"
                  dir="ltr"
                >
                  #{status.priority_order || index + 1}
                </span>
              </div>

              <div className="flex flex-1 items-end justify-between gap-2 mt-auto">
                <div>
                  <p
                    className="font-outfit font-bold tabular-nums text-primary text-xl sm:text-2xl leading-none tracking-tight"
                    dir="ltr"
                  >
                    {status.count}
                  </p>
                  <p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground">
                    {t("clients")}
                  </p>
                </div>
                <span
                  className="font-medium text-[11px] text-muted-foreground tabular-nums"
                  dir="ltr"
                >
                  {percentage}%
                </span>
              </div>

              <div className="bg-muted mt-2.5 rounded-full w-full h-1 overflow-hidden">
                <div
                  className="bg-primary rounded-full h-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, percentage)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
