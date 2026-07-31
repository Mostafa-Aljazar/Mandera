"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  useCompanyJsonSettings,
  useUpdateCompanyJsonSettings,
} from "@/hooks/queries/useCompanyExtendedSettings";
import SettingsSection from "./SettingsSection";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const NOTIFICATION_OPTIONS = [
  ["property_created", "New property created"],
  ["property_pending_review", "Property pending review"],
  ["property_resubmitted", "Property resubmitted"],
  ["property_change_request", "Property change request"],
  ["property_images_added", "Property images added"],
  ["property_images_removal_request", "Property image deletion requested"],
  ["property_status_change_request", "Property status change request"],
  ["property_status_changed", "Property status changed"],
  ["property_draft_stale", "Stale property draft"],
] as const;

export default function NotificationSettingsTab() {
  const { t } = useTranslation();
  const { company } = useCompanyAuth();
  const { data } = useCompanyJsonSettings(company?.id);
  const update = useUpdateCompanyJsonSettings();
  const [settings, setSettings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!data) return;
    setSettings(
      Object.fromEntries(
        NOTIFICATION_OPTIONS.map(([key]) => [
          key,
          data.notification_settings[key] !== false,
        ]),
      ),
    );
  }, [data]);

  const save = async () => {
    if (!company?.id) return;
    try {
      await update.mutateAsync({
        companyId: company.id,
        patch: { notification_settings: settings },
      });
      toast.success(t("Saved successfully."));
    } catch (error) { toast.error((error as Error).message); }
  };

  return (
    <SettingsSection title={t("Notification Settings")} description={t("Choose which events notify company administrators.")} icon={Bell}>
      <div className="divide-y divide-border/60">
        {NOTIFICATION_OPTIONS.map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-4 p-4 sm:px-5">
            <label htmlFor={`notification-${key}`} className="text-sm font-medium">{t(label)}</label>
            <Switch id={`notification-${key}`} checked={settings[key] ?? true} onCheckedChange={(checked) => setSettings((current) => ({ ...current, [key]: checked }))} />
          </div>
        ))}
      </div>
      <div className="p-5 pt-3"><Button disabled={update.isPending} onClick={save}>{update.isPending ? t("Saving...") : t("Save")}</Button></div>
    </SettingsSection>
  );
}
