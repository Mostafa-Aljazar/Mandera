"use client";

import { useEffect, useState } from "react";
import { Info, Loader2, Send } from "lucide-react";
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
    require_approval_before_publish: true,
    auto_unpublish_on_pause: false,
  });

  useEffect(() => {
    if (!data) return;
    setSettings({
      require_approval_before_publish:
        data.publish_settings.require_approval_before_publish !== false,
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
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <SettingsSection
      title={t("Publish Settings")}
      description={t(
        "Control how listings go to Bayut, dubizzle, and PropertyFinder.",
      )}
      icon={Send}
      action={
        <Button
          disabled={update.isPending}
          onClick={save}
          className="gap-2 rounded-xl h-9"
        >
          {update.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("Saving...")}
            </>
          ) : (
            t("Save")
          )}
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 bg-sky-500/[0.06] p-4 border border-sky-500/20 rounded-xl">
          <span className="flex justify-center items-center bg-sky-500/10 mt-0.5 rounded-lg w-8 h-8 text-sky-800 shrink-0">
            <Info className="w-4 h-4" />
          </span>
          <div className="space-y-2 min-w-0 text-sm text-start">
            <p className="font-medium text-foreground">
              {t("How publish settings work")}
            </p>
            <ul className="space-y-1.5 text-muted-foreground text-xs sm:text-sm leading-relaxed">
              <li>
                <span className="font-medium text-foreground">
                  {t("Require approval before publish")}
                </span>
                {" — "}
                {t(
                  "When on, only approved properties can be published to portals. Used when publishing to Bayut, dubizzle, or PropertyFinder.",
                )}
              </li>
              <li>
                <span className="font-medium text-foreground">
                  {t("Automatically unpublish when paused")}
                </span>
                {" — "}
                {t(
                  "When on, pausing a property also removes it from all portals automatically.",
                )}
              </li>
            </ul>
          </div>
        </div>

        <div className="divide-y divide-border/60 border border-border/60 rounded-xl overflow-hidden">
          <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
            <div className="min-w-0 space-y-1 text-start">
              <label
                htmlFor="require-publish-approval"
                className="font-medium text-sm cursor-pointer"
              >
                {t("Require approval before publish")}
              </label>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {t(
                  "Blocks portal publish until the listing approval status is Approved. Default is on.",
                )}
              </p>
            </div>
            <Switch
              id="require-publish-approval"
              checked={settings.require_approval_before_publish}
              onCheckedChange={(checked) =>
                setSettings((current) => ({
                  ...current,
                  require_approval_before_publish: checked,
                }))
              }
              className="mt-0.5 shrink-0"
            />
          </div>

          <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
            <div className="min-w-0 space-y-1 text-start">
              <label
                htmlFor="auto-unpublish-pause"
                className="font-medium text-sm cursor-pointer"
              >
                {t("Automatically unpublish when paused")}
              </label>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {t(
                  "When a manager pauses a listing, it is unpublished from every connected portal. Default is off.",
                )}
              </p>
            </div>
            <Switch
              id="auto-unpublish-pause"
              checked={settings.auto_unpublish_on_pause}
              onCheckedChange={(checked) =>
                setSettings((current) => ({
                  ...current,
                  auto_unpublish_on_pause: checked,
                }))
              }
              className="mt-0.5 shrink-0"
            />
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
