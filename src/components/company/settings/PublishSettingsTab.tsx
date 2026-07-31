"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
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

export default function PublishSettingsTab() {
  const { t } = useTranslation();
  const { company } = useCompanyAuth();
  const { data } = useCompanyJsonSettings(company?.id);
  const update = useUpdateCompanyJsonSettings();
  const [settings, setSettings] = useState({
    require_approval_before_publish: false,
    auto_unpublish_on_pause: false,
  });

  useEffect(() => {
    if (!data) return;
    setSettings({
      require_approval_before_publish:
        data.publish_settings.require_approval_before_publish === true,
      auto_unpublish_on_pause:
        data.publish_settings.auto_unpublish_on_pause === true,
    });
  }, [data]);

  const save = async () => {
    if (!company?.id || !data) return;
    try {
      await update.mutateAsync({
        companyId: company.id,
        patch: {
          publish_settings: {
            ...data.publish_settings,
            ...settings,
          },
        },
      });
      toast.success(t("Saved successfully."));
    } catch (error) { toast.error((error as Error).message); }
  };

  return (
    <SettingsSection title={t("Publish Settings")} description={t("Control approval and automatic unpublishing behavior.")} icon={Send}>
      <div className="divide-y divide-border/60">
        <div className="flex items-center justify-between gap-4 p-5">
          <label htmlFor="require-publish-approval" className="text-sm font-medium">{t("Require approval before publish")}</label>
          <Switch id="require-publish-approval" checked={settings.require_approval_before_publish} onCheckedChange={(checked) => setSettings((current) => ({ ...current, require_approval_before_publish: checked }))} />
        </div>
        <div className="flex items-center justify-between gap-4 p-5">
          <label htmlFor="auto-unpublish-pause" className="text-sm font-medium">{t("Automatically unpublish when paused")}</label>
          <Switch id="auto-unpublish-pause" checked={settings.auto_unpublish_on_pause} onCheckedChange={(checked) => setSettings((current) => ({ ...current, auto_unpublish_on_pause: checked }))} />
        </div>
      </div>
      <div className="p-5 pt-3"><Button disabled={update.isPending} onClick={save}>{update.isPending ? t("Saving...") : t("Save")}</Button></div>
    </SettingsSection>
  );
}
