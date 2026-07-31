"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { countryLabel } from "@/lib/countries";
import { bilingualLabel, employeeDisplayName } from "@/lib/bilingualLabel";
import { canDeleteClientOrOwner, canViewOwnerStatus } from "@/lib/permissions";
import { useOwnerStatusBadge } from "@/hooks/useOwnerStatusBadge";
import { useOwnerPropertyCount, useDeleteOwner } from "@/hooks/queries/useOwners";
import DeleteOwnersDialog from "./DeleteOwnersDialog";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import type { Owner, CompanyEmployee } from "@/types/supabase-entities.types";

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
  const { currentUser } = useCompanyAuth();
  const canDelete = canDeleteClientOrOwner(currentUser?.role);
  const showOwnerStatus = canViewOwnerStatus(currentUser?.role);
  const isRtl = language === "ar";
  const deleteOwnerMutation = useDeleteOwner();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dateLocale = isRtl ? ar : enUS;

  const badge = useOwnerStatusBadge(owner.id, companyId, owner.created_at);

  const { data: propertyCountData } = useOwnerPropertyCount(owner.id);
  const propertyCount = propertyCountData ?? 0;

  const cleanPhone = owner.phone?.replace(/\D/g, "") || "";
  const href = `/company/owners/${owner.id}`;
  const displayName = bilingualLabel(owner, language) || owner.name || t("Unnamed");

  const assignedEmp = employees.find((e) => e.id === owner.assigned_employee_id);
  const empName = assignedEmp
    ? employeeDisplayName(assignedEmp, language, assignedEmp.name) || assignedEmp.id
    : t("Unassigned");
  const empAvatarUrl = assignedEmp?.avatar_url || null;

  const createdLabel = owner.created_at
    ? format(new Date(owner.created_at), "dd MMM yyyy", { locale: dateLocale })
    : null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteOwnerMutation.mutateAsync(owner.id);
      if (result.error) throw new Error(result.error);
      toast.success(t("Owner deleted successfully."));
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(t("Error deleting owner."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DeleteOwnersDialog
        ownerIds={[owner.id]}
        ownerName={displayName}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      <article
        className={cn(
          "group relative flex flex-col bg-card border border-border/60 rounded-2xl overflow-hidden transition-all duration-300",
          "shadow-[0_1px_4px_0_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_0_rgba(0,0,0,0.10)]",
          isSelected && "border-primary/60 ring-2 ring-primary/15 shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]",
        )}
      >
        {/* ── Top accent bar ── */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-primary to-primary/50 shrink-0" />

        {/* ── Header ── */}
        <div className="relative px-4 pt-4 pb-3">
          {/* Selection checkbox — top-start */}
          {onSelect && (
            <div
              className="absolute top-3.5 start-3.5 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onSelect(owner.id)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary bg-background w-4 h-4 border-2 border-muted-foreground/40 shadow-sm"
              />
            </div>
          )}

          {/* Delete button — top-end */}
          {canDelete ? (
            <div
              className="absolute top-3 end-3 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("Delete")}
                onClick={() => setIsDeleteDialogOpen(true)}
                className="w-7 h-7 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 hover:border-destructive/50 text-destructive transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : null}

          {/* Avatar + name — padded so they never touch the absolute controls */}
          <div className={cn("flex items-start gap-3", onSelect ? "ps-6" : "ps-0", canDelete ? "pe-8" : "pe-0")}>
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="flex justify-center items-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 to-primary/20 ring-2 ring-amber-400/30 font-outfit font-bold text-amber-700 dark:text-amber-400 text-lg overflow-hidden shadow-sm">
                {owner.avatar_url ? (
                  <img src={owner.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              {/* Status dot */}
              {showOwnerStatus ? (
                <span
                  className={cn(
                    "absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 rounded-full border-2 border-card",
                    badge.dot,
                  )}
                  title={badge.text}
                />
              ) : null}
            </div>

            {/* Name + employee */}
            <div className="flex-1 min-w-0 pt-0.5">
              {/* Status badge */}
              {showOwnerStatus ? (
              <Badge
                variant="outline"
                className={cn(
                  "mb-1 text-[10px] px-1.5 py-0 h-5 gap-0.5 font-medium border leading-none",
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
              ) : null}

              <Link
                href={href}
                dir="auto"
                className="block font-semibold text-foreground hover:text-primary text-[15px] leading-snug truncate transition-colors"
              >
                {displayName}
              </Link>

              {/* Assigned employee row */}
              <div className="flex items-center gap-1.5 mt-1 min-w-0">
                <span className="flex justify-center items-center w-5 h-5 rounded-full bg-muted text-[9px] font-semibold text-primary shrink-0 overflow-hidden">
                  {empAvatarUrl ? (
                    <img src={empAvatarUrl} alt={empName} className="w-full h-full object-cover" />
                  ) : (
                    empName.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="text-muted-foreground text-[11px] truncate" dir="auto">
                  {empName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="mx-4 h-px bg-border/50" />

        {/* ── Body ── */}
        <div className="flex flex-col flex-1 gap-2 px-4 py-3">

          {/* Phone */}
          <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 border border-border/40 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0" dir="ltr">
              <Phone className="w-3.5 h-3.5 text-primary/60 shrink-0" />
              <span className="text-sm font-medium text-foreground truncate tabular-nums">
                {owner.phone || "—"}
              </span>
            </div>
            {cleanPhone && (
              <div className="flex items-center gap-0.5 shrink-0">
                <a
                  href={`tel:${cleanPhone}`}
                  onClick={(e) => e.stopPropagation()}
                  title={t("Call")}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`https://wa.me/${cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title={t("WhatsApp")}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Country + Properties */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 border border-border/30 px-2.5 py-2 text-xs text-muted-foreground min-w-0">
              <MapPin className="w-3.5 h-3.5 text-rose-400/80 shrink-0" />
              <span className="truncate" dir="auto">
                {countryLabel(owner.country, language) || "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 border border-border/30 px-2.5 py-2 text-xs text-muted-foreground min-w-0">
              <Building2 className="w-3.5 h-3.5 text-sky-400/80 shrink-0" />
              <span className="truncate tabular-nums">
                <span className="font-semibold text-foreground/80">{propertyCount}</span>
                {" "}{t("Properties")}
              </span>
            </div>
          </div>

          {/* Source + Date row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-0.5">
            {owner.marketing_channel ? (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
                <Megaphone className="w-3 h-3 text-violet-400/80 shrink-0" />
                <span className="truncate" dir="auto">
                  <span className="text-muted-foreground/60">{t("Source")}: </span>
                  <span className="font-medium text-foreground/70">{owner.marketing_channel}</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
                <User className="w-3 h-3 shrink-0" />
                <span>{t("No marketing source")}</span>
              </div>
            )}

            {createdLabel && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 ms-auto shrink-0">
                <CalendarDays className="w-3 h-3 shrink-0" />
                <span dir="ltr">{createdLabel}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <Link
          href={href}
          className="group/link flex items-center justify-between gap-2 px-4 py-3 border-t border-border/50 bg-muted/20 hover:bg-primary/5 text-sm font-semibold text-primary hover:text-primary transition-colors"
        >
          <span>{t("View Details")}</span>
          <ArrowUpRight className="w-4 h-4 opacity-60 group-hover/link:opacity-100 transition-all rtl:-scale-x-100 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 rtl:group-hover/link:-translate-x-0.5" />
        </Link>
      </article>
    </>
  );
}
