"use client";

import { useEffect, useState } from "react";
import { Info, ListOrdered, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  useCompanyJsonSettings,
  useUpdateCompanyJsonSettings,
} from "@/hooks/queries/useCompanyExtendedSettings";
import {
  resolveCompanyPropertyStatuses,
  type CompanyPropertyStatus,
} from "@/lib/propertyStatuses";
import SettingsSection from "./SettingsSection";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export default function PropertyStatusesTab() {
  const { t } = useTranslation();
  const { company } = useCompanyAuth();
  const { data } = useCompanyJsonSettings(company?.id);
  const update = useUpdateCompanyJsonSettings();
  const [rows, setRows] = useState<CompanyPropertyStatus[]>(() =>
    resolveCompanyPropertyStatuses(undefined),
  );

  useEffect(() => {
    if (!data) return;
    setRows(
      resolveCompanyPropertyStatuses(
        data.publish_settings as Record<string, unknown> | undefined,
      ),
    );
  }, [data]);

  const updateRow = (
    index: number,
    patch: Partial<CompanyPropertyStatus>,
  ) => {
    setRows((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

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
        "Choose which property statuses appear in forms, and rename them in English and Arabic.",
      )}
      icon={ListOrdered}
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
              {t("How property statuses work")}
            </p>
            <ul className="space-y-1.5 text-muted-foreground text-xs sm:text-sm leading-relaxed">
              <li>
                <span className="font-medium text-foreground">
                  {t("Show in forms")}
                </span>
                {" — "}
                {t(
                  "Turn on to show this status when creating or updating a property. Turn off to hide it.",
                )}
              </li>
              <li>
                <span className="font-medium text-foreground">
                  {t("English / Arabic name")}
                </span>
                {" — "}
                {t(
                  "Two labels for the same status: one for English UI, one for Arabic UI. They are not duplicates.",
                )}
              </li>
              <li>
                <span className="font-medium text-foreground">
                  {t("Closing status")}
                </span>
                {" — "}
                {t(
                  "Closing statuses (Sold, Rented…) end the listing. Sales agents usually need approval; managers apply them directly.",
                )}
              </li>
            </ul>
          </div>
        </div>

        <div className="hidden sm:grid grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)_7.5rem] items-end gap-3 px-1 text-muted-foreground text-[11px] font-medium ltr:uppercase tracking-wide">
          <span>{t("Show")}</span>
          <span>{t("English name")}</span>
          <span>{t("Arabic name")}</span>
          <span className="text-end">{t("Closing?")}</span>
        </div>

        <div className="space-y-2.5">
          {rows.map((row, index) => (
            <div
              key={row.key}
              className={cn(
                "gap-3 grid sm:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)_7.5rem] items-center p-3 sm:p-3.5 border rounded-xl transition-colors",
                row.enabled
                  ? "bg-card border-border/60"
                  : "bg-muted/30 border-border/40 opacity-70",
              )}
            >
              <div className="flex sm:flex-col items-center sm:items-start gap-2">
                <Switch
                  checked={row.enabled}
                  onCheckedChange={(checked) =>
                    updateRow(index, { enabled: checked })
                  }
                  aria-label={t("Show in forms")}
                />
                <span className="sm:hidden text-muted-foreground text-xs">
                  {row.enabled ? t("Visible") : t("Hidden")}
                </span>
                <span className="hidden sm:block text-muted-foreground text-[10px] leading-tight">
                  {row.enabled ? t("Visible") : t("Hidden")}
                </span>
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label className="sm:hidden text-muted-foreground text-[11px]">
                  {t("English name")}
                </Label>
                <Input
                  value={row.name_en}
                  onChange={(e) =>
                    updateRow(index, { name_en: e.target.value })
                  }
                  placeholder={t("e.g. Available")}
                  className="bg-background rounded-xl h-10"
                  dir="ltr"
                  disabled={!row.enabled}
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label className="sm:hidden text-muted-foreground text-[11px]">
                  {t("Arabic name")}
                </Label>
                <Input
                  value={row.name_ar}
                  onChange={(e) =>
                    updateRow(index, { name_ar: e.target.value })
                  }
                  placeholder={t("e.g. متاح")}
                  className="bg-background rounded-xl h-10"
                  dir="rtl"
                  disabled={!row.enabled}
                />
              </div>

              <label
                className={cn(
                  "inline-flex justify-start sm:justify-end items-center gap-2 rounded-xl px-2 py-2 text-xs cursor-pointer select-none",
                  row.is_final
                    ? "text-amber-900 bg-amber-500/10"
                    : "text-muted-foreground",
                )}
              >
                <Checkbox
                  checked={row.is_final}
                  onCheckedChange={(checked) =>
                    updateRow(index, { is_final: checked === true })
                  }
                  disabled={!row.enabled}
                />
                <span className="whitespace-nowrap">
                  {t("Closing status")}
                </span>
              </label>
            </div>
          ))}
        </div>

        <p className="text-muted-foreground text-xs leading-relaxed">
          {t(
            "These statuses appear in Add/Edit Property and in the property status update panel.",
          )}
        </p>
      </div>
    </SettingsSection>
  );
}
