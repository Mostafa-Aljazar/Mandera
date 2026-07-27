"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowUpRight,
  User,
  Phone,
  MapPin,
  MessageCircle,
  Megaphone,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { countryLabel } from "@/lib/countries";
import { bilingualLabel, employeeDisplayName } from "@/lib/bilingualLabel";
import { useOwnerStatusBadge } from "@/hooks/useOwnerStatusBadge";
import { useOwnerPropertyCount } from "@/hooks/queries/useOwners";
import type {
  Owner,
  CompanyEmployee,
} from "@/types/supabase-entities.types";

interface OwnerCardProps {
  owner: Owner;
  employees: CompanyEmployee[];
  companyId?: string;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export default function OwnerCard({
  owner,
  employees,
  companyId,
  isSelected = false,
  onSelect,
}: OwnerCardProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const dateLocale = language === "ar" ? ar : enUS;
  const badge = useOwnerStatusBadge(owner.id, companyId, owner.created_at);
  const { data: propertyCountData } = useOwnerPropertyCount(owner.id);
  const propertyCount = propertyCountData ?? 0;
  const cleanPhone = owner.phone?.replace(/\D/g, "") || "";
  const href = `/company/owners/${owner.id}`;
  const displayName =
    bilingualLabel(owner, language) || owner.name || t("Unnamed");

  const assignedEmp = employees.find(
    (e) => e.id === owner.assigned_employee_id,
  );
  const empName = assignedEmp
    ? employeeDisplayName(assignedEmp, language, assignedEmp.name) ||
      assignedEmp.id
    : t("Unassigned");
  const empAvatarUrl = assignedEmp?.avatar_url || null;

  const createdLabel = owner.created_at
    ? format(new Date(owner.created_at), "dd MMM yyyy", { locale: dateLocale })
    : null;

  return (
    <article
      className={cn(
        "group @container/owner-card relative flex flex-col bg-card shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-hover)] border border-border/60 rounded-2xl h-full overflow-hidden transition-all duration-300",
        isSelected && "border-primary ring-2 ring-primary/15",
      )}
    >
      <div className="relative bg-gradient-to-br from-amber-500/[0.10] via-primary/[0.04] to-transparent px-4 sm:px-5 pt-4 sm:pt-5 pb-4 overflow-hidden">
        <div
          className="absolute inset-0 pattern-grid-lg opacity-20 pointer-events-none"
          aria-hidden
        />
        <div className="top-0 absolute inset-x-0 bg-gradient-to-r from-primary to-primary/40 h-1" />

        {onSelect && (
          <div
            className="top-3.5 end-3.5 z-20 absolute"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect(owner.id)}
              className={cn(
                "data-[state=checked]:bg-primary data-[state=checked]:border-primary bg-background/90 backdrop-blur-sm shadow-sm",
                !isSelected &&
                  "opacity-0 group-hover:opacity-100 transition-opacity",
              )}
            />
          </div>
        )}

        <div className="relative flex items-start gap-3 sm:gap-3.5">
          <div className="flex justify-center items-center bg-primary/15 rounded-2xl ring-2 ring-primary/25 ring-offset-2 ring-offset-transparent w-12 h-12 sm:w-14 sm:h-14 font-outfit font-bold text-primary text-lg sm:text-xl shadow-sm shrink-0 overflow-hidden">
            {owner.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={owner.avatar_url}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0 pe-7 text-start">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <Badge
                variant="outline"
                className={cn(
                  "backdrop-blur-sm text-[10px] px-1.5 py-0 h-5 gap-0.5 font-medium border",
                  badge.color,
                )}
              >
                {badge.icon === "loader" ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : badge.icon === "check" ? (
                  <CheckCircle2 className="w-2.5 h-2.5" />
                ) : (
                  <AlertTriangle className="w-2.5 h-2.5" />
                )}
                {badge.text}
              </Badge>
            </div>

            <Link
              href={href}
              className="block font-semibold text-foreground hover:text-primary text-[15px] truncate transition-colors"
              dir="auto"
            >
              {displayName}
            </Link>
            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-xs min-w-0">
              <span className="flex justify-center items-center bg-background/70 rounded-full w-5 h-5 font-semibold text-[10px] text-primary shrink-0 overflow-hidden">
                {empAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={empAvatarUrl}
                    alt={empName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  empName.charAt(0).toUpperCase()
                )}
              </span>
              <span className="truncate" dir="auto">
                {empName}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 gap-2.5 sm:gap-3 px-4 sm:px-5 py-3.5 sm:py-4">
        <div className="flex justify-between items-center gap-2 bg-muted/35 px-3 py-2.5 border border-border/40 rounded-xl">
          <div className="flex items-center gap-2 min-w-0">
            <Phone className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            <span
              className="font-medium text-foreground text-sm truncate"
              dir="ltr"
            >
              {owner.phone || t("N/A")}
            </span>
          </div>
          {cleanPhone && (
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
          )}
        </div>

        <div className="gap-2 grid grid-cols-2">
          <div className="flex items-center gap-1.5 bg-muted/25 px-2.5 py-2 border border-border/30 rounded-lg text-muted-foreground text-xs min-w-0">
            <MapPin className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            <span className="truncate">
              {countryLabel(owner.country, language) || t("N/A")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/25 px-2.5 py-2 border border-border/30 rounded-lg text-muted-foreground text-xs min-w-0">
            <Building2 className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            <span className="truncate tabular-nums">
              {propertyCount} {t("Properties")}
            </span>
          </div>
        </div>

        {owner.marketing_channel ? (
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs min-w-0">
            <Megaphone className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            <span className="truncate">
              {t("Source")}:{" "}
              <span className="font-medium text-foreground/80">
                {owner.marketing_channel}
              </span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-muted-foreground/50 text-xs">
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t("No marketing source")}</span>
          </div>
        )}

        {createdLabel ? (
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
            <CalendarDays className="w-3.5 h-3.5 text-primary/60 shrink-0" />
            <span className="truncate">
              {t("Created At")}:{" "}
              <span className="font-medium text-foreground/70" dir="ltr">
                {createdLabel}
              </span>
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-auto border-primary/15 border-t bg-primary/[0.06]">
        <Link
          href={href}
          className="group/link flex justify-between items-center gap-2 hover:bg-primary/10 px-4 sm:px-5 py-3 sm:py-3.5 w-full font-semibold text-primary hover:text-primary/90 text-sm transition-colors"
        >
          <span>{t("View Details")}</span>
          <ArrowUpRight className="w-4 h-4 opacity-70 group-hover/link:opacity-100 transition-all rtl:-scale-x-100 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 rtl:group-hover/link:-translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}
