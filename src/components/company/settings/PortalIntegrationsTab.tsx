"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { companyDisplayName } from "@/lib/bilingualLabel";
import {
  usePortalCredentials,
  useUpsertPortalCredentials,
  useRegenerateFeedToken,
  useTestPfConnection,
} from "@/hooks/queries/usePortalPublishing";
import SettingsSection from "@/components/company/settings/SettingsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Globe,
  Building2,
  RefreshCw,
  Copy,
  Loader2,
  Wifi,
  CheckCircle2,
  XCircle,
  ClipboardCopy,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConnectionDiagnosticStep } from "@/lib/portals/propertyfinder/client";

export default function PortalIntegrationsTab() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { company, currentUser } = useCompanyAuth();
  const companyId = currentUser?.company_id || company?.id;

  const { data: creds } = usePortalCredentials(companyId);
  const upsert = useUpsertPortalCredentials();
  const regenerate = useRegenerateFeedToken();
  const testConnection = useTestPfConnection();
  const [diagnostics, setDiagnostics] = useState<ConnectionDiagnosticStep[] | null>(null);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);

  const bayut = creds?.find((c) => c.platform === "bayut_dubizzle") ?? null;
  const pf = creds?.find((c) => c.platform === "propertyfinder") ?? null;

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  // PropertyFinder form state
  const [pfForm, setPfForm] = useState({
    api_key: "",
    api_secret: "",
    pf_public_profile_id: "",
    license_number: "",
    default_permit_type: "",
    enabled: false,
  });

  useEffect(() => {
    if (pf) {
      setPfForm({
        api_key: pf.api_key ?? "",
        api_secret: pf.api_secret ?? "",
        pf_public_profile_id: pf.pf_public_profile_id ?? "",
        license_number: pf.license_number ?? "",
        default_permit_type: pf.default_permit_type ?? "",
        enabled: pf.enabled,
      });
    }
  }, [pf]);

  if (!companyId) return null;

  const feedUrl = bayut?.feed_token
    ? `${origin}/api/feeds/portals/${bayut.feed_token}`
    : null;

  const toggleBayut = async (enabled: boolean) => {
    const result = await upsert.mutateAsync({
      companyId,
      platform: "bayut_dubizzle",
      enabled,
    });
    if (result.error) toast.error(result.error);
    else toast.success(t("Saved"));
  };

  const handleRegenerate = async () => {
    const result = await regenerate.mutateAsync(companyId);
    if (result.error) toast.error(result.error);
    else toast.success(t("Feed URL regenerated"));
  };

  const copyFeedUrl = () => {
    if (feedUrl) {
      navigator.clipboard.writeText(feedUrl);
      toast.success(t("Copied"));
    }
  };

  const savePf = async () => {
    const result = await upsert.mutateAsync({
      companyId,
      platform: "propertyfinder",
      ...pfForm,
    });
    if (result.error) toast.error(result.error);
    else toast.success(t("Saved"));
  };

  // Test Connection saves first — testPfConnection reads credentials from the
  // DB, and gating the button on the already-saved row (rather than the form
  // fields being typed) meant it stayed disabled until a separate manual Save,
  // even with both fields filled in. One click now does both.
  const runTestConnection = async () => {
    setDiagnostics(null);
    setDiagnosticsError(null);

    const saveResult = await upsert.mutateAsync({
      companyId,
      platform: "propertyfinder",
      ...pfForm,
    });
    if (saveResult.error) {
      setDiagnosticsError(saveResult.error);
      return;
    }

    const result = await testConnection.mutateAsync(companyId);
    if (result.error) setDiagnosticsError(result.error);
    else setDiagnostics(result.data);
  };

  const copyDiagnosticReport = () => {
    if (!diagnostics) return;
    const lines = [
      `PropertyFinder connection test — ${new Date().toISOString()}`,
      `Company: ${companyDisplayName(company, language) || companyId}`,
      "",
      ...diagnostics.map(
        (s) =>
          `[${s.ok ? "OK" : "FAIL"}] ${s.step}${s.status ? ` (HTTP ${s.status})` : ""}: ${s.message}`,
      ),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success(t("Copied"));
  };

  return (
    <div className="space-y-6">
      {/* Bayut + dubizzle */}
      <SettingsSection
        title={t("Bayut & Dubizzle")}
        description={t(
          "One combined XML feed. Give this feed URL to Bayut/Dubizzle to sync your listings.",
        )}
        icon={Globe}
        logos={[{ src: "/logos/dubizzle-group.png", alt: "Dubizzle Group" }]}
        action={
          <div className="flex items-center gap-2">
            <Label htmlFor="bayut-enabled" className="text-muted-foreground text-sm">
              {t("Enabled")}
            </Label>
            <Switch
              id="bayut-enabled"
              checked={bayut?.enabled ?? false}
              onCheckedChange={toggleBayut}
              disabled={upsert.isPending}
            />
          </div>
        }
      >
        <div className="space-y-3">
          <Label>{t("Feed URL")}</Label>
          {feedUrl ? (
            <div className="flex sm:flex-row flex-col items-stretch sm:items-center gap-2">
              <Input
                readOnly
                value={feedUrl}
                dir="ltr"
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                onClick={copyFeedUrl}
                title={t("Copy")}
                className="gap-2 shrink-0 sm:px-0 sm:w-10 h-10"
              >
                <Copy className="w-4 h-4" />
                <span className="sm:hidden">{t("Copy")}</span>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("Generate a feed URL to get started.")}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerate.isPending}
            className="gap-2 w-full sm:w-auto"
          >
            {regenerate.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {feedUrl ? t("Regenerate Feed URL") : t("Generate Feed URL")}
          </Button>

          <Accordion type="single" collapsible className="rounded-xl border border-border/60 bg-muted/20 px-4">
            <AccordionItem value="how-it-works" className="border-none">
              <AccordionTrigger className="gap-2 text-sm font-medium hover:no-underline">
                <span className="flex items-center gap-2 text-start">
                  <HelpCircle className="w-4 h-4 shrink-0 text-muted-foreground" />
                  {t("How does publishing to Bayut & Dubizzle actually work?")}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                <div
                  className="portal-help-content rich-text-content"
                  dangerouslySetInnerHTML={{ __html: t("bayut_portal_help_html") }}
                />
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div
                    className="[&_p]:text-justify [&_p+p]:mt-1"
                    dangerouslySetInnerHTML={{ __html: t("bayut_portal_help_hint_html") }}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </SettingsSection>

      {/* PropertyFinder */}
      <SettingsSection
        title={t("PropertyFinder")}
        description={t("Enterprise API credentials from PF Expert → Developer Resources.")}
        icon={Building2}
        logos={[{ src: "/logos/propertyfinder.png", alt: "PropertyFinder" }]}
        action={
          <div className="flex items-center gap-2">
            <Label htmlFor="pf-enabled" className="text-muted-foreground text-sm">
              {t("Enabled")}
            </Label>
            <Switch
              id="pf-enabled"
              checked={pfForm.enabled}
              onCheckedChange={(v) => setPfForm((f) => ({ ...f, enabled: v }))}
            />
          </div>
        }
      >
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("API Key")}</Label>
            <Input
              dir="ltr"
              value={pfForm.api_key}
              onChange={(e) => setPfForm((f) => ({ ...f, api_key: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("API Secret")}</Label>
            <Input
              dir="ltr"
              type="password"
              value={pfForm.api_secret}
              onChange={(e) => setPfForm((f) => ({ ...f, api_secret: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("Public Profile ID")}</Label>
            <Input
              dir="ltr"
              value={pfForm.pf_public_profile_id}
              onChange={(e) =>
                setPfForm((f) => ({ ...f, pf_public_profile_id: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t("License Number")}</Label>
            <Input
              dir="ltr"
              value={pfForm.license_number}
              onChange={(e) =>
                setPfForm((f) => ({ ...f, license_number: e.target.value }))
              }
            />
          </div>
          <div className="md:col-span-2">
            <Accordion type="single" collapsible className="rounded-xl border border-border/60 bg-muted/20 px-4">
              <AccordionItem value="pf-how-it-works" className="border-none">
                <AccordionTrigger className="gap-2 text-sm font-medium hover:no-underline">
                  <span className="flex items-center gap-2 text-start">
                    <HelpCircle className="w-4 h-4 shrink-0 text-muted-foreground" />
                    {t("How does PropertyFinder publishing work, and how do I get these credentials?")}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  <div
                    className="portal-help-content rich-text-content"
                    dangerouslySetInnerHTML={{ __html: t("pf_portal_help_html") }}
                  />
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div
                      className="[&_p]:text-justify [&_p+p]:mt-1"
                      dangerouslySetInnerHTML={{ __html: t("pf_portal_help_hint_html") }}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="md:col-span-2 flex sm:flex-row flex-col justify-end gap-2">
            <Button
              variant="outline"
              onClick={runTestConnection}
              disabled={
                testConnection.isPending ||
                upsert.isPending ||
                !pfForm.api_key ||
                !pfForm.api_secret
              }
              className="gap-2 w-full sm:w-auto"
            >
              {testConnection.isPending || upsert.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
              {t("Test Connection")}
            </Button>
            <Button
              onClick={savePf}
              disabled={upsert.isPending}
              className="w-full sm:w-auto"
            >
              {upsert.isPending ? t("Saving...") : t("Save")}
            </Button>
          </div>

          {!pfForm.api_key || !pfForm.api_secret ? (
            <p className="md:col-span-2 text-muted-foreground text-xs sm:text-end">
              {t("Enter your API Key & Secret above to enable testing.")}
            </p>
          ) : (
            <p className="md:col-span-2 text-muted-foreground text-xs sm:text-end">
              {t("Test Connection saves your API Key & Secret first, then checks them live.")}
            </p>
          )}

          {(diagnostics || diagnosticsError) && (
            <div className="md:col-span-2 space-y-2 bg-muted/30 p-3 sm:p-4 border border-border/60 rounded-xl">
              <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-2">
                <p className="font-semibold text-sm">{t("Connection Test Results")}</p>
                {diagnostics && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyDiagnosticReport}
                    className="gap-1.5 h-7 text-xs w-full sm:w-auto"
                  >
                    <ClipboardCopy className="w-3.5 h-3.5" />
                    {t("Copy diagnostic report")}
                  </Button>
                )}
              </div>

              {diagnosticsError ? (
                <p className="text-sm text-destructive">{diagnosticsError}</p>
              ) : (
                <div className="space-y-2">
                  {diagnostics!.map((step) => (
                    <div
                      key={step.step}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
                        step.ok
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                          : "border-red-500/25 bg-red-500/10 text-red-800 dark:text-red-200",
                      )}
                    >
                      {step.ok ? (
                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 text-start">
                        <p className="font-medium">
                          {step.step === "token"
                            ? t("Authentication (auth/token)")
                            : t("Locations endpoint (v1/locations)")}
                          {step.status ? (
                            <span className="ms-1.5 font-mono opacity-70" dir="ltr">
                              HTTP {step.status}
                            </span>
                          ) : null}
                        </p>
                        <p className="break-words opacity-90" dir="auto">
                          {step.message}
                        </p>
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground text-start leading-relaxed">
                    {t(
                      "If Authentication succeeds but Locations fails, this is on PropertyFinder's side — email the report above to {{email}}.",
                      {
                        email: "integration.support@propertyfinder.ae",
                      },
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
