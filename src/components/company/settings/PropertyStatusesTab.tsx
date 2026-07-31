"use client";

import { useEffect, useState } from "react";
import { ListOrdered } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { PROPERTY_STATUS_OPTIONS } from "@/lib/permissions";

type StatusRow = {
  key: string;
  name_en: string;
  name_ar: string;
  enabled: boolean;
  is_final: boolean;
};

const FINAL_KEYS = new Set([
  "Sold",
  "Rented",
  "Unavailable",
  "Archived",
  "Cancelled",
  "Deal Completed",
]);

function defaultRows(): StatusRow[] {
  return PROPERTY_STATUS_OPTIONS.map((key) => ({
    key,
    name_en: key,
    name_ar: key,
    enabled: true,
    is_final: FINAL_KEYS.has(key),
  }));
}

export default function PropertyStatusesTab() {
  const { t } = useTranslation();
  const { company } = useCompanyAuth();
  const { data } = useCompanyJsonSettings(company?.id);
  const update = useUpdateCompanyJsonSettings();
  const [rows, setRows] = useState<StatusRow[]>(defaultRows);

  useEffect(() => {
    if (!data) return;
    const saved = data.publish_settings?.property_statuses;
    if (Array.isArray(saved) && saved.length > 0) {
      const byKey = new Map(
        saved
          .filter((item): item is StatusRow =>
            Boolean(item && typeof item === "object" && "key" in item),
          )
          .map((item) => [String((item as StatusRow).key), item as StatusRow]),
      );
      setRows(
        PROPERTY_STATUS_OPTIONS.map((key) => {
          const existing = byKey.get(key);
          return (
            existing ?? {
              key,
              name_en: key,
              name_ar: key,
              enabled: true,
              is_final: FINAL_KEYS.has(key),
            }
          );
        }),
      );
      return;
    }
    setRows(defaultRows());
  }, [data]);

  const save = async () => {
    if (!company?.id || !data) return;
    try {
      await update.mutateAsync({
        companyId: company.id,
        patch: {
          publish_settings: {
            ...data.publish_settings,
            property_statuses: rows,
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
      title={t("Property Statuses")}
      description={t(
        "Enable, rename, and mark final property statuses used across the company.",
      )}
      icon={ListOrdered}
    >
      <div className="space-y-3 p-4 sm:p-5">
        {rows.map((row, index) => (
          <div
            key={row.key}
            className="grid gap-2 sm:grid-cols-[auto_1fr_1fr_auto] items-center rounded-xl border border-border/50 bg-muted/10 p-3"
          >
            <Switch
              checked={row.enabled}
              onCheckedChange={(checked) =>
                setRows((current) =>
                  current.map((item, i) =>
                    i === index ? { ...item, enabled: checked } : item,
                  ),
                )
              }
            />
            <Input
              value={row.name_en}
              onChange={(e) =>
                setRows((current) =>
                  current.map((item, i) =>
                    i === index ? { ...item, name_en: e.target.value } : item,
                  ),
                )
              }
              placeholder={t("Name (EN)")}
              className="h-9"
            />
            <Input
              value={row.name_ar}
              onChange={(e) =>
                setRows((current) =>
                  current.map((item, i) =>
                    i === index ? { ...item, name_ar: e.target.value } : item,
                  ),
                )
              }
              placeholder={t("Name (AR)")}
              className="h-9"
              dir="rtl"
            />
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
              <input
                type="checkbox"
                checked={row.is_final}
                onChange={(e) =>
                  setRows((current) =>
                    current.map((item, i) =>
                      i === index
                        ? { ...item, is_final: e.target.checked }
                        : item,
                    ),
                  )
                }
              />
              {t("Final")}
            </label>
          </div>
        ))}
        <Button disabled={update.isPending} onClick={save}>
          {update.isPending ? t("Saving...") : t("Save")}
        </Button>
      </div>
    </SettingsSection>
  );
}
