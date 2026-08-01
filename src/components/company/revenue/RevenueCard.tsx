"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DirhamIcon, formatAedAmount } from "@/components/ui/dirham-icon";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  revenueAgentAvatarUrl,
  revenueAgentLabel,
  revenueClientAvatarUrl,
  revenueClientLabel,
} from "@/lib/revenueLabels";
import { ChevronLeft } from "lucide-react";
import type { RevenueWithRelations } from "@/types/supabase-entities.types";

interface RevenueCardProps {
  revenue: RevenueWithRelations;
}

function statusTone(status: string) {
  if (status === "approved") {
    return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  }
  if (status === "rejected") {
    return "bg-rose-500/10 text-rose-700 border-rose-500/20";
  }
  return "bg-amber-500/10 text-amber-700 border-amber-500/20";
}

export default function RevenueCard({ revenue }: RevenueCardProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === "ar" ? ar : enUS;
  const commission = Number(revenue.commission_value) || 0;
  const dealStatus = revenue.approval_status || "pending";
  const agentName = revenueAgentLabel(revenue, language);
  const clientName = revenueClientLabel(revenue, language);
  const agentAvatar = revenueAgentAvatarUrl(revenue);
  const clientAvatar = revenueClientAvatarUrl(revenue);

  return (
    <Link
      href={`/company/revenue/${revenue.id}`}
      className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      <article className="flex flex-col bg-card border border-border/60 group-hover:border-primary/25 rounded-2xl h-full overflow-hidden shadow-[0_1px_4px_0_rgba(0,0,0,0.06)] group-hover:shadow-[0_4px_16px_0_rgba(0,0,0,0.10)] transition-all duration-300">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-primary/40" />

        <div className="flex flex-col flex-1 gap-4 p-4 sm:p-5">
          <div className="flex justify-between items-start gap-3">
            <p
              className="font-mono font-semibold text-foreground text-sm tracking-wide truncate"
              dir="ltr"
            >
              {revenue.property_code}
            </p>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 text-[10px] px-2 py-0 h-5 font-medium",
                statusTone(dealStatus),
              )}
            >
              {t(dealStatus)}
            </Badge>
          </div>

          <p
            className="inline-flex items-center gap-1.5 font-outfit font-bold text-primary text-2xl tabular-nums"
            dir="ltr"
          >
            <DirhamIcon className="w-5 h-5" title={t("AED")} />
            {formatAedAmount(commission)}
          </p>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="w-9 h-9 shrink-0 rounded-xl">
                {agentAvatar ? (
                  <AvatarImage src={agentAvatar} alt={agentName} />
                ) : null}
                <AvatarFallback className="rounded-xl bg-primary/10 font-semibold text-primary text-xs">
                  {(agentName || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
                  {t("Agent")}
                </p>
                <p className="font-medium text-foreground text-sm truncate">
                  {agentName || t("Unassigned")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="w-9 h-9 shrink-0 rounded-xl">
                {clientAvatar ? (
                  <AvatarImage src={clientAvatar} alt={clientName} />
                ) : null}
                <AvatarFallback className="rounded-xl bg-muted font-semibold text-muted-foreground text-xs">
                  {(clientName || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
                  {t("Client")}
                </p>
                <p className="font-medium text-foreground text-sm truncate">
                  {clientName || t("Unnamed")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center gap-2 mt-auto pt-3 border-t border-border/50">
            <span className="text-muted-foreground text-xs tabular-nums">
              {format(new Date(revenue.deal_completion_date), "d MMM yyyy", {
                locale: dateLocale,
              })}
            </span>
            <span className="inline-flex items-center gap-0.5 font-medium text-primary text-xs">
              {t("View details")}
              <ChevronLeft className="opacity-70 w-3.5 h-3.5 rotate-180 rtl:rotate-0" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
