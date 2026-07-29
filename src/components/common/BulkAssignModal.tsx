"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Loader2, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  bilingualLabel,
  employeeDisplayName,
  type BilingualName,
} from "@/lib/bilingualLabel";
import type { CompanyEmployee } from "@/types/supabase-entities.types";

interface BulkAssignStatus extends BilingualName {
  id: string;
}

interface BulkAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    employeeId: string;
    statusId: string | null;
  }) => Promise<void>;
  employees?: CompanyEmployee[];
  statuses?: BulkAssignStatus[];
  selectedCount?: number;
}

export default function BulkAssignModal({
  isOpen,
  onClose,
  onConfirm,
  employees = [],
  statuses = [],
  selectedCount = 0,
}: BulkAssignModalProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [statusId, setStatusId] = useState("keep_current");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();
  const { language } = useLanguage();

  const handleConfirm = async () => {
    if (!employeeId) return;
    setIsSubmitting(true);
    try {
      await onConfirm({
        employeeId,
        statusId: statusId === "keep_current" ? null : statusId,
      });
      setEmployeeId("");
      setStatusId("keep_current");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t("Bulk Assign Clients")}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg border border-border/50 text-sm text-muted-foreground">
            {t("You are about to reassign")}{" "}
            <strong className="text-foreground">{selectedCount}</strong>{" "}
            {t("selected client(s).")}
          </div>

          <div className="space-y-2">
            <Label>{t("Assign To Employee *")}</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={t("Select Employee")} />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => {
                  const name =
                    employeeDisplayName(e, language, e.name) ||
                    e.email ||
                    e.id;
                  return (
                    <SelectItem key={e.id} value={e.id}>
                      <span
                        className="flex items-center gap-2 min-w-0"
                        dir="auto"
                      >
                        <span className="flex justify-center items-center w-6 h-6 rounded-full bg-muted text-[10px] font-semibold text-primary shrink-0 overflow-hidden">
                          {e.avatar_url ? (
                            <img
                              src={e.avatar_url}
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
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("Update Status (Optional)")}</Label>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={t("Keep Current Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keep_current">
                  {t("Keep Current Status")}
                </SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {bilingualLabel(s, language)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!employeeId || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                {t("Assigning...")}
              </>
            ) : (
              t("Confirm Assignment")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
