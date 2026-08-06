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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Trash2, AlertTriangle, UserX } from "lucide-react";
import { useEmployeeDeletion } from "@/hooks/useEmployeeDeletion";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompanyEmployeesLookup } from "@/hooks/queries/useProperties";
import { employeeDisplayName } from "@/lib/bilingualLabel";

interface EmployeeToDelete {
  id: string;
  employeeId?: string | null;
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  firstName?: string;
  _isBase?: boolean;
}

interface EmployeeDeletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeToDelete: EmployeeToDelete | null;
  onSuccess?: () => void;
  companyId?: string;
  /** Called when the user chooses to disable instead, after a history-blocked delete attempt. */
  onSwitchToDisable?: (employeeToDelete: EmployeeToDelete) => void;
}

export default function EmployeeDeletionDialog({
  isOpen,
  onClose,
  employeeToDelete,
  onSuccess,
  companyId: propCompanyId,
  onSwitchToDisable,
}: EmployeeDeletionDialogProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { company } = useCompanyAuth();
  const activeCompanyId = propCompanyId || company?.id;
  const {
    deleteEmployeeWorkflow,
    isDeleting,
    deletionProgress,
    deletionError,
    isHistoryBlocked,
  } = useEmployeeDeletion();

  const [reassignTo, setReassignTo] = useState("");

  const { data: employeesData } = useCompanyEmployeesLookup(
    isOpen ? activeCompanyId : undefined,
  );
  const employees = (employeesData ?? []).filter(
    (e) =>
      e.id !== employeeToDelete?.id && e.id !== employeeToDelete?.employeeId,
  );

  useEffect(() => {
    if (!isOpen) setReassignTo("");
  }, [isOpen]);

  const isBaseOnly = Boolean(employeeToDelete?._isBase);
  const isFormValid = isBaseOnly || Boolean(reassignTo);
  const displayName =
    employeeToDelete?.name || employeeToDelete?.firstName || t("Unnamed");

  const handleConfirm = async () => {
    if (!employeeToDelete || !isFormValid || !activeCompanyId) return;

    const result = await deleteEmployeeWorkflow(
      {
        id: employeeToDelete.id,
        employeeId: employeeToDelete.employeeId || undefined,
        _isBase: employeeToDelete._isBase,
      },
      { reassignTo },
      activeCompanyId,
    );

    if (result.success) {
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isDeleting) onClose();
      }}
    >
      <DialogContent
        className="flex flex-col gap-0 p-0 rounded-2xl sm:max-w-md max-h-[min(90vh,36rem)] overflow-hidden"
        onInteractOutside={(e) => {
          if (isDeleting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isDeleting) e.preventDefault();
        }}
      >
        <div className="relative flex-1 min-h-0 overflow-y-auto">
          <div className="relative px-6 pt-5 pb-4">
            <div
              className="absolute inset-0 bg-gradient-to-b from-destructive/[0.07] to-transparent pointer-events-none"
              aria-hidden
            />
            <DialogHeader className="relative space-y-3 pe-0">
              <div className="flex justify-center items-center bg-destructive/10 mx-auto rounded-2xl ring-4 ring-destructive/10 w-12 h-12">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div className="space-y-1.5 text-center sm:text-start">
                <DialogTitle className="font-outfit text-lg">
                  {t("Delete Employee")}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                  {t(
                    "You must reassign this employee's owners, clients, and properties before deleting.",
                  )}
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="relative flex items-center gap-3 bg-muted/50 mt-4 p-3 border border-border/60 rounded-xl">
              <div className="flex justify-center items-center bg-primary/15 rounded-xl w-10 h-10 font-outfit font-bold text-primary text-sm shrink-0 overflow-hidden">
                {employeeToDelete?.avatarUrl ? (
                  <img
                    src={employeeToDelete.avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  displayName.charAt(0).toUpperCase() || "?"
                )}
              </div>
              <div className="min-w-0 text-start">
                <p className="font-semibold text-foreground text-sm truncate" dir="auto">
                  {displayName}
                </p>
                {employeeToDelete?.email ? (
                  <p
                    className="mt-0.5 text-muted-foreground text-xs truncate"
                    dir="ltr"
                  >
                    {employeeToDelete.email}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {!isBaseOnly ? (
            <div className="space-y-2 px-6 pb-4">
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">
                  {t("Transfer all records to:")}
                </Label>
                <Select
                  value={reassignTo}
                  onValueChange={setReassignTo}
                  disabled={isDeleting}
                >
                  <SelectTrigger className="bg-background rounded-xl h-10">
                    <SelectValue placeholder={t("Select employee")} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {employeeDisplayName(emp, language, emp.name) || emp.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {isDeleting ? (
            <div className="flex flex-col justify-center items-center gap-3 bg-muted/30 mx-6 mb-4 py-5 border border-border/50 rounded-xl">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
              <p className="font-medium text-primary text-sm animate-pulse">
                {deletionProgress}
              </p>
            </div>
          ) : null}

          {deletionError && !isDeleting ? (
            <div className="px-6 pb-4">
              <Alert variant="destructive" className="rounded-xl">
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>{t("Error")}</AlertTitle>
                <AlertDescription className="mt-1 text-xs break-words">
                  {deletionError}
                </AlertDescription>
              </Alert>
            </div>
          ) : null}
        </div>

        <DialogFooter className="bg-muted/30 px-6 py-3.5 border-border/60 border-t sm:justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl h-10"
          >
            {t("Cancel")}
          </Button>
          {isHistoryBlocked && employeeToDelete && onSwitchToDisable ? (
            <Button
              type="button"
              variant="default"
              onClick={() => onSwitchToDisable(employeeToDelete)}
              className="rounded-xl h-10 gap-2"
            >
              <UserX className="w-4 h-4" />
              {t("Disable employee instead")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirm()}
              disabled={
                !isFormValid ||
                isDeleting ||
                deletionProgress === t("Deletion successful")
              }
              className="rounded-xl h-10 gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("Deleting...")}
                </>
              ) : deletionError ? (
                t("Retry")
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  {t("Confirm Delete")}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
