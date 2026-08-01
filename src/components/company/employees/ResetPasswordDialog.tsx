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
import { KeyRound, Loader2 } from "lucide-react";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  isSubmitting?: boolean;
  onConfirm: (password: string) => void;
}

export default function ResetPasswordDialog({
  open,
  onOpenChange,
  employeeName,
  isSubmitting = false,
  onConfirm,
}: ResetPasswordDialogProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setConfirm("");
    setError(null);
  }, [open]);

  const submit = () => {
    if (password.length < 6) {
      setError(t("Password must be at least 6 characters."));
      return;
    }
    if (password !== confirm) {
      setError(t("Passwords do not match."));
      return;
    }
    onConfirm(password);
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
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 text-center sm:text-start">
              <AlertDialogTitle className="font-outfit text-lg">
                {t("Reset password")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed">
                {t("Set a new password for {{name}}.", { name: employeeName })}
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>

          <div className="relative space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor={inputId} className="text-xs">
                {t("New password")}
              </Label>
              <Input
                id={inputId}
                type="password"
                autoComplete="new-password"
                className="bg-background h-11"
                value={password}
                disabled={isSubmitting}
                autoFocus
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${inputId}-confirm`} className="text-xs">
                {t("Confirm password")}
              </Label>
              <Input
                id={`${inputId}-confirm`}
                type="password"
                autoComplete="new-password"
                className="bg-background h-11"
                value={confirm}
                disabled={isSubmitting}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSubmitting) submit();
                }}
              />
            </div>
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
            disabled={isSubmitting}
            className="gap-1.5"
            onClick={submit}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            {t("Reset password")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
