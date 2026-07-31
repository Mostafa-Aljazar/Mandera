"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserCheck, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { employeeDisplayName } from "@/lib/bilingualLabel";
import type { CompanyEmployeeWithDetails } from "@/types/supabase-entities.types";
import type { ReassignmentTargets } from "@/actions/employees";

interface EmployeeStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  employeeEmail?: string;
  avatarUrl?: string | null;
  isDisabled: boolean;
  isSubmitting?: boolean;
  employeeProfileId?: string;
  employees?: CompanyEmployeeWithDetails[];
  onConfirm: (targets?: ReassignmentTargets) => void;
}

export default function EmployeeStatusDialog({
  open,
  onOpenChange,
  employeeName,
  employeeEmail,
  avatarUrl,
  isDisabled,
  isSubmitting = false,
  employeeProfileId,
  employees = [],
  onConfirm,
}: EmployeeStatusDialogProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const enabling = isDisabled;
  const [ownersTarget, setOwnersTarget] = useState("");
  const [clientsTarget, setClientsTarget] = useState("");
  const [propertiesTarget, setPropertiesTarget] = useState("");
  const availableEmployees = employees.filter(
    (employee) => employee.id !== employeeProfileId && !employee.employee?.disabled,
  );
  const hasSomeTarget = Boolean(
    ownersTarget || clientsTarget || propertiesTarget,
  );
  const hasAllTargets = Boolean(
    ownersTarget && clientsTarget && propertiesTarget,
  );

  useEffect(() => {
    if (!open) {
      setOwnersTarget("");
      setClientsTarget("");
      setPropertiesTarget("");
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next);
      }}
    >
      <DialogContent
        className="rounded-2xl sm:max-w-md overflow-hidden p-0 gap-0"
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <div className="relative px-6 pt-6 pb-5">
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-b to-transparent pointer-events-none",
              enabling ? "from-emerald-500/[0.08]" : "from-amber-500/[0.08]",
            )}
            aria-hidden
          />
          <DialogHeader className="relative space-y-4 pe-0">
            <div
              className={cn(
                "flex justify-center items-center mx-auto rounded-2xl ring-4 w-14 h-14",
                enabling
                  ? "bg-emerald-500/10 ring-emerald-500/10 text-emerald-600"
                  : "bg-amber-500/10 ring-amber-500/10 text-amber-700",
              )}
            >
              {enabling ? (
                <UserCheck className="w-6 h-6" />
              ) : (
                <UserX className="w-6 h-6" />
              )}
            </div>
            <div className="space-y-2 text-center sm:text-start">
              <DialogTitle className="font-outfit text-xl">
                {enabling ? t("Enable Employee") : t("Disable Employee")}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground leading-relaxed">
                {enabling
                  ? t(
                      "This employee will regain access to the company workspace.",
                    )
                  : t(
                      "This employee will lose access to the company workspace until re-enabled.",
                    )}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="relative flex items-center gap-3 bg-muted/50 mt-5 p-3.5 border border-border/60 rounded-xl">
            <div className="flex justify-center items-center bg-primary/15 rounded-xl w-11 h-11 font-outfit font-bold text-primary text-base shrink-0 overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={employeeName}
                  className="w-full h-full object-cover"
                />
              ) : (
                employeeName.charAt(0).toUpperCase() || "?"
              )}
            </div>
            <div className="min-w-0 text-start">
              <p className="font-semibold text-foreground truncate" dir="auto">
                {employeeName}
              </p>
              {employeeEmail ? (
                <p
                  className="mt-0.5 text-muted-foreground text-sm truncate"
                  dir="ltr"
                >
                  {employeeEmail}
                </p>
              ) : null}
            </div>
          </div>
        </div>

          {!enabling ? (
            <div className="relative space-y-3 px-6 pb-5">
              <p className="text-muted-foreground text-xs">
                {t(
                  "If this employee has assigned records, choose where to transfer them before disabling.",
                )}
              </p>
              {[
                [t("Transfer Owners to:"), ownersTarget, setOwnersTarget],
                [t("Transfer Clients to:"), clientsTarget, setClientsTarget],
                [t("Transfer Properties to:"), propertiesTarget, setPropertiesTarget],
              ].map(([label, value, setter]) => (
                <div key={label as string} className="space-y-1.5">
                  <Label className="text-xs">{label as string}</Label>
                  <Select
                    value={value as string}
                    onValueChange={setter as (value: string) => void}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={t("Select employee")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEmployees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employeeDisplayName(
                            employee.employee,
                            language,
                            employee.name,
                          ) || employee.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          ) : null}

        <DialogFooter className="bg-muted/30 px-6 py-4 border-border/60 border-t sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            className="rounded-xl h-10"
            onClick={() => onOpenChange(false)}
          >
            {t("Cancel")}
          </Button>
          <Button
            type="button"
            onClick={() =>
              onConfirm(
                hasAllTargets
                  ? {
                      reassignOwnersTo: ownersTarget,
                      reassignClientsTo: clientsTarget,
                      reassignPropertiesTo: propertiesTarget,
                    }
                  : undefined,
              )
            }
            disabled={isSubmitting || (hasSomeTarget && !hasAllTargets)}
            className={cn(
              "rounded-xl h-10 gap-2",
              enabling
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-amber-600 hover:bg-amber-700 text-white",
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("Saving...")}
              </>
            ) : enabling ? (
              <>
                <UserCheck className="w-4 h-4" />
                {t("Enable")}
              </>
            ) : (
              <>
                <UserX className="w-4 h-4" />
                {t("Disable")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
