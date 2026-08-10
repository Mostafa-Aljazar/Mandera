"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  usePropertyPublications,
  usePortalPublicConfig,
  useSetPortalPublication,
  useRefreshPfPublicationStatus,
} from "@/hooks/queries/usePortalPublishing";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { canPublishToPortals } from "@/lib/permissions";
import { validatePropertyForPortal } from "@/lib/portals/validate";
import { portalErrorI18n } from "@/lib/portals/portalErrorMessage";
import type {
  Portal,
  PortalPublicConfig,
  PropertyPublication,
  PropertyWithRelations,
} from "@/types/supabase-entities.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PORTALS: { key: Portal; labelKey: string }[] = [
  { key: "bayut", labelKey: "Bayut" },
  { key: "dubizzle", labelKey: "Dubizzle" },
  { key: "propertyfinder", labelKey: "PropertyFinder" },
];

const STATUS_TONE: Record<string, string> = {
  published: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  failed: "bg-red-500/10 text-red-700 border-red-500/20",
  unpublished: "bg-muted text-muted-foreground border-border",
  draft: "bg-muted text-muted-foreground border-border",
};

function configFor(
  portal: Portal,
  configs: PortalPublicConfig[],
): PortalPublicConfig | null {
  const platform = portal === "propertyfinder" ? "propertyfinder" : "bayut_dubizzle";
  return configs.find((c) => c.platform === platform) ?? null;
}

interface Props {
  property: PropertyWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PublishToPortalsModal({ property, isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const { currentUser } = useCompanyAuth();
  const canPublish = canPublishToPortals(currentUser?.role);
  const { data: pubs } = usePropertyPublications(property?.id);
  const { data: configs } = usePortalPublicConfig(property?.company_id);
  const setPublication = useSetPortalPublication();
  const refreshStatus = useRefreshPfPublicationStatus();

  const [pendingPortal, setPendingPortal] = React.useState<Portal | null>(null);

  // Portal errors arrive as raw English from PF. Show the Arabic copy for the
  // ones we've mapped, and PF's own wording for anything new — an untranslated
  // English reason beats a vague generic one.
  const translatePortalError = React.useCallback(
    (raw: string) => {
      const mapped = portalErrorI18n(raw);
      return mapped ? t(mapped.key, mapped.values) : raw;
    },
    [t],
  );

  // PF can reject a listing after our publish-time poll has given up, leaving
  // the row stuck on "pending". Opening this dialog is the one moment someone
  // is actually looking at the status, so re-check once per open. The action
  // no-ops server-side unless there is a pending PropertyFinder row.
  const propertyId = property?.id;
  const refreshMutate = refreshStatus.mutate;
  React.useEffect(() => {
    if (isOpen && propertyId) refreshMutate(propertyId);
  }, [isOpen, propertyId, refreshMutate]);

  if (!property) return null;

  const isPaused = Boolean(property.paused_at);

  const pubByPortal = (portal: Portal): PropertyPublication | undefined =>
    (pubs ?? []).find((p) => p.platform === portal);

  const isEnabled = (portal: Portal) => {
    const status = pubByPortal(portal)?.status;
    return status === "published" || status === "pending";
  };

  const handleToggle = async (portal: Portal, enabled: boolean) => {
    if (!canPublish) {
      toast.error(t("Only administrators and managers can publish to portals."));
      return;
    }
    if (enabled && property.approval_status !== "approved") {
      toast.error(t("Approve before publishing"));
      return;
    }
    if (enabled && isPaused) {
      toast.error(t("Unpause the property before publishing."));
      return;
    }
    setPendingPortal(portal);
    try {
      const result = await setPublication.mutateAsync({
        propertyId: property.id,
        portal,
        enabled,
      });
      if (result.error) throw new Error(result.error);
      toast.success(
        enabled ? t("Publishing requested") : t("Unpublished"),
      );
    } catch (err) {
      const raw = (err as Error).message;
      toast.error(raw ? translatePortalError(raw) : t("Failed to update publication"));
    } finally {
      setPendingPortal(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t("Publish to Portals")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {PORTALS.map(({ key, labelKey }) => {
            const config = configFor(key, configs ?? []);
            const configured = !!config && config.enabled;
            const pub = pubByPortal(key);
            const enabled = isEnabled(key);
            const missing = configured
              ? validatePropertyForPortal(property, key, config)
              : [];
            const busy = pendingPortal === key;
            const notApproved = property.approval_status !== "approved";
            const blocked =
              !canPublish ||
              !configured ||
              notApproved ||
              (!enabled && (missing.length > 0 || isPaused));

            return (
              <div
                key={key}
                className="flex flex-col gap-2 p-4 border border-border/60 rounded-xl bg-card"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold">{t(labelKey)}</span>
                    {pub && (
                      <Badge
                        variant="outline"
                        className={cn("text-[11px] capitalize", STATUS_TONE[pub.status])}
                      >
                        {t(pub.status)}
                      </Badge>
                    )}
                  </div>
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Switch
                      checked={enabled}
                      disabled={blocked || setPublication.isPending}
                      onCheckedChange={(v) => handleToggle(key, v)}
                    />
                  )}
                </div>

                {!canPublish && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {t("Only administrators and managers can publish to portals.")}
                  </p>
                )}

                {canPublish && isPaused && !enabled && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {t("Unpause the property before publishing.")}
                  </p>
                )}

                {!configured && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Settings2 className="w-3.5 h-3.5" />
                    {t("Not available yet — the administrator hasn't enabled this portal.")}
                  </p>
                )}

                {configured && !enabled && missing.length > 0 && (
                  <p className="flex items-start gap-1.5 text-xs text-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      {t("Missing")}: {missing.join(", ")}
                    </span>
                  </p>
                )}

                {pub?.status === "failed" && pub.last_error && (
                  <p className="text-xs text-red-700 break-words">
                    {translatePortalError(pub.last_error)}
                  </p>
                )}

                {key === "bayut" || key === "dubizzle" ? (
                  <p className="text-[11px] text-muted-foreground">
                    {t("Goes live on the next portal feed sync.")}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
