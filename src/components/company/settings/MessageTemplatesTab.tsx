"use client";

import { useState } from "react";
import { Edit2, MessageSquareText, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { MessageTemplate } from "@/actions/companyExtendedSettings";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  useDeleteMessageTemplate,
  useMessageTemplates,
  useUpsertMessageTemplate,
} from "@/hooks/queries/useCompanyExtendedSettings";
import SettingsSection from "./SettingsSection";
import SettingsTableShell from "./SettingsTableShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ConfirmDialog from "@/components/common/ConfirmDialog";

const emptyForm = { name: "", channel: "whatsapp", body_en: "", body_ar: "" };

export default function MessageTemplatesTab() {
  const { t } = useTranslation();
  const { company } = useCompanyAuth();
  const { data = [] } = useMessageTemplates(company?.id);
  const save = useUpsertMessageTemplate();
  const remove = useDeleteMessageTemplate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [templatePendingDelete, setTemplatePendingDelete] = useState<MessageTemplate | null>(null);
  const handleDelete = async () => {
    if (!company?.id || !templatePendingDelete) return;
    try {
      await remove.mutateAsync({ id: templatePendingDelete.id, companyId: company.id });
      setTemplatePendingDelete(null);
      toast.success(t("Deleted successfully."));
    } catch (error) {
      toast.error((error as Error).message);
    }
  };
  const reset = () => { setEditing(null); setForm(emptyForm); };
  const change = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    if (!company?.id || !form.name.trim()) return;
    try {
      await save.mutateAsync({ id: editing?.id, companyId: company.id, ...form });
      toast.success(t("Saved successfully."));
      setOpen(false);
      reset();
    } catch (error) { toast.error((error as Error).message); }
  };
  return (
    <SettingsSection title={t("Message Templates")} description={t("Create reusable bilingual messages for customer communication.")} icon={MessageSquareText} action={
      <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) reset(); }}>
        <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />{t("Add Template")}</Button></DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? t("Edit Template") : t("Add Template")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="text-sm font-medium">{t("Name")}</label><Input value={form.name} onChange={(e) => change("name", e.target.value)} /></div>
              <div><label className="text-sm font-medium">{t("Channel")}</label><Input value={form.channel} onChange={(e) => change("channel", e.target.value)} /></div>
            </div>
            <div><label className="text-sm font-medium">{t("Message Body")} (EN)</label><Textarea dir="ltr" rows={5} value={form.body_en} onChange={(e) => change("body_en", e.target.value)} /></div>
            <div><label className="text-sm font-medium">{t("Message Body")} (AR)</label><Textarea dir="rtl" rows={5} value={form.body_ar} onChange={(e) => change("body_ar", e.target.value)} /></div>
          </div>
          <DialogFooter><Button disabled={save.isPending || !form.name.trim()} onClick={submit}>{t("Save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    }>
      <SettingsTableShell><Table>
        <TableHeader><TableRow><TableHead>{t("Name")}</TableHead><TableHead>{t("Channel")}</TableHead><TableHead>{t("Message Body")}</TableHead><TableHead className="text-end">{t("Actions")}</TableHead></TableRow></TableHeader>
        <TableBody>{data.length === 0 ? <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">{t("No message templates configured yet.")}</TableCell></TableRow> : data.map((template) => (
          <TableRow key={template.id}><TableCell className="font-medium">{template.name}</TableCell><TableCell>{template.channel}</TableCell><TableCell className="max-w-xs truncate" dir="auto">{template.body_en || template.body_ar || "—"}</TableCell><TableCell className="text-end">
            <Button variant="ghost" size="icon" onClick={() => { setEditing(template); setForm({ name: template.name, channel: template.channel, body_en: template.body_en, body_ar: template.body_ar }); setOpen(true); }}><Edit2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setTemplatePendingDelete(template)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </TableCell></TableRow>
        ))}</TableBody>
      </Table></SettingsTableShell>

      <ConfirmDialog
        open={templatePendingDelete !== null}
        onOpenChange={(next) => {
          if (!next) setTemplatePendingDelete(null);
        }}
        title={t("Delete this message template?")}
        description={t("The template will be removed permanently. This cannot be undone.")}
        detailValue={templatePendingDelete?.name ?? undefined}
        confirmLabel={t("Delete template")}
        isSubmitting={remove.isPending}
        onConfirm={handleDelete}
      />
    </SettingsSection>
  );
}
