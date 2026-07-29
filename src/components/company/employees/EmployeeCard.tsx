"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  Briefcase,
  Mail,
  Phone,
  Shield,
  User,
  UserCheck,
  UserX,
  Trash2,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { employeeDisplayName } from "@/lib/bilingualLabel";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CompanyEmployeeWithDetails } from "@/types/supabase-entities.types";

interface EmployeeCardProps {
  employee: CompanyEmployeeWithDetails;
  isCurrentUser?: boolean;
  onToggleDisable?: (employee: CompanyEmployeeWithDetails) => void;
  onDelete?: (employee: CompanyEmployeeWithDetails) => void;
}

function jobTitleLabel(
  jobTitle: string | undefined,
  t: (key: string) => string,
): string {
  switch (jobTitle) {
    case "sales_agent":
      return t("Sales Agent");
    case "admin":
      return t("Administrator");
    case "manager":
      return t("Manager");
    default:
      return t("N/A");
  }
}

export default function EmployeeCard({
  employee,
  isCurrentUser = false,
  onToggleDisable,
  onDelete,
}: EmployeeCardProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isAdmin = employee.role === "company_super_admin";
  const record = employee.employee;
  const isDisabled = Boolean(record?.disabled);
  const displayName =
    employeeDisplayName(record, language, employee.name) || t("Unnamed");
  const email = employee.email || record?.email || "";
  const phone = record?.phone || "";
  const cleanPhone = phone.replace(/\D/g, "");
  const href = `/company/employees/${employee.id}`;
  const roleLabel =
    isAdmin && !record?.job_title
      ? t("Company Admin")
      : jobTitleLabel(record?.job_title, t);
  const showActions =
    Boolean(record?.id && onToggleDisable && !isAdmin) ||
    Boolean(!isCurrentUser && onDelete);

  return (
    <article
      className={cn(
        "group @container/employee-card relative flex flex-col bg-card shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-hover)] border border-border/60 rounded-2xl h-full overflow-hidden transition-all duration-300",
        isDisabled && "opacity-80",
      )}
    >
      <div className="relative bg-gradient-to-br from-amber-500/[0.10] via-primary/[0.04] to-transparent px-4 sm:px-5 pt-4 sm:pt-5 pb-4 overflow-hidden">
        <div
          className="absolute inset-0 pattern-grid-lg opacity-20 pointer-events-none"
          aria-hidden
        />
        <div className="top-0 absolute inset-x-0 bg-gradient-to-r from-primary to-primary/40 h-1" />

        <div className="relative flex items-start gap-3 sm:gap-3.5">
          <div className="flex justify-center items-center bg-primary/15 rounded-2xl ring-2 ring-primary/25 ring-offset-2 ring-offset-transparent w-12 h-12 sm:w-14 sm:h-14 font-outfit font-bold text-primary text-lg sm:text-xl shadow-sm shrink-0 overflow-hidden">
            {record?.avatar_url ? (
              <img
                src={record.avatar_url}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0 text-start">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <Badge
                variant="outline"
                className={cn(
                  "backdrop-blur-sm text-[10px] px-1.5 py-0 h-5 gap-0.5 font-medium border",
                  isDisabled
                    ? "bg-amber-500/10 text-amber-800 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
                )}
              >
                {isDisabled ? (
                  <UserX className="w-2.5 h-2.5" />
                ) : (
                  <UserCheck className="w-2.5 h-2.5" />
                )}
                {isDisabled ? t("Disabled") : t("Active")}
              </Badge>
              {isCurrentUser ? (
                <Badge
                  variant="outline"
                  className="bg-muted/80 border-border/60 text-muted-foreground text-[10px] px-1.5 py-0 h-5 font-medium"
                >
                  {t("You")}
                </Badge>
              ) : null}
            </div>

            <Link
              href={href}
              className="block font-semibold text-foreground hover:text-primary text-[15px] truncate transition-colors"
              dir="auto"
            >
              {displayName}
            </Link>
            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-xs min-w-0">
              {isAdmin ? (
                <Shield className="w-3.5 h-3.5 text-primary/60 shrink-0" />
              ) : (
                <Briefcase className="w-3.5 h-3.5 text-primary/60 shrink-0" />
              )}
              <span className="truncate">{roleLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 gap-2.5 sm:gap-3 px-4 sm:px-5 py-3.5 sm:py-4">
        <div className="flex justify-between items-center gap-2 bg-muted/35 px-3 py-2.5 border border-border/40 rounded-xl">
          <div className="flex items-center gap-2 min-w-0">
            <Phone className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            {phone ? (
              <span
                className="font-medium text-foreground text-sm truncate"
                dir="ltr"
              >
                {phone}
              </span>
            ) : (
              <span className="text-muted-foreground text-sm truncate">
                {t("No phone number")}
              </span>
            )}
          </div>
          {cleanPhone ? (
            <div className="flex items-center gap-0.5 shrink-0">
              <a
                href={`tel:${cleanPhone}`}
                title={t("Call")}
                className="inline-flex justify-center items-center hover:bg-primary/10 rounded-lg w-8 h-8 text-muted-foreground hover:text-primary transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                title={t("WhatsApp")}
                className="inline-flex justify-center items-center hover:bg-[#25D366]/10 rounded-lg w-8 h-8 text-muted-foreground hover:text-[#25D366] transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : null}
        </div>

        <div className="gap-2 grid grid-cols-2">
          <div className="flex items-center gap-1.5 bg-muted/25 px-2.5 py-2 border border-border/30 rounded-lg text-muted-foreground text-xs min-w-0">
            {isAdmin ? (
              <Shield className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            ) : (
              <User className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            )}
            <span className="truncate">
              {isAdmin ? t("Admin") : t("Employee")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/25 px-2.5 py-2 border border-border/30 rounded-lg text-muted-foreground text-xs min-w-0">
            <Mail className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            {email ? (
              <a
                href={`mailto:${email}`}
                className="truncate hover:text-primary transition-colors"
                dir="ltr"
                title={email}
              >
                {email}
              </a>
            ) : (
              <span className="truncate">{t("No email")}</span>
            )}
          </div>
        </div>

        {showActions ? (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {record?.id && onToggleDisable && !isAdmin ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-xl h-9 gap-1.5 font-medium",
                  isDisabled
                    ? "border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800"
                    : "border-amber-500/30 text-amber-800 hover:bg-amber-500/10 hover:text-amber-900",
                )}
                onClick={() => onToggleDisable(employee)}
              >
                {isDisabled ? (
                  <UserCheck className="w-3.5 h-3.5" />
                ) : (
                  <UserX className="w-3.5 h-3.5" />
                )}
                {isDisabled ? t("Enable") : t("Disable")}
              </Button>
            ) : null}
            {!isCurrentUser && onDelete ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl h-9 gap-1.5 font-medium border-destructive/25 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(employee)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t("Delete")}
              </Button>
            ) : null}
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
