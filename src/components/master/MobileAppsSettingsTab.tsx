"use client";

import { useEffect, useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  usePlatformSettings,
  useUpdatePlatformSettings,
} from "@/hooks/queries/usePlatformSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import PageLoading from "@/components/common/PageLoading";

type StoreDraft = {
  google_play_url: string;
  app_store_url: string;
  google_play_coming_soon: boolean;
  app_store_coming_soon: boolean;
};

const emptyDraft: StoreDraft = {
  google_play_url: "",
  app_store_url: "",
  google_play_coming_soon: true,
  app_store_coming_soon: true,
};

function StoreLinkCard({
  title,
  urlId,
  urlLabel,
  urlPlaceholder,
  url,
  comingSoon,
  onUrlChange,
  onComingSoonChange,
}: {
  title: string;
  urlId: string;
  urlLabel: string;
  urlPlaceholder: string;
  url: string;
  comingSoon: boolean;
  onUrlChange: (value: string) => void;
  onComingSoonChange: (value: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-card shadow-[var(--shadow-subtle)] p-5 sm:p-6 border border-border/60 rounded-2xl space-y-5">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="font-outfit font-semibold text-foreground text-lg tracking-tight">
            {title}
          </h2>
          <p className="mt-1 text-muted-foreground text-sm">
            {comingSoon
              ? t("master_settings_store_coming_soon_hint")
              : t("master_settings_store_live_hint")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Label htmlFor={`${urlId}-coming-soon`} className="text-sm">
            {t("Coming Soon")}
          </Label>
          <Switch
            id={`${urlId}-coming-soon`}
            checked={comingSoon}
            onCheckedChange={onComingSoonChange}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={urlId}>{urlLabel}</Label>
        <Input
          id={urlId}
          type="text"
          inputMode="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          className="rounded-xl h-11"
          placeholder={urlPlaceholder}
        />
        {!comingSoon && !url.trim() ? (
          <p className="text-muted-foreground text-xs">
            {t("master_settings_store_url_hash_hint")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function MobileAppsSettingsTab() {
  const { t } = useTranslation();
  const { data, isLoading, error } = usePlatformSettings();
  const update = useUpdatePlatformSettings();
  const [draft, setDraft] = useState<StoreDraft>(emptyDraft);

  useEffect(() => {
    if (!data) return;
    setDraft({
      google_play_url: data.google_play_url ?? "",
      app_store_url: data.app_store_url ?? "",
      google_play_coming_soon: data.google_play_coming_soon,
      app_store_coming_soon: data.app_store_coming_soon,
    });
  }, [data]);

  const save = async () => {
    try {
      await update.mutateAsync({
        google_play_url: draft.google_play_url,
        app_store_url: draft.app_store_url,
        google_play_coming_soon: draft.google_play_coming_soon,
        app_store_coming_soon: draft.app_store_coming_soon,
      });
      toast.success(t("Saved successfully."));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("master_settings_save_failed");
      toast.error(message || t("master_settings_save_failed"));
    }
  };

  if (isLoading) return <PageLoading />;

  if (error || !data) {
    return (
      <div className="bg-card p-5 sm:p-6 border border-border/60 rounded-2xl text-muted-foreground text-sm">
        {error instanceof Error
          ? error.message
          : t("master_settings_apps_load_failed")}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3">
        <div className="flex items-start gap-2.5">
          <Smartphone className="mt-0.5 w-4 h-4 text-primary shrink-0" />
          <div>
            <h2 className="font-outfit font-semibold text-foreground text-lg tracking-tight">
              {t("master_settings_apps_section")}
            </h2>
            <p className="mt-1 max-w-xl text-muted-foreground text-sm leading-relaxed">
              {t("master_settings_apps_subtitle")}
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={save}
          disabled={update.isPending}
          className="rounded-xl h-11 font-semibold min-w-[9rem] shrink-0"
        >
          {update.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("Saving...")}
            </>
          ) : (
            t("Save changes")
          )}
        </Button>
      </div>

      <StoreLinkCard
        title="Google Play"
        urlId="google_play_url"
        urlLabel={t("master_settings_google_play_url")}
        urlPlaceholder="https://play.google.com/store/apps/details?id=..."
        url={draft.google_play_url}
        comingSoon={draft.google_play_coming_soon}
        onUrlChange={(google_play_url) =>
          setDraft((prev) => ({ ...prev, google_play_url }))
        }
        onComingSoonChange={(google_play_coming_soon) =>
          setDraft((prev) => ({ ...prev, google_play_coming_soon }))
        }
      />

      <StoreLinkCard
        title="App Store"
        urlId="app_store_url"
        urlLabel={t("master_settings_app_store_url")}
        urlPlaceholder="https://apps.apple.com/app/id..."
        url={draft.app_store_url}
        comingSoon={draft.app_store_coming_soon}
        onUrlChange={(app_store_url) =>
          setDraft((prev) => ({ ...prev, app_store_url }))
        }
        onComingSoonChange={(app_store_coming_soon) =>
          setDraft((prev) => ({ ...prev, app_store_coming_soon }))
        }
      />
    </div>
  );
}
