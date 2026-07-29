"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { format, isBefore } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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
  CalendarDays,
  Building2,
  Key,
  Home,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { bilingualLabel, employeeDisplayName } from "@/lib/bilingualLabel";
import { countryLabel } from "@/lib/countries";
import { useBulkDeleteClients } from "@/hooks/queries/useClients";
import DeleteClientsDialog from "./DeleteClientsDialog";
import type {
  ClientWithRelations as Client,
  CompanyEmployee,
} from "@/types/supabase-entities.types";

interface ClientCardProps {
  client: Client;
  employees?: CompanyEmployee[];
  companyId?: string;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export default function ClientCard({
  client,
  employees = [],
  companyId,
  isSelected = false,
  onSelect,
}: ClientCardProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const dateLocale = isRtl ? ar : enUS;
  const cleanPhone = (client.phone || "").replace(/\D/g, "");
  const bulkDeleteClientsMutation = useBulkDeleteClients();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const assignedEmp =
    employees.find((e) => e.id === client.employee_id) || null;
  const employeeName = assignedEmp
    ? employeeDisplayName(assignedEmp, language, assignedEmp.name) ||
      assignedEmp.id
    : client.employee?.name
      ? employeeDisplayName(null, language, client.employee.name)
      : t("Unassigned");
  const employeeAvatarUrl = assignedEmp?.avatar_url || null;
  const isSale = client.interest_type === "Sale";
  const propertyCount = client.interested_properties?.length ?? 0;
  const href = `/company/clients/${client.id}`;
  const displayName =
    bilingualLabel(
      {
        name_en: client.name_en,
        name_ar: client.name_ar,
        name: client.name,
      },
      language,
    ) || t("Unnamed");

  const createdLabel = client.created_at
    ? format(new Date(client.created_at), "dd MMM yyyy", { locale: dateLocale })
    : null;

  let followUp: { isOverdue: boolean; label: string } | null = null;
  if (client.follow_up_date) {
    const dateStr = client.follow_up_date.split(" ")[0];
    const timeStr = client.follow_up_time || "00:00";
    const followUpDateTime = new Date(`${dateStr}T${timeStr}:00`);
    followUp = {
      isOverdue: isBefore(followUpDateTime, new Date()),
      label: `${format(followUpDateTime, "MMM d, yyyy", { locale: dateLocale })} · ${client.follow_up_time || "00:00"}`,
    };
  }

  const handleDelete = async () => {
    if (!companyId) return;
    setIsDeleting(true);
    try {
      const result = await bulkDeleteClientsMutation.mutateAsync({
        clientIds: [client.id],
        companyId,
      });
      if (result.error) throw new Error(result.error);
      toast.success(t("Client deleted successfully."));
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(t("Error deleting client."));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DeleteClientsDialog
        clientIds={[client.id]}
        clientName={displayName}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      <article
        className={cn(
          "group relative flex flex-col bg-card border border-border/60 rounded-2xl overflow-hidden transition-all duration-300",
          "shadow-[0_1px_4px_0_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_0_rgba(0,0,0,0.10)]",
          isSelected &&
            "border-primary/60 ring-2 ring-primary/15 shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]",
        )}
      >
        {/* ── Top accent bar ── */}
        <div
          className={cn(
            "h-1 w-full shrink-0 bg-gradient-to-r",
            isSale
              ? "from-emerald-400 via-emerald-500 to-emerald-500/50"
              : "from-sky-400 via-sky-500 to-sky-500/50",
          )}
        />

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
                onCheckedChange={() => onSelect(client.id)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary bg-background w-4 h-4 border-2 border-muted-foreground/40 shadow-sm"
              />
            </div>
          )}

          {/* Delete button — top-end */}
          {companyId && (
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
          )}

          {/* Avatar + name — padded so they never touch the absolute controls */}
          <div
            className={cn(
              "flex items-start gap-3",
              onSelect ? "ps-6" : "ps-0",
              companyId ? "pe-8" : "pe-0",
            )}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className={cn(
                  "flex justify-center items-center w-12 h-12 rounded-2xl font-outfit font-bold text-lg overflow-hidden shadow-sm ring-2",
                  isSale
                    ? "bg-gradient-to-br from-emerald-400/20 to-emerald-500/20 ring-emerald-400/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-gradient-to-br from-sky-400/20 to-sky-500/20 ring-sky-400/30 text-sky-700 dark:text-sky-400",
                )}
              >
                {client.avatar_url ? (
                  <img
                    src={client.avatar_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              {/* Interest type dot */}
              <span
                className={cn(
                  "absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 rounded-full border-2 border-card",
                  isSale ? "bg-emerald-500" : "bg-sky-500",
                )}
                title={t(client.interest_type)}
              />
            </div>

            {/* Name + employee */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-5 gap-0.5 font-medium border leading-none",
                    isSale
                      ? "text-emerald-700 border-emerald-500/25 bg-emerald-500/10"
                      : "text-sky-700 border-sky-500/25 bg-sky-500/10",
                  )}
                >
                  {isSale ? (
                    <Home className="w-2.5 h-2.5" />
                  ) : (
                    <Key className="w-2.5 h-2.5" />
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
                            "text-[10px] px-1.5 py-0 h-5 gap-0.5 font-medium border leading-none",
                            followUp.isOverdue
                              ? "bg-red-500/10 text-red-600 border-red-500/30"
                              : "bg-amber-500/10 text-amber-700 border-amber-500/30",
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
                dir="auto"
                className="block font-semibold text-foreground hover:text-primary text-[15px] leading-snug truncate transition-colors"
              >
                {displayName}
              </Link>

              {/* Assigned employee row */}
              <div className="flex items-center gap-1.5 mt-1 min-w-0">
                <span className="flex justify-center items-center w-5 h-5 rounded-full bg-muted text-[9px] font-semibold text-primary shrink-0 overflow-hidden">
                  {employeeAvatarUrl ? (
                    <img
                      src={employeeAvatarUrl}
                      alt={employeeName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    employeeName.charAt(0).toUpperCase()
                  )}
                </span>
                <span
                  className="text-muted-foreground text-[11px] truncate"
                  dir="auto"
                >
                  {employeeName}
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
                {client.phone || "—"}
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
                {countryLabel(client.country_code, language) || "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 border border-border/30 px-2.5 py-2 text-xs text-muted-foreground min-w-0">
              <Building2 className="w-3.5 h-3.5 text-sky-400/80 shrink-0" />
              <span className="truncate tabular-nums">
                <span className="font-semibold text-foreground/80">
                  {propertyCount}
                </span>{" "}
                {t("Properties")}
              </span>
            </div>
          </div>

          {/* Source + Date row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-0.5">
            {client.marketing_channel ? (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
                <Megaphone className="w-3 h-3 text-violet-400/80 shrink-0" />
                <span className="truncate" dir="auto">
                  <span className="text-muted-foreground/60">
                    {t("Source")}:{" "}
                  </span>
                  <span className="font-medium text-foreground/70">
                    {client.marketing_channel}
                  </span>
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
