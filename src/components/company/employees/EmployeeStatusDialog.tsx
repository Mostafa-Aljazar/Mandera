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
import type { ReassignmentTargets } from "@/actions/employee-types";

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
  assignmentCounts?: {
    owners: number;
    clients: number;
    properties: number;
    total: number;
  } | null;
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
  assignmentCounts = null,
  onConfirm,
}: EmployeeStatusDialogProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const enabling = isDisabled;
  const [reassignTo, setReassignTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const availableEmployees = employees.filter(
    (employee) => employee.id !== employeeProfileId && !employee.employee?.disabled,
  );
  const needsReassignment = !enabling && (assignmentCounts?.total ?? 0) > 0;

  useEffect(() => {
    if (!open) {
      setReassignTo("");
      setError(null);
    }
  }, [open]);

  const submit = () => {
    if (needsReassignment && !reassignTo) {
      setError(t("Choose where to transfer assigned records."));
      return;
    }
    onConfirm(reassignTo ? { reassignTo } : undefined);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next);
      }}
    >
      <DialogContent
        className="flex flex-col gap-0 p-0 rounded-2xl sm:max-w-md max-h-[min(90vh,36rem)] overflow-hidden"
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <div className="relative flex-1 min-h-0 overflow-y-auto">
          <div className="relative px-6 pt-5 pb-4">
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-b to-transparent pointer-events-none",
                enabling ? "from-emerald-500/[0.08]" : "from-amber-500/[0.08]",
              )}
              aria-hidden
            />
            <DialogHeader className="relative space-y-3 pe-0">
              <div
                className={cn(
                  "flex justify-center items-center mx-auto rounded-2xl ring-4 w-12 h-12",
                  enabling
                    ? "bg-emerald-500/10 ring-emerald-500/10 text-emerald-600"
                    : "bg-amber-500/10 ring-amber-500/10 text-amber-700",
                )}
              >
                {enabling ? (
                  <UserCheck className="w-5 h-5" />
                ) : (
                  <UserX className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1.5 text-center sm:text-start">
                <DialogTitle className="font-outfit text-lg">
                  {enabling ? t("Enable Employee") : t("Disable Employee")}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
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

            <div className="relative flex items-center gap-3 bg-muted/50 mt-4 p-3 border border-border/60 rounded-xl">
              <div className="flex justify-center items-center bg-primary/15 rounded-xl w-10 h-10 font-outfit font-bold text-primary text-sm shrink-0 overflow-hidden">
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
                <p className="font-semibold text-foreground text-sm truncate" dir="auto">
                  {employeeName}
                </p>
                {employeeEmail ? (
                  <p
                    className="mt-0.5 text-muted-foreground text-xs truncate"
                    dir="ltr"
                  >
                    {employeeEmail}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {!enabling ? (
            <div className="relative space-y-3 px-6 pb-4">
              {needsReassignment ? (
                <div className="bg-amber-500/10 px-3 py-2.5 border border-amber-500/20 rounded-xl text-amber-900 text-xs leading-relaxed">
                  <p className="font-medium">
                    {t("This employee has assigned records that must be transferred:")}
                  </p>
                  <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
                    <li>
                      {t("Clients")}: {assignmentCounts?.clients ?? 0}
                    </li>
                    <li>
                      {t("Owners")}: {assignmentCounts?.owners ?? 0}
                    </li>
                    <li>
                      {t("Properties")}: {assignmentCounts?.properties ?? 0}
                    </li>
                  </ul>
                </div>
              ) : (
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {t(
                    "If this employee has assigned records, choose where to transfer them before disabling.",
                  )}
                </p>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {t("Transfer all records to:")}
                  {needsReassignment ? " *" : ""}
                </Label>
                <Select
                  value={reassignTo}
                  onValueChange={(value) => {
                    setReassignTo(value);
                    if (error) setError(null);
                  }}
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
                {error ? (
                  <p className="text-destructive text-xs">{error}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="bg-muted/30 px-6 py-3.5 border-border/60 border-t sm:justify-between shrink-0">
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
            onClick={submit}
            disabled={isSubmitting || (needsReassignment && !reassignTo)}
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
