"use client";

import React, { useState } from "react";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import SettingsSection from "@/components/company/settings/SettingsSection";
import SettingsTableShell from "@/components/company/settings/SettingsTableShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit2, Trash2, Plus, Shuffle } from "lucide-react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { ClientDistributionRule } from "@/types/supabase-entities.types";
import {
  useClientDistributionRules,
  useUpsertClientDistributionRule,
  useDeleteClientDistributionRule,
} from "@/hooks/queries/useDistributionRules";

export default function DistributionRulesTab() {
  const { company } = useCompanyAuth();
  const { t } = useTranslation();
  const { data: rulesData, isLoading } = useClientDistributionRules(company?.id);
  const rules = rulesData ?? [];
  const upsertMutation = useUpsertClientDistributionRule();
  const deleteMutation = useDeleteClientDistributionRule();

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<ClientDistributionRule | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [strategy, setStrategy] = useState<"round_robin" | "manual">(
    "round_robin",
  );
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setEditItem(null);
    setName("");
    setNotes("");
    setStrategy("round_robin");
    setIsActive(true);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (rule: ClientDistributionRule) => {
    setEditItem(rule);
    setName(rule.name);
    setNotes(
      typeof rule.rules?.notes === "string" ? rule.rules.notes : "",
    );
    setStrategy(
      rule.rules?.strategy === "manual" ? "manual" : "round_robin",
    );
    setIsActive(rule.is_active);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!company?.id) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t("Rule name is required"));
      return;
    }
    try {
      const result = await upsertMutation.mutateAsync({
        id: editItem?.id,
        companyId: company.id,
        name: trimmed,
        rules: {
          notes: notes.trim(),
          strategy,
          ...(typeof editItem?.rules?.lastAssignedEmployeeId === "string"
            ? {
                lastAssignedEmployeeId:
                  editItem.rules.lastAssignedEmployeeId,
              }
            : {}),
        },
        isActive,
      });
      if (result.error) throw new Error(result.error);
      toast.success(
        editItem
          ? t("Distribution rule updated")
          : t("Distribution rule created"),
      );
      setOpen(false);
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Something went wrong"));
    }
  };

  const [rulePendingDelete, setRulePendingDelete] =
    useState<ClientDistributionRule | null>(null);

  const handleDelete = async () => {
    if (!company?.id || !rulePendingDelete) return;
    try {
      const result = await deleteMutation.mutateAsync({
        id: rulePendingDelete.id,
        companyId: company.id,
      });
      if (result.error) throw new Error(result.error);
      setRulePendingDelete(null);
      toast.success(t("Distribution rule deleted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Something went wrong"));
    }
  };

  return (
    <SettingsSection
      title={t("Client distribution")}
      description={t(
        "Control how new clients are assigned. Round-robin auto-assigns on create; manual keeps assignment to the form.",
      )}
      action={
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="me-2 h-4 w-4" />
              {t("Add rule")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editItem ? t("Edit distribution rule") : t("Add distribution rule")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="dist-rule-name">{t("Rule name")}</Label>
                <Input
                  id="dist-rule-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("e.g. Round-robin by area")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("Assignment strategy")}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={strategy}
                  onChange={(e) =>
                    setStrategy(
                      e.target.value === "manual" ? "manual" : "round_robin",
                    )
                  }
                >
                  <option value="round_robin">{t("Round-robin auto-assign")}</option>
                  <option value="manual">{t("Manual assign only")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dist-rule-notes">{t("Notes / criteria")}</Label>
                <Textarea
                  id="dist-rule-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder={t(
                    "Describe assignment criteria (source, area, team…)",
                  )}
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                <Label htmlFor="dist-rule-active">{t("Active")}</Label>
                <Switch
                  id="dist-rule-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                {t("Cancel")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={upsertMutation.isPending}
              >
                {t("Save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <SettingsTableShell>
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">{t("Loading...")}</p>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
            <Shuffle className="h-8 w-8 opacity-40" />
            <p className="text-sm">{t("No distribution rules yet.")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Rule name")}</TableHead>
                <TableHead>{t("Notes / criteria")}</TableHead>
                <TableHead>{t("Status")}</TableHead>
                <TableHead className="w-[100px]">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">
                    {typeof rule.rules?.notes === "string" && rule.rules.notes
                      ? rule.rules.notes
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {rule.is_active ? t("Active") : t("Inactive")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEdit(rule)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setRulePendingDelete(rule)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SettingsTableShell>

      <ConfirmDialog
        open={rulePendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setRulePendingDelete(null);
        }}
        title={t("Delete this distribution rule?")}
        description={t(
          "New clients will stop being assigned by this rule. This cannot be undone.",
        )}
        detailValue={rulePendingDelete?.name ?? undefined}
        confirmLabel={t("Delete rule")}
        isSubmitting={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </SettingsSection>
  );
}
