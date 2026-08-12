"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ConfirmTone = "destructive" | "warning";

const TONE_STYLES: Record<
  ConfirmTone,
  { wash: string; badge: string; button: "destructive" | "default" }
> = {
  destructive: {
    wash: "bg-gradient-to-b from-rose-500/[0.08] to-transparent",
    badge: "bg-rose-500/10 ring-rose-500/10 text-rose-600",
    button: "destructive",
  },
  warning: {
    wash: "bg-gradient-to-b from-amber-500/[0.08] to-transparent",
    badge: "bg-amber-500/10 ring-amber-500/10 text-amber-600",
    button: "default",
  },
};

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  /** Defaults to the shared "Cancel" string. */
  cancelLabel?: string;
  tone?: ConfirmTone;
  /** Overrides the tone's default icon. */
  icon?: React.ReactNode;
  /** Small mono block under the description — a record code, name, or count,
   *  so the user can see exactly what they are about to act on. */
  detailLabel?: string;
  detailValue?: string;
  isSubmitting?: boolean;
  onConfirm: () => void;
}

/**
 * Confirmation prompt for destructive or irreversible actions, replacing
 * `window.confirm` — which ignores the app's theme and RTL layout, renders the
 * browser's own chrome and origin ("mandera.site says"), hardcodes English
 * OK/Cancel labels, and cannot show a pending state while the action runs.
 *
 * Built on Dialog rather than AlertDialog on purpose: Radix's AlertDialog
 * calls preventDefault on every outside interaction, so a click on the overlay
 * cannot dismiss it. Dialog closes the way the rest of the app's modals do.
 * While a confirmed action is in flight the dialog still refuses to close, so
 * a stray click cannot hide a running request.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "destructive",
  icon,
  detailLabel,
  detailValue,
  isSubmitting = false,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const styles = TONE_STYLES[tone];
  const defaultIcon =
    tone === "destructive" ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next);
      }}
    >
      <DialogContent className="gap-0 p-0 sm:max-w-md overflow-hidden sm:rounded-2xl">
        <div className="relative px-6 pt-6 pb-4">
          <div className={cn("absolute inset-0 pointer-events-none", styles.wash)} aria-hidden />
          <DialogHeader className="relative space-y-3">
            <div
              className={cn(
                "flex justify-center items-center mx-auto ring-4 rounded-2xl w-12 h-12",
                styles.badge,
              )}
            >
              {icon ?? defaultIcon}
            </div>
            <div className="space-y-1.5 text-center sm:text-start">
              <DialogTitle className="font-outfit text-lg">{title}</DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                {description}
              </DialogDescription>
            </div>
          </DialogHeader>

          {detailValue ? (
            <div className="relative bg-muted/50 mt-4 px-3 py-2.5 border border-border/60 rounded-xl">
              {detailLabel ? (
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
                  {detailLabel}
                </p>
              ) : null}
              <p className="mt-0.5 font-mono font-medium text-foreground text-sm truncate" dir="ltr">
                {detailValue}
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="bg-muted/30 px-6 py-4 border-t border-border/60">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              {cancelLabel ?? t("Cancel")}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={styles.button}
            disabled={isSubmitting}
            className="gap-1.5"
            onClick={onConfirm}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (icon ?? defaultIcon)}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
