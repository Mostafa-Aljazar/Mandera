"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  User,
  UserRound,
  CalendarDays,
} from "lucide-react";
import type { Revenue } from "@/types/supabase-entities.types";

interface RevenueCardProps {
  revenue: Revenue;
}

export default function RevenueCard({ revenue }: RevenueCardProps) {
  const { t } = useTranslation();
  const commission = Number(revenue.commission_value) || 0;
  const location = [revenue.emirate, revenue.area_district]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="group relative flex flex-col bg-card shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-hover)] border border-border/60 rounded-2xl h-full overflow-hidden transition-all duration-300">
      <div className="relative bg-gradient-to-br from-primary/[0.12] via-primary/[0.04] to-transparent px-5 pt-5 pb-4 overflow-hidden">
        <div
          className="absolute inset-0 pattern-grid-lg opacity-25 pointer-events-none"
          aria-hidden
        />
        <div className="top-0 absolute inset-x-0 bg-gradient-to-r from-primary to-primary/40 h-1" />

        <div className="relative flex justify-between items-start gap-3">
          <div className="min-w-0">
            <Badge
              variant="outline"
              className="bg-emerald-500/10 mb-2 border-emerald-500/25 text-emerald-700 text-[10px] px-1.5 py-0 h-5 font-medium"
            >
              {t("Deal Completed")}
            </Badge>
            <p
              className="font-mono font-semibold text-primary text-sm tracking-wide"
              dir="ltr"
            >
              {revenue.property_code}
            </p>
            {location ? (
              <p className="flex items-center gap-1.5 mt-1.5 text-muted-foreground text-xs truncate">
                <MapPin className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                <span className="truncate">{location}</span>
              </p>
            ) : null}
          </div>

          <div className="text-end shrink-0">
            <p className="font-medium text-muted-foreground text-[10px] uppercase tracking-wider">
              {t("Commission")}
            </p>
            <p
              className="mt-0.5 font-outfit font-bold text-primary text-lg tabular-nums"
              dir="ltr"
            >
              AED {commission.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 gap-2.5 px-5 py-4">
        <div className="flex items-center gap-2 bg-muted/35 px-3 py-2.5 border border-border/40 rounded-xl">
          <div className="flex justify-center items-center bg-primary/10 rounded-full w-8 h-8 font-semibold text-primary text-xs shrink-0">
            {(revenue.employee_name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-muted-foreground text-[10px] uppercase tracking-wider">
              {t("Agent")}
            </p>
            <p className="font-medium text-foreground text-sm truncate">
              {revenue.employee_name || t("Unassigned")}
            </p>
          </div>
        </div>

        <div className="gap-2 grid grid-cols-1">
          <div className="flex items-center gap-1.5 bg-muted/25 px-2.5 py-2 border border-border/30 rounded-lg text-xs">
            <User className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            <span className="text-muted-foreground shrink-0">{t("Client")}:</span>
            {revenue.client_id ? (
              <Link
                href={`/company/clients/${revenue.client_id}`}
                className="font-medium text-foreground hover:text-primary truncate transition-colors"
              >
                {revenue.client_name}
              </Link>
            ) : (
              <span className="font-medium text-foreground truncate">
                {revenue.client_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 bg-muted/25 px-2.5 py-2 border border-border/30 rounded-lg text-xs">
            <UserRound className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            <span className="text-muted-foreground shrink-0">{t("Owner")}:</span>
            <span className="font-medium text-foreground truncate">
              {revenue.owner_name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-auto pt-1 text-muted-foreground text-xs">
          <CalendarDays className="w-3.5 h-3.5 text-primary/70 shrink-0" />
          <span>
            {format(new Date(revenue.deal_completion_date), "MMM d, yyyy")}
          </span>
        </div>
      </div>
    </article>
  );
};
