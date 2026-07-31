"use client";

import { useState } from "react";
import { Building, Edit2, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { CompanyBranch } from "@/actions/companyExtendedSettings";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  useCompanyBranches,
  useDeleteCompanyBranch,
  useUpsertCompanyBranch,
} from "@/hooks/queries/useCompanyExtendedSettings";
import SettingsSection from "./SettingsSection";
import SettingsTableShell from "./SettingsTableShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function BranchesTab() {
  const { t } = useTranslation();
  const { company } = useCompanyAuth();
  const { data = [] } = useCompanyBranches(company?.id);
  const save = useUpsertCompanyBranch();
  const remove = useDeleteCompanyBranch();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyBranch | null>(null);
  const [form, setForm] = useState({ name_en: "", name_ar: "", address: "", phone: "" });
  const reset = () => { setEditing(null); setForm({ name_en: "", name_ar: "", address: "", phone: "" }); };
  const change = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    if (!company?.id || !form.name_en.trim() || !form.name_ar.trim()) return;
    try {
      await save.mutateAsync({ id: editing?.id, companyId: company.id, ...form });
      toast.success(t("Saved successfully."));
      setOpen(false);
      reset();
    } catch (error) { toast.error((error as Error).message); }
  };
  return (
    <SettingsSection title={t("Branches")} description={t("Manage company office branches and contact details.")} icon={Building} action={
      <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) reset(); }}>
        <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />{t("Add Branch")}</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t("Edit Branch") : t("Add Branch")}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div><label className="text-sm font-medium">{t("Name")} (EN)</label><Input dir="ltr" value={form.name_en} onChange={(e) => change("name_en", e.target.value)} /></div>
            <div><label className="text-sm font-medium">{t("Name")} (AR)</label><Input dir="rtl" value={form.name_ar} onChange={(e) => change("name_ar", e.target.value)} /></div>
            <div><label className="text-sm font-medium">{t("Address")}</label><Input value={form.address} onChange={(e) => change("address", e.target.value)} /></div>
            <div><label className="text-sm font-medium">{t("Phone")}</label><Input dir="ltr" value={form.phone} onChange={(e) => change("phone", e.target.value)} /></div>
          </div>
          <DialogFooter><Button disabled={save.isPending || !form.name_en.trim() || !form.name_ar.trim()} onClick={submit}>{t("Save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    }>
      <SettingsTableShell><Table>
        <TableHeader><TableRow><TableHead>{t("Name")}</TableHead><TableHead>{t("Address")}</TableHead><TableHead>{t("Phone")}</TableHead><TableHead className="text-end">{t("Actions")}</TableHead></TableRow></TableHeader>
        <TableBody>{data.length === 0 ? <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">{t("No branches configured yet.")}</TableCell></TableRow> : data.map((branch) => (
          <TableRow key={branch.id}><TableCell><div dir="ltr">{branch.name_en}</div><div dir="rtl" className="text-muted-foreground text-xs">{branch.name_ar}</div></TableCell><TableCell>{branch.address || "—"}</TableCell><TableCell dir="ltr">{branch.phone || "—"}</TableCell><TableCell className="text-end">
            <Button variant="ghost" size="icon" onClick={() => { setEditing(branch); setForm({ name_en: branch.name_en, name_ar: branch.name_ar, address: branch.address || "", phone: branch.phone || "" }); setOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={async () => { if (!company?.id || !confirm(t("Are you sure you want to delete this item?"))) return; try { await remove.mutateAsync({ id: branch.id, companyId: company.id }); toast.success(t("Deleted successfully.")); } catch (error) { toast.error((error as Error).message); } }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </TableCell></TableRow>
        ))}</TableBody>
      </Table></SettingsTableShell>
    </SettingsSection>
  );
}
