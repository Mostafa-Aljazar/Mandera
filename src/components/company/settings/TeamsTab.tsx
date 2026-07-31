"use client";

import { useState } from "react";
import { Edit2, Plus, Trash2, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
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

export default function TeamsTab() {
  const { t } = useTranslation();
  const { company } = useCompanyAuth();
  const { data = [] } = useCompanyTeams(company?.id);
  const save = useUpsertCompanyTeam();
  const remove = useDeleteCompanyTeam();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyTeam | null>(null);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");

  const reset = () => {
    setEditing(null);
    setNameEn("");
    setNameAr("");
  };
  const submit = async () => {
    if (!company?.id || !nameEn.trim() || !nameAr.trim()) return;
    try {
      await save.mutateAsync({
        id: editing?.id,
        companyId: company.id,
        name_en: nameEn,
        name_ar: nameAr,
      });
      toast.success(t("Saved successfully."));
      setOpen(false);
      reset();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <SettingsSection
      title={t("Teams")}
      description={t("Organize employees into company teams.")}
      icon={UsersRound}
      action={
        <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) reset(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />{t("Add Team")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? t("Edit Team") : t("Add Team")}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div><label className="text-sm font-medium">{t("Name")} (EN)</label><Input dir="ltr" value={nameEn} onChange={(e) => setNameEn(e.target.value)} /></div>
              <div><label className="text-sm font-medium">{t("Name")} (AR)</label><Input dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} /></div>
            </div>
            <DialogFooter><Button disabled={save.isPending || !nameEn.trim() || !nameAr.trim()} onClick={submit}>{t("Save")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <SettingsTableShell>
        <Table>
          <TableHeader><TableRow><TableHead>{t("Name")} (EN)</TableHead><TableHead>{t("Name")} (AR)</TableHead><TableHead className="text-end">{t("Actions")}</TableHead></TableRow></TableHeader>
          <TableBody>
            {data.length === 0 ? <TableRow><TableCell colSpan={3} className="py-10 text-center text-muted-foreground">{t("No teams configured yet.")}</TableCell></TableRow> : data.map((team) => (
              <TableRow key={team.id}>
                <TableCell dir="ltr">{team.name_en}</TableCell><TableCell dir="rtl">{team.name_ar}</TableCell>
                <TableCell className="text-end">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(team); setNameEn(team.name_en); setNameAr(team.name_ar); setOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={async () => { if (!company?.id || !confirm(t("Are you sure you want to delete this item?"))) return; try { await remove.mutateAsync({ id: team.id, companyId: company.id }); toast.success(t("Deleted successfully.")); } catch (error) { toast.error((error as Error).message); } }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SettingsTableShell>
    </SettingsSection>
  );
}
