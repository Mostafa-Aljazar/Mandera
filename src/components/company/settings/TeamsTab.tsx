"use client";

import { useEffect, useId, useState } from "react";
import { Edit2, Loader2, Plus, Trash2, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { bilingualLabel } from "@/lib/bilingualLabel";
import {
  useCompanyTeams,
  useDeleteCompanyTeam,
  useUpsertCompanyTeam,
} from "@/hooks/queries/useCompanyExtendedSettings";
import type { CompanyTeam } from "@/actions/companyExtendedSettings";
import SettingsSection from "./SettingsSection";
import SettingsTableShell from "./SettingsTableShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function TeamsTab() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { company } = useCompanyAuth();
  const { data = [], isLoading } = useCompanyTeams(company?.id);
  const save = useUpsertCompanyTeam();
  const remove = useDeleteCompanyTeam();

  const nameEnId = useId();
  const nameArId = useId();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyTeam | null>(null);
  const [deleting, setDeleting] = useState<CompanyTeam | null>(null);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");

  useEffect(() => {
    if (!formOpen) {
      setEditing(null);
      setNameEn("");
      setNameAr("");
    }
  }, [formOpen]);

  useEffect(() => {
    if (!deleteOpen) setDeleting(null);
  }, [deleteOpen]);

  const openCreate = () => {
    setEditing(null);
    setNameEn("");
    setNameAr("");
    setFormOpen(true);
  };

  const openEdit = (team: CompanyTeam) => {
    setEditing(team);
    setNameEn(team.name_en);
    setNameAr(team.name_ar);
    setFormOpen(true);
  };

  const openDelete = (team: CompanyTeam) => {
    setDeleting(team);
    setDeleteOpen(true);
  };

  const submitForm = async () => {
    if (!company?.id || !nameEn.trim() || !nameAr.trim()) return;
    try {
      const result = await save.mutateAsync({
        id: editing?.id,
        companyId: company.id,
        name_en: nameEn.trim(),
        name_ar: nameAr.trim(),
      });
      if (result.error) throw new Error(result.error);
      toast.success(
        editing ? t("Team updated successfully.") : t("Team added successfully."),
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
      toast.success(t("Team deleted successfully."));
      setDeleteOpen(false);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const canSave = nameEn.trim().length > 0 && nameAr.trim().length > 0;

  return (
    <>
      <SettingsSection
        title={t("Teams")}
        description={t("Organize employees into company teams.")}
        icon={UsersRound}
        action={
          <Button
            size="sm"
            className="gap-2 w-full sm:w-auto h-9"
            onClick={openCreate}
          >
            <Plus className="w-4 h-4" />
            {t("Add Team")}
          </Button>
        }
      >
        <SettingsTableShell>
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-start">{`${t("Name")} (EN)`}</TableHead>
                <TableHead className="text-start">{`${t("Name")} (AR)`}</TableHead>
                <TableHead className="w-[120px] text-end">{t("Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-12 text-muted-foreground text-center"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("Loading...")}
                    </span>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-10 text-muted-foreground text-center"
                  >
                    {t("No teams configured yet.")}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((team) => (
                  <TableRow key={team.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-start">
                      <span dir="ltr" className="inline-block">
                        {team.name_en}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-start">
                      <span dir="rtl" className="inline-block">
                        {team.name_ar}
                      </span>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="inline-flex gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-muted-foreground hover:text-primary"
                          onClick={() => openEdit(team)}
                          aria-label={t("Edit Team")}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-muted-foreground hover:text-destructive"
                          onClick={() => openDelete(team)}
                          aria-label={t("Delete Team")}
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
        <DialogContent className="gap-0 p-0 sm:max-w-md overflow-hidden sm:rounded-2xl">
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
                  {editing ? t("Edit Team") : t("Add Team")}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                  {editing
                    ? t("Update the English and Arabic names for this team.")
                    : t(
                        "Add a team so employees can be assigned or moved between teams.",
                      )}
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="relative gap-4 grid sm:grid-cols-2 mt-5">
              <div className="space-y-2">
                <Label htmlFor={nameEnId} className="text-xs">
                  {t("English name")}
                </Label>
                <Input
                  id={nameEnId}
                  dir="ltr"
                  className="bg-background rounded-xl h-11"
                  value={nameEn}
                  disabled={save.isPending}
                  placeholder="Downtown Dubai Team"
                  onChange={(e) => setNameEn(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={nameArId} className="text-xs">
                  {t("Arabic name")}
                </Label>
                <Input
                  id={nameArId}
                  dir="rtl"
                  className="bg-background rounded-xl h-11"
                  value={nameAr}
                  disabled={save.isPending}
                  placeholder="فريق داون تاون دبي"
                  onChange={(e) => setNameAr(e.target.value)}
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
              {editing ? t("Save Changes") : t("Add Team")}
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
                  {t("Delete Team")}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                  {t(
                    "This will remove the team from settings. Employees linked to it will keep working with no team assigned.",
                  )}
                </DialogDescription>
              </div>
            </DialogHeader>

            {deleting ? (
              <div className="relative flex items-start gap-3 bg-muted/50 mt-5 p-3 border border-border/60 rounded-xl">
                <span className="flex justify-center items-center bg-background border border-border/50 rounded-xl w-10 h-10 text-muted-foreground shrink-0">
                  <UsersRound className="w-4 h-4" />
                </span>
                <div className="min-w-0 space-y-0.5 text-start">
                  <p className="font-medium text-foreground text-sm truncate">
                    {bilingualLabel(deleting, language)}
                  </p>
                  <p
                    className="text-muted-foreground text-xs truncate"
                    dir={language === "ar" ? "ltr" : "rtl"}
                  >
                    {language === "ar" ? deleting.name_en : deleting.name_ar}
                  </p>
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
              {t("Delete Team")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
