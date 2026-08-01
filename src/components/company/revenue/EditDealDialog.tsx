"use client";

import React, { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DirhamIcon, formatAedAmount } from "@/components/ui/dirham-icon";
import { Loader2, Pencil } from "lucide-react";

export interface EditDealValues {
  commission_value: number;
  notes: string;
}

interface EditDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAmount: number;
  currentNotes?: string | null;
  propertyCode?: string;
  isSubmitting?: boolean;
  onConfirm: (values: EditDealValues) => void;
}

export default function EditDealDialog({
  open,
  onOpenChange,
  currentAmount,
  currentNotes,
  propertyCode,
  isSubmitting = false,
  onConfirm,
}: EditDealDialogProps) {
  const { t } = useTranslation();
  const amountId = useId();
  const notesId = useId();
  const [value, setValue] = useState(String(currentAmount));
  const [notes, setNotes] = useState(currentNotes || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue(String(currentAmount));
    setNotes(currentNotes || "");
    setError(null);
  }, [open, currentAmount, currentNotes]);

  const submit = () => {
    const next = Number(value);
    if (!Number.isFinite(next) || next < 0) {
      setError(t("Enter a valid commission amount."));
      return;
    }
    onConfirm({
      commission_value: next,
      notes: notes.trim(),
    });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next);
      }}
    >
      <AlertDialogContent className="gap-0 p-0 sm:max-w-md overflow-hidden sm:rounded-2xl">
        <div className="relative px-6 pt-6 pb-4">
          <div
            className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] to-transparent pointer-events-none"
            aria-hidden
          />
          <AlertDialogHeader className="relative space-y-3">
            <div className="flex justify-center items-center mx-auto bg-primary/10 ring-4 ring-primary/10 rounded-2xl w-12 h-12 text-primary">
              <Pencil className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 text-center sm:text-start">
              <AlertDialogTitle className="font-outfit text-lg">
                {t("Edit deal")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed">
                {t(
                  "Update commission and notes for this deal. Financial changes are recorded in the audit log.",
                )}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>

          <div className="relative flex justify-between items-center gap-3 bg-muted/50 mt-4 p-3 border border-border/60 rounded-xl">
            <div className="min-w-0 text-start">
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
                {t("Current amount")}
              </p>
              {propertyCode ? (
                <p
                  className="mt-0.5 font-mono text-muted-foreground text-xs truncate"
                  dir="ltr"
                >
                  {propertyCode}
                </p>
              ) : null}
            </div>
            <p
              className="inline-flex items-center gap-1 font-outfit font-bold text-foreground text-lg tabular-nums shrink-0"
              dir="ltr"
            >
              <DirhamIcon className="w-4 h-4 text-primary" title={t("AED")} />
              {formatAedAmount(currentAmount)}
            </p>
          </div>

          <div className="relative space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor={amountId} className="text-xs">
                {t("Commission Value (AED)")}
              </Label>
              <div className="relative">
                <DirhamIcon
                  className="top-1/2 start-3 absolute w-4 h-4 text-muted-foreground -translate-y-1/2 pointer-events-none"
                  title={t("AED")}
                />
                <Input
                  id={amountId}
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  dir="ltr"
                  className="bg-background ps-9 h-11 font-medium tabular-nums"
                  placeholder={t("Enter commission amount")}
                  value={value}
                  disabled={isSubmitting}
                  autoFocus
                  onChange={(e) => {
                    setValue(e.target.value);
                    if (error) setError(null);
                  }}
                />
              </div>
              {error ? (
                <p className="text-destructive text-xs">{error}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor={notesId} className="text-xs">
                {t("Notes")}
              </Label>
              <Textarea
                id={notesId}
                rows={3}
                className="bg-background min-h-[88px] resize-none"
                placeholder={t("Optional notes")}
                value={notes}
                disabled={isSubmitting}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <AlertDialogFooter className="bg-muted/30 px-6 py-4 border-t border-border/60">
          <AlertDialogCancel disabled={isSubmitting} className="mt-0">
            {t("Cancel")}
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={isSubmitting}
            className="gap-1.5"
            onClick={submit}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Pencil className="w-4 h-4" />
            )}
            {t("Save Changes")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
