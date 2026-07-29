"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Users,
  Loader2,
  AlertCircle,
  ArrowRightLeft,
  UserCheck,
} from "lucide-react";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompanyEmployeesLookup } from "@/hooks/queries/useProperties";
import { employeeDisplayName } from "@/lib/bilingualLabel";
import type { CompanyEmployee } from "@/types/supabase-entities.types";

interface EmployeeReassignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOwnerIds?: string[];
  onConfirm: (targetEmployeeId: string) => void;
  isProcessing?: boolean;
}

export default function EmployeeReassignmentModal({
  isOpen,
  onClose,
  selectedOwnerIds = [],
  onConfirm,
  isProcessing = false,
}: EmployeeReassignmentModalProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { company } = useCompanyAuth();

  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: employeesData, isFetching: isLoading } =
    useCompanyEmployeesLookup(isOpen ? company?.id : undefined);
  const employees: CompanyEmployee[] = employeesData ?? [];

  const count = selectedOwnerIds.length;
  const selectedEmployee = employees.find((e) => e.id === targetEmployeeId);
  const selectedEmployeeName = selectedEmployee
    ? employeeDisplayName(selectedEmployee, language, selectedEmployee.name) ||
      selectedEmployee.email ||
      selectedEmployee.id
    : null;

  const handleConfirm = () => {
    setError(null);
    if (!targetEmployeeId) {
      setError(t("You must select an employee to transfer owners to."));
      return;
    }
    onConfirm(targetEmployeeId);
  };

  const resetStateAndClose = () => {
    if (isProcessing) return;
    setTargetEmployeeId("");
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && resetStateAndClose()}
    >
      <DialogContent className="sm:max-w-[440px] gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="relative flex items-start gap-4 bg-primary/5 border-b border-primary/15 px-6 pt-6 pb-5 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
          <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 shrink-0">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
          </span>
          <DialogHeader className="gap-1 text-start pt-0.5">
            <DialogTitle className="font-outfit text-foreground text-[17px] leading-snug">
              {t("Reassign Owners")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              {t("{{count}} owner(s) will be transferred to another employee.", {
                count,
              })}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Selected count preview */}
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm tabular-nums">
                {count} {t("Owners")}
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {t("Selected for reassignment")}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-sm p-3 rounded-xl border border-destructive/20">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t("Select Target Employee")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Select
              value={targetEmployeeId}
              onValueChange={(val) => {
                setTargetEmployeeId(val);
                setError(null);
              }}
              disabled={isProcessing || isLoading}
            >
              <SelectTrigger className="bg-background rounded-xl h-11">
                <SelectValue
                  placeholder={
                    isLoading ? t("Loading...") : t("Select employee...")
                  }
                >
                  {selectedEmployeeName ? (
                    <span className="flex items-center gap-2 min-w-0" dir="auto">
                      <span className="flex justify-center items-center w-6 h-6 rounded-full bg-primary/10 text-[10px] font-semibold text-primary shrink-0 overflow-hidden">
                        {selectedEmployee?.avatar_url ? (
                          <img
                            src={selectedEmployee.avatar_url}
                            alt={selectedEmployeeName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          selectedEmployeeName.charAt(0).toUpperCase()
                        )}
                      </span>
                      <span className="truncate">{selectedEmployeeName}</span>
                    </span>
                  ) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {employees.length === 0 && !isLoading ? (
                  <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                    {t("No employees found.")}
                  </div>
                ) : (
                  employees.map((emp) => {
                    const name =
                      employeeDisplayName(emp, language, emp.name) ||
                      emp.email ||
                      emp.id;
                    return (
                      <SelectItem key={emp.id} value={emp.id}>
                        <span
                          className="flex items-center gap-2 min-w-0"
                          dir="auto"
                        >
                          <span className="flex justify-center items-center w-6 h-6 rounded-full bg-muted text-[10px] font-semibold text-primary shrink-0 overflow-hidden">
                            {emp.avatar_url ? (
                              <img
                                src={emp.avatar_url}
                                alt={name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              name.charAt(0).toUpperCase()
                            )}
                          </span>
                          <span className="truncate">{name}</span>
                        </span>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="flex sm:flex-row flex-col-reverse gap-2 bg-muted/30 px-6 py-4 border-t border-border/60">
          <Button
            variant="outline"
            onClick={resetStateAndClose}
            disabled={isProcessing}
            className="flex-1 sm:flex-none rounded-xl h-10"
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || !targetEmployeeId}
            className="flex-1 sm:flex-none gap-2 rounded-xl h-10 font-medium"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("Processing...")}
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                {t("Confirm Transfer")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
