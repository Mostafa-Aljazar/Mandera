"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  useCompanyJsonSettings,
  useUpdateCompanyJsonSettings,
} from "@/hooks/queries/useCompanyExtendedSettings";
import SettingsSection from "./SettingsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function WhatsAppSettingsTab() {
  const { t } = useTranslation();
  const { company } = useCompanyAuth();
  const { data } = useCompanyJsonSettings(company?.id);
  const update = useUpdateCompanyJsonSettings();
  const [form, setForm] = useState({
    business_number: "",
    default_greeting_en: "",
    default_greeting_ar: "",
  });

  useEffect(() => {
    if (!data) return;
    const settings = data.whatsapp_settings;
    setForm({
      business_number: String(settings.business_number ?? ""),
      default_greeting_en: String(settings.default_greeting_en ?? ""),
      default_greeting_ar: String(settings.default_greeting_ar ?? ""),
    });
  }, [data]);

  const save = async () => {
    if (!company?.id) return;
    try {
      await update.mutateAsync({
        companyId: company.id,
        patch: { whatsapp_settings: form },
      });
      toast.success(t("Saved successfully."));
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <SettingsSection
      title={t("WhatsApp Settings")}
      description={t("Configure the business number and default bilingual greeting.")}
      icon={MessageCircle}
    >
      <div className="space-y-5 p-5">
        <div>
          <label className="text-sm font-medium">{t("Business Number")}</label>
          <Input dir="ltr" className="mt-1.5" value={form.business_number} onChange={(e) => setForm((current) => ({ ...current, business_number: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium">{t("Default Greeting")} (EN)</label>
          <Textarea dir="ltr" className="mt-1.5" rows={4} value={form.default_greeting_en} onChange={(e) => setForm((current) => ({ ...current, default_greeting_en: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium">{t("Default Greeting")} (AR)</label>
          <Textarea dir="rtl" className="mt-1.5" rows={4} value={form.default_greeting_ar} onChange={(e) => setForm((current) => ({ ...current, default_greeting_ar: e.target.value }))} />
        </div>
        <Button disabled={update.isPending} onClick={save}>{update.isPending ? t("Saving...") : t("Save")}</Button>
      </div>
    </SettingsSection>
  );
}
