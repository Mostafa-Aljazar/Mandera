"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteOwnersDialogProps {
  ownerIds: string[];
  ownerName?: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export default function DeleteOwnersDialog({
  ownerIds,
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteOwnersDialogProps) {
  const { t } = useTranslation();
  const isBulk = ownerIds.length > 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] gap-0 p-0 overflow-hidden">

        {/* ── Header ── */}
        <div className="relative flex items-start gap-4 bg-destructive/5 border-b border-destructive/15 px-6 pt-6 pb-5 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-destructive/60 via-destructive to-destructive/60" />
          <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-destructive/10 border border-destructive/20 shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </span>
          <DialogHeader className="gap-1 text-start pt-0.5">
            <DialogTitle className="font-outfit text-foreground text-[17px] leading-snug">
              {t("Delete Owner")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
              {t("Are you sure you want to delete this owner? This action cannot be undone.")}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5">
          <div className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {t("Warning")}:{" "}
              </span>
              {t("This action cannot be undone.")}
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="flex sm:flex-row flex-col-reverse gap-2 bg-muted/30 px-6 py-4 border-t border-border/60">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 sm:flex-none rounded-xl h-10"
          >
            {t("Cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 sm:flex-none gap-2 rounded-xl h-10 font-medium"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("Deleting...")}
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                {t("Delete Owner")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
