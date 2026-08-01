"use client";

import { useEffect, useId, useState } from "react";
import {
  Building2,
  Edit2,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { CompanyBranch } from "@/actions/companyExtendedSettings";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { bilingualLabel } from "@/lib/bilingualLabel";
import {
  useCompanyBranches,
  useDeleteCompanyBranch,
  useUpsertCompanyBranch,
} from "@/hooks/queries/useCompanyExtendedSettings";
import SettingsSection from "./SettingsSection";
import SettingsTableShell from "./SettingsTableShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const emptyForm = {
  name_en: "",
  name_ar: "",
  address: "",
  phone: "",
};

export default function BranchesTab() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { company } = useCompanyAuth();
  const { data = [], isLoading } = useCompanyBranches(company?.id);
  const save = useUpsertCompanyBranch();
  const remove = useDeleteCompanyBranch();

  const nameEnId = useId();
  const nameArId = useId();
  const addressId = useId();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyBranch | null>(null);
  const [deleting, setDeleting] = useState<CompanyBranch | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!formOpen) {
      setEditing(null);
      setForm(emptyForm);
    }
  }, [formOpen]);

  useEffect(() => {
    if (!deleteOpen) setDeleting(null);
  }, [deleteOpen]);

  const change = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (branch: CompanyBranch) => {
    setEditing(branch);
    setForm({
      name_en: branch.name_en,
      name_ar: branch.name_ar,
      address: branch.address || "",
      phone: branch.phone || "",
    });
    setFormOpen(true);
  };

  const openDelete = (branch: CompanyBranch) => {
    setDeleting(branch);
    setDeleteOpen(true);
  };

  const submitForm = async () => {
    if (!company?.id || !form.name_en.trim() || !form.name_ar.trim()) return;
    try {
      const result = await save.mutateAsync({
        id: editing?.id,
        companyId: company.id,
        name_en: form.name_en.trim(),
        name_ar: form.name_ar.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
      });
      if (result.error) throw new Error(result.error);
      toast.success(
        editing
          ? t("Branch updated successfully.")
          : t("Branch added successfully."),
      );
      setFormOpen(false);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const confirmDelete = async () => {
    if (!company?.id || !deleting) return;
    try {
      const result = await remove.mutateAsync({
        id: deleting.id,
        companyId: company.id,
      });
      if (result.error) throw new Error(result.error);
      toast.success(t("Branch deleted successfully."));
      setDeleteOpen(false);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const canSave =
    form.name_en.trim().length > 0 && form.name_ar.trim().length > 0;

  return (
    <>
      <SettingsSection
        title={t("Branches")}
        description={t("Manage company office branches and contact details.")}
        icon={Building2}
        action={
          <Button
            size="sm"
            className="gap-2 h-9 rounded-xl"
            onClick={openCreate}
          >
            <Plus className="w-4 h-4" />
            {t("Add Branch")}
          </Button>
        }
      >
        <SettingsTableShell>
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>{t("Name")}</TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("Address")}
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("Phone")}
                </TableHead>
                <TableHead className="w-[7.5rem] text-end">
                  {t("Actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("Loading...")}
                    </span>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <span className="flex justify-center items-center bg-muted rounded-2xl w-12 h-12 text-muted-foreground">
                        <Building2 className="w-5 h-5" />
                      </span>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground text-sm">
                          {t("No branches configured yet.")}
                        </p>
                        <p className="max-w-sm text-muted-foreground text-xs leading-relaxed">
                          {t(
                            "Add your office locations so employees can be assigned to a branch.",
                          )}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 rounded-xl"
                        onClick={openCreate}
                      >
                        <Plus className="w-4 h-4" />
                        {t("Add Branch")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((branch) => (
                  <TableRow key={branch.id} className="group">
                    <TableCell>
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="flex justify-center items-center bg-primary/10 mt-0.5 rounded-xl w-9 h-9 text-primary shrink-0">
                          <Building2 className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-medium text-foreground text-sm truncate">
                            {bilingualLabel(branch, language)}
                          </p>
                          <p
                            className="text-muted-foreground text-xs truncate"
                            dir={language === "ar" ? "ltr" : "rtl"}
                          >
                            {language === "ar" ? branch.name_en : branch.name_ar}
                          </p>
                          <div className="sm:hidden space-y-1 pt-1.5">
                            {branch.address ? (
                              <p className="flex items-start gap-1.5 text-muted-foreground text-xs">
                                <MapPin className="mt-0.5 w-3 h-3 shrink-0" />
                                <span>{branch.address}</span>
                              </p>
                            ) : null}
                            {branch.phone ? (
                              <p
                                className="flex items-center gap-1.5 text-muted-foreground text-xs"
                                dir="ltr"
                              >
                                <Phone className="w-3 h-3 shrink-0" />
                                {branch.phone}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell max-w-[16rem]">
                      <span className="text-muted-foreground text-sm line-clamp-2">
                        {branch.address || "—"}
                      </span>
                    </TableCell>
                    <TableCell
                      className="hidden md:table-cell font-medium text-sm tabular-nums"
                      dir="ltr"
                    >
                      {branch.phone || "—"}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-xl w-9 h-9 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(branch)}
                          aria-label={t("Edit Branch")}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-xl w-9 h-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => openDelete(branch)}
                          aria-label={t("Delete Branch")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </SettingsTableShell>
      </SettingsSection>

      <Dialog
        open={formOpen}
        onOpenChange={(next) => {
          if (!save.isPending) setFormOpen(next);
        }}
      >
        <DialogContent className="gap-0 p-0 sm:max-w-lg overflow-hidden sm:rounded-2xl">
          <div className="relative px-6 pt-6 pb-4">
            <div
              className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] to-transparent pointer-events-none"
              aria-hidden
            />
            <DialogHeader className="relative space-y-3">
              <div className="flex justify-center items-center mx-auto bg-primary/10 ring-4 ring-primary/10 rounded-2xl w-12 h-12 text-primary">
                {editing ? (
                  <Edit2 className="w-5 h-5" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1.5 text-center sm:text-start">
                <DialogTitle className="font-outfit text-lg">
                  {editing ? t("Edit Branch") : t("Add Branch")}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                  {editing
                    ? t("Update this branch name and contact details.")
                    : t(
                        "Add an office location employees can be assigned to.",
                      )}
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="relative gap-4 grid sm:grid-cols-2 mt-5">
              <div className="space-y-2">
                <Label htmlFor={nameEnId} className="text-xs">
                  {t("Name")} (EN)
                </Label>
                <Input
                  id={nameEnId}
                  dir="ltr"
                  className="bg-background rounded-xl h-11"
                  value={form.name_en}
                  disabled={save.isPending}
                  placeholder="Downtown Dubai HQ"
                  onChange={(e) => change("name_en", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={nameArId} className="text-xs">
                  {t("Name")} (AR)
                </Label>
                <Input
                  id={nameArId}
                  dir="rtl"
                  className="bg-background rounded-xl h-11"
                  value={form.name_ar}
                  disabled={save.isPending}
                  placeholder="المقر الرئيسي"
                  onChange={(e) => change("name_ar", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={addressId} className="text-xs">
                  {t("Address")}
                </Label>
                <Input
                  id={addressId}
                  className="bg-background rounded-xl h-11"
                  value={form.address}
                  disabled={save.isPending}
                  placeholder={t("Office address")}
                  onChange={(e) => change("address", e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs">{t("Phone")}</Label>
                <PhoneInput
                  value={form.phone || undefined}
                  onChange={(value) => change("phone", value ?? "")}
                  disabled={save.isPending}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="bg-muted/30 px-6 py-4 border-t border-border/60 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending}
              className="rounded-xl"
              onClick={() => setFormOpen(false)}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              disabled={save.isPending || !canSave}
              className="gap-1.5 rounded-xl"
              onClick={submitForm}
            >
              {save.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editing ? (
                <Edit2 className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {editing ? t("Save Changes") : t("Add Branch")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(next) => {
          if (!remove.isPending) setDeleteOpen(next);
        }}
      >
        <DialogContent className="gap-0 p-0 sm:max-w-md overflow-hidden sm:rounded-2xl">
          <div className="relative px-6 pt-6 pb-4">
            <div
              className="absolute inset-0 bg-gradient-to-b from-destructive/[0.08] to-transparent pointer-events-none"
              aria-hidden
            />
            <DialogHeader className="relative space-y-3">
              <div className="flex justify-center items-center mx-auto bg-destructive/10 ring-4 ring-destructive/10 rounded-2xl w-12 h-12 text-destructive">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 text-center sm:text-start">
                <DialogTitle className="font-outfit text-lg">
                  {t("Delete Branch")}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                  {t(
                    "This will remove the branch from settings. Employees linked to it will keep working with no branch assigned.",
                  )}
                </DialogDescription>
              </div>
            </DialogHeader>

            {deleting ? (
              <div className="relative flex items-start gap-3 bg-muted/50 mt-5 p-3 border border-border/60 rounded-xl">
                <span className="flex justify-center items-center bg-background border border-border/50 rounded-xl w-10 h-10 text-muted-foreground shrink-0">
                  <Building2 className="w-4 h-4" />
                </span>
                <div className="min-w-0 space-y-0.5 text-start">
                  <p className="font-medium text-foreground text-sm truncate">
                    {bilingualLabel(deleting, language)}
                  </p>
                  {deleting.address ? (
                    <p className="text-muted-foreground text-xs line-clamp-2">
                      {deleting.address}
                    </p>
                  ) : null}
                  {deleting.phone ? (
                    <p className="text-muted-foreground text-xs" dir="ltr">
                      {deleting.phone}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="bg-muted/30 px-6 py-4 border-t border-border/60 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={remove.isPending}
              className="rounded-xl"
              onClick={() => setDeleteOpen(false)}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              className="gap-1.5 rounded-xl"
              onClick={confirmDelete}
            >
              {remove.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {t("Delete Branch")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
