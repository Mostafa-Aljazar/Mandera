"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { format, isBefore } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowUpRight,
  User,
  Phone,
  MapPin,
  MessageCircle,
  Megaphone,
  CalendarClock,
  Building2,
  Key,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientWithRelations as Client } from "@/types/supabase-entities.types";

interface ClientCardProps {
  client: Client;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export default function ClientCard({
  client,
  isSelected = false,
  onSelect,
}: ClientCardProps) {
  const { t } = useTranslation();
  const cleanPhone = client.phone.replace(/\D/g, "");
  const employeeName = client.employee?.name || t("Unassigned");
  const isSale = client.interest_type === "Sale";
  const propertyCount = client.interested_properties?.length ?? 0;
  const href = `/company/clients/${client.id}`;

  let followUp: { isOverdue: boolean; label: string } | null = null;
  if (client.follow_up_date) {
    const dateStr = client.follow_up_date.split(" ")[0];
    const timeStr = client.follow_up_time || "00:00";
    const followUpDateTime = new Date(`${dateStr}T${timeStr}:00`);
    followUp = {
      isOverdue: isBefore(followUpDateTime, new Date()),
      label: `${format(followUpDateTime, "MMM d, yyyy")} · ${client.follow_up_time || "00:00"}`,
    };
  }

  return (
    <article
      className={cn(
        "group relative flex flex-col bg-card shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-hover)] border border-border/60 rounded-2xl h-full overflow-hidden transition-all duration-300",
        isSelected && "border-primary ring-2 ring-primary/15",
      )}
    >
      {/* Top media / identity band */}
      <div
        className={cn(
          "relative px-5 pt-5 pb-4 overflow-hidden",
          isSale
            ? "bg-gradient-to-br from-emerald-500/[0.12] via-emerald-500/[0.04] to-transparent"
            : "bg-gradient-to-br from-sky-500/[0.12] via-sky-500/[0.04] to-transparent",
        )}
      >
        <div
          className="absolute inset-0 pattern-grid-lg opacity-25 pointer-events-none"
          aria-hidden
        />
        <div
          className={cn(
            "top-0 absolute inset-x-0 h-1",
            isSale
              ? "bg-gradient-to-r from-emerald-500 to-emerald-400/40"
              : "bg-gradient-to-r from-sky-500 to-sky-400/40",
          )}
        />

        {onSelect && (
          <div
            className="top-4 end-4 z-20 absolute"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect(client.id)}
              className={cn(
                "data-[state=checked]:bg-primary data-[state=checked]:border-primary bg-background/90 backdrop-blur-sm shadow-sm",
                !isSelected &&
                  "opacity-0 group-hover:opacity-100 transition-opacity",
              )}
            />
          </div>
        )}

        <div className="relative flex items-start gap-3.5">
          <div
            className={cn(
              "flex justify-center items-center rounded-2xl w-14 h-14 font-outfit font-bold text-xl shadow-sm shrink-0 ring-2 ring-offset-2 ring-offset-transparent",
              isSale
                ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/25"
                : "bg-sky-500/15 text-sky-700 ring-sky-500/25",
            )}
          >
            {client.name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0 pe-8">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <Badge
                variant="outline"
                className={cn(
                  "backdrop-blur-sm text-[10px] px-1.5 py-0 h-5 font-medium",
                  isSale
                    ? "text-emerald-700 border-emerald-200/80 bg-emerald-500/10"
                    : "text-sky-700 border-sky-200/80 bg-sky-500/10",
                )}
              >
                {isSale ? (
                  <Home className="w-2.5 h-2.5 me-0.5" />
                ) : (
                  <Key className="w-2.5 h-2.5 me-0.5" />
                )}
                {t(client.interest_type)}
              </Badge>
              {followUp && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className={cn(
                          "backdrop-blur-sm text-[10px] px-1.5 py-0 h-5 gap-0.5 font-medium",
                          followUp.isOverdue
                            ? "bg-red-500/10 text-red-600 border-red-200/80"
                            : "bg-amber-500/10 text-amber-700 border-amber-200/80",
                        )}
                      >
                        <CalendarClock className="w-2.5 h-2.5" />
                        {followUp.isOverdue ? t("Overdue") : t("Upcoming")}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {followUp.label}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            <Link
              href={href}
              className="block font-semibold text-foreground hover:text-primary text-[15px] truncate transition-colors"
            >
              {client.name}
            </Link>
            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-xs">
              <span className="flex justify-center items-center bg-background/70 rounded-full w-5 h-5 font-semibold text-[10px] text-primary shrink-0">
                {employeeName.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">{employeeName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 gap-3 px-5 py-4">
        <div className="flex justify-between items-center gap-2 bg-muted/35 px-3 py-2.5 border border-border/40 rounded-xl">
          <div className="flex items-center gap-2 min-w-0">
            <Phone className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            <span className="font-medium text-foreground text-sm truncate" dir="ltr">
              {client.phone}
            </span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <a
              href={`tel:${cleanPhone}`}
              onClick={(e) => e.stopPropagation()}
              title={t("Call")}
              className="inline-flex justify-center items-center hover:bg-primary/10 rounded-lg w-8 h-8 text-muted-foreground hover:text-primary transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={t("WhatsApp")}
              className="inline-flex justify-center items-center hover:bg-[#25D366]/10 rounded-lg w-8 h-8 text-muted-foreground hover:text-[#25D366] transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="gap-2 grid grid-cols-2">
          <div className="flex items-center gap-1.5 bg-muted/25 px-2.5 py-2 border border-border/30 rounded-lg text-muted-foreground text-xs">
            <MapPin className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            <span className="truncate">{client.country_code}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/25 px-2.5 py-2 border border-border/30 rounded-lg text-muted-foreground text-xs">
            <Building2 className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            <span className="truncate tabular-nums">
              {propertyCount} {t("Properties")}
            </span>
          </div>
        </div>

        {client.marketing_channel ? (
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Megaphone className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            <span className="truncate">
              {t("Source")}:{" "}
              <span className="font-medium text-foreground/80">
                {client.marketing_channel}
              </span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-muted-foreground/50 text-xs">
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t("No marketing source")}</span>
          </div>
        )}
      </div>

      {/* Footer link */}
      <div className="mt-auto bg-muted/20 border-border/40 border-t">
        <Link
          href={href}
          className="group/link flex justify-between items-center gap-2 hover:bg-primary/[0.04] px-5 py-3.5 w-full font-medium text-muted-foreground hover:text-primary text-sm transition-colors"
        >
          <span>{t("View Details")}</span>
          <ArrowUpRight className="w-4 h-4 opacity-60 group-hover/link:opacity-100 transition-all group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
        </Link>
      </div>
    </article>
  );
};
