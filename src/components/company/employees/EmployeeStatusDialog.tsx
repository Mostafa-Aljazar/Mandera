"use client";

import React from "react";
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
import { Loader2, UserCheck, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmployeeStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  employeeEmail?: string;
  avatarUrl?: string | null;
  isDisabled: boolean;
  isSubmitting?: boolean;
  onConfirm: () => void;
}

export default function EmployeeStatusDialog({
  open,
  onOpenChange,
  employeeName,
  employeeEmail,
  avatarUrl,
  isDisabled,
  isSubmitting = false,
  onConfirm,
}: EmployeeStatusDialogProps) {
  const { t } = useTranslation();
  const enabling = isDisabled;

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
                // eslint-disable-next-line @next/next/no-img-element
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
            disabled={isSubmitting}
            onClick={onConfirm}
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
