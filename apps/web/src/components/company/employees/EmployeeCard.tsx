"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
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
  const isAdmin = employee.role === "company_super_admin";
  const record = employee.employee;
  const isDisabled = Boolean(record?.disabled);
  const displayName = employee.name || t("Unnamed");
  const email = employee.email || record?.email || "";
  const phone = record?.phone || "";
  const cleanPhone = phone.replace(/\D/g, "");
  const href = `/company/employees/${employee.id}`;
  const roleLabel =
    isAdmin && !record?.job_title
      ? t("Company Admin")
      : jobTitleLabel(record?.job_title, t);

  return (
    <article
      className={cn(
        "group relative flex flex-col bg-card shadow-[var(--shadow-subtle)] hover:shadow-[var(--shadow-hover)] border border-border/60 rounded-2xl h-full overflow-hidden transition-all duration-300",
        isDisabled && "opacity-75",
      )}
    >
      <div className="relative bg-gradient-to-br from-primary/[0.12] via-primary/[0.04] to-transparent px-5 pt-5 pb-4 overflow-hidden">
        <div
          className="absolute inset-0 pattern-grid-lg opacity-25 pointer-events-none"
          aria-hidden
        />
        <div className="top-0 absolute inset-x-0 bg-gradient-to-r from-primary to-primary/40 h-1" />

        <div className="relative flex items-start gap-3.5">
          <div className="flex justify-center items-center bg-primary/15 rounded-2xl ring-2 ring-primary/25 ring-offset-2 ring-offset-transparent w-14 h-14 font-outfit font-bold text-primary text-xl shadow-sm shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <Badge
                variant="outline"
                className={cn(
                  "backdrop-blur-sm text-[10px] px-1.5 py-0 h-5 gap-0.5 font-medium border",
                  isAdmin
                    ? "bg-primary/10 text-primary border-primary/25"
                    : "bg-sky-500/10 text-sky-700 border-sky-500/25",
                )}
              >
                {isAdmin ? (
                  <Shield className="w-2.5 h-2.5" />
                ) : (
                  <User className="w-2.5 h-2.5" />
                )}
                {isAdmin ? t("Admin") : t("Employee")}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "backdrop-blur-sm text-[10px] px-1.5 py-0 h-5 font-medium border",
                  isDisabled
                    ? "bg-destructive/10 text-destructive border-destructive/25"
                    : "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
                )}
              >
                {isDisabled ? t("Disabled") : t("Active")}
              </Badge>
              {isCurrentUser && (
                <Badge
                  variant="outline"
                  className="bg-muted/80 border-border/60 text-muted-foreground text-[10px] px-1.5 py-0 h-5 font-medium"
                >
                  {t("You")}
                </Badge>
              )}
            </div>

            <Link
              href={href}
              className="block font-semibold text-foreground hover:text-primary text-[15px] truncate transition-colors"
            >
              {displayName}
            </Link>
            <p className="mt-1 text-muted-foreground text-xs truncate">
              {roleLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 gap-3 px-5 py-4">
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

        {email ? (
          <div className="flex items-center gap-1.5 bg-muted/25 px-2.5 py-2 border border-border/30 rounded-lg text-muted-foreground text-xs">
            <Mail className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            <span className="truncate" dir="ltr">
              {email}
            </span>
          </div>
        ) : null}

        {(record?.id && onToggleDisable) || (!isCurrentUser && onDelete) ? (
          <div className="flex items-center gap-1">
            {record?.id && onToggleDisable && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="hover:bg-primary/10 px-2 h-8 text-muted-foreground hover:text-primary"
                onClick={() => onToggleDisable(employee)}
                title={isDisabled ? t("Enable") : t("Disable")}
              >
                {isDisabled ? (
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <UserX className="w-3.5 h-3.5" />
                )}
              </Button>
            )}
            {!isCurrentUser && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="hover:bg-destructive/10 px-2 h-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(employee)}
                title={t("Delete")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-auto border-primary/15 border-t bg-primary/[0.06]">
        <Link
          href={href}
          className="group/link flex justify-between items-center gap-2 hover:bg-primary/10 px-5 py-3.5 w-full font-semibold text-primary hover:text-primary/90 text-sm transition-colors"
        >
          <span>{t("View Details")}</span>
          <ArrowUpRight className="w-4 h-4 opacity-70 group-hover/link:opacity-100 transition-all group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
        </Link>
      </div>
    </article>
  );
};
