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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X } from "lucide-react";

interface RejectionNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  propertyCode?: string;
  isSubmitting?: boolean;
  onConfirm: (note: string) => void;
}

export default function RejectionNoteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  propertyCode,
  isSubmitting = false,
  onConfirm,
}: RejectionNoteDialogProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNote("");
    setError(null);
  }, [open]);

  const submit = () => {
    const trimmed = note.trim();
    if (!trimmed) {
      setError(t("A rejection reason is required."));
      return;
    }
    onConfirm(trimmed);
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
            className="absolute inset-0 bg-gradient-to-b from-rose-500/[0.08] to-transparent pointer-events-none"
            aria-hidden
          />
          <AlertDialogHeader className="relative space-y-3">
            <div className="flex justify-center items-center mx-auto bg-rose-500/10 ring-4 ring-rose-500/10 rounded-2xl w-12 h-12 text-rose-600">
              <X className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 text-center sm:text-start">
              <AlertDialogTitle className="font-outfit text-lg">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed">
                {description}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>

          {propertyCode ? (
            <div className="relative bg-muted/50 mt-4 px-3 py-2.5 border border-border/60 rounded-xl">
              <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
                {t("Property code")}
              </p>
              <p
                className="mt-0.5 font-mono font-medium text-foreground text-sm truncate"
                dir="ltr"
              >
                {propertyCode}
              </p>
            </div>
          ) : null}

          <div className="relative space-y-2 mt-4">
            <Label htmlFor={inputId} className="text-xs">
              {t("Rejection reason")}
            </Label>
            <Textarea
              id={inputId}
              rows={3}
              className="bg-background min-h-[88px] resize-none"
              placeholder={t("Enter rejection note")}
              value={note}
              disabled={isSubmitting}
              autoFocus
              onChange={(e) => {
                setNote(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  if (!isSubmitting) submit();
                }
              }}
            />
            {error ? (
              <p className="text-destructive text-xs">{error}</p>
            ) : null}
          </div>
        </div>

        <AlertDialogFooter className="bg-muted/30 px-6 py-4 border-t border-border/60">
          <AlertDialogCancel disabled={isSubmitting} className="mt-0">
            {t("Cancel")}
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting}
            className="gap-1.5"
            onClick={submit}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
