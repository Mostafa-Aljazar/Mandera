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
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
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
}

export default function EmployeeDeletionDialog({
  isOpen,
  onClose,
  employeeToDelete,
  onSuccess,
  companyId: propCompanyId,
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
  } = useEmployeeDeletion();

  const [reassignOwnersTo, setReassignOwnersTo] = useState("");
  const [reassignClientsTo, setReassignClientsTo] = useState("");
  const [reassignPropertiesTo, setReassignPropertiesTo] = useState("");

  const { data: employeesData } = useCompanyEmployeesLookup(
    isOpen ? activeCompanyId : undefined,
  );
  const employees = (employeesData ?? []).filter(
    (e) =>
      e.id !== employeeToDelete?.id && e.id !== employeeToDelete?.employeeId,
  );

  useEffect(() => {
    if (!isOpen) {
      setReassignOwnersTo("");
      setReassignClientsTo("");
      setReassignPropertiesTo("");
    }
  }, [isOpen]);

  const isBaseOnly = Boolean(employeeToDelete?._isBase);
  const isFormValid =
    isBaseOnly ||
    Boolean(reassignOwnersTo && reassignClientsTo && reassignPropertiesTo);
  const displayName =
    employeeToDelete?.name || employeeToDelete?.firstName || t("Unnamed");

  const handleConfirm = async () => {
    if (!employeeToDelete || !isFormValid) return;

    const result = await deleteEmployeeWorkflow(
      {
        id: employeeToDelete.id,
        employeeId: employeeToDelete.employeeId || undefined,
        _isBase: employeeToDelete._isBase,
      },
      {
        reassignOwnersTo,
        reassignClientsTo,
        reassignPropertiesTo,
      },
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
        className="rounded-2xl sm:max-w-lg overflow-hidden p-0 gap-0"
        onInteractOutside={(e) => {
          if (isDeleting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isDeleting) e.preventDefault();
        }}
      >
        <div className="relative px-6 pt-6 pb-4">
          <div
            className="absolute inset-0 bg-gradient-to-b from-destructive/[0.07] to-transparent pointer-events-none"
            aria-hidden
          />
          <DialogHeader className="relative space-y-4 pe-0">
            <div className="flex justify-center items-center bg-destructive/10 mx-auto rounded-2xl ring-4 ring-destructive/10 w-14 h-14">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <div className="space-y-2 text-center sm:text-start">
              <DialogTitle className="font-outfit text-xl">
                {t("Delete Employee")}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground leading-relaxed">
                {t(
                  "You must reassign this employee's owners, clients, and properties before deleting.",
                )}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="relative flex items-center gap-3 bg-muted/50 mt-5 p-3.5 border border-border/60 rounded-xl">
            <div className="flex justify-center items-center bg-primary/15 rounded-xl w-11 h-11 font-outfit font-bold text-primary text-base shrink-0 overflow-hidden">
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
              <p className="font-semibold text-foreground truncate" dir="auto">
                {displayName}
              </p>
              {employeeToDelete?.email ? (
                <p
                  className="mt-0.5 text-muted-foreground text-sm truncate"
                  dir="ltr"
                >
                  {employeeToDelete.email}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {!isBaseOnly ? (
          <div className="space-y-4 px-6 pb-2">
            <div className="space-y-2">
              <Label className="text-foreground text-sm">
                {t("Transfer Owners to:")}
              </Label>
              <Select
                value={reassignOwnersTo}
                onValueChange={setReassignOwnersTo}
                disabled={isDeleting}
              >
                <SelectTrigger className="bg-background rounded-xl h-11">
                  <SelectValue placeholder={t("Select employee")} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={`owner-${emp.id}`} value={emp.id}>
                      {employeeDisplayName(emp, language, emp.name) || emp.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground text-sm">
                {t("Transfer Clients to:")}
              </Label>
              <Select
                value={reassignClientsTo}
                onValueChange={setReassignClientsTo}
                disabled={isDeleting}
              >
                <SelectTrigger className="bg-background rounded-xl h-11">
                  <SelectValue placeholder={t("Select employee")} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={`client-${emp.id}`} value={emp.id}>
                      {employeeDisplayName(emp, language, emp.name) || emp.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground text-sm">
                {t("Transfer Properties to:")}
              </Label>
              <Select
                value={reassignPropertiesTo}
                onValueChange={setReassignPropertiesTo}
                disabled={isDeleting}
              >
                <SelectTrigger className="bg-background rounded-xl h-11">
                  <SelectValue placeholder={t("Select employee")} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={`prop-${emp.id}`} value={emp.id}>
                      {employeeDisplayName(emp, language, emp.name) || emp.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}

        {isDeleting ? (
          <div className="flex flex-col justify-center items-center gap-3 bg-muted/30 mx-6 mt-3 mb-1 py-6 border border-border/50 rounded-xl">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="font-medium text-primary text-sm animate-pulse">
              {deletionProgress}
            </p>
          </div>
        ) : null}

        {deletionError && !isDeleting ? (
          <div className="px-6 pt-3">
            <Alert variant="destructive" className="rounded-xl">
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>{t("Error")}</AlertTitle>
              <AlertDescription className="mt-1 text-xs break-words">
                {deletionError}
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        <DialogFooter className="bg-muted/30 mt-4 px-6 py-4 border-border/60 border-t sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl h-10"
          >
            {t("Cancel")}
          </Button>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
