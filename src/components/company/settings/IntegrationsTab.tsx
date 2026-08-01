"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Globe, MessageCircle, MessageSquareText, Plug } from "lucide-react";
import SettingsSection from "./SettingsSection";
import { Button } from "@/components/ui/button";

/**
 * Hub for company integrations.
 * WhatsApp and Message Templates are intentionally deferred — see
 * docs/company-settings-upcoming.md.
 */
export default function IntegrationsTab() {
  const { t } = useTranslation();

  return (
    <SettingsSection
      title={t("Integrations")}
      description={t(
        "Connect external services used by your brokerage. Portal platforms are configured separately.",
      )}
      icon={Plug}
    >
      <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
        <div className="flex flex-col gap-3 bg-muted/20 p-4 border border-border/60 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="flex justify-center items-center bg-primary/10 rounded-xl w-10 h-10 text-primary">
              <Globe className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm">
                {t("Real estate platforms")}
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                {t(
                  "Bayut, dubizzle, and PropertyFinder credentials and publishing.",
                )}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="self-start">
            <Link href="/company/settings?tab=portal-integrations">
              {t("Open platform settings")}
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-3 bg-muted/20 p-4 border border-border/60 border-dashed rounded-xl opacity-80">
          <div className="flex items-center gap-3">
            <span className="flex justify-center items-center bg-muted rounded-xl w-10 h-10 text-muted-foreground">
              <MessageCircle className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm">
                {t("WhatsApp Settings")}
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                {t("Coming soon. WhatsApp integration is not enabled yet.")}
              </p>
            </div>
          </div>
          <span className="inline-flex self-start items-center bg-muted px-2 py-0.5 rounded-full font-medium text-muted-foreground text-[10px]">
            {t("Coming soon")}
          </span>
        </div>

        <div className="flex flex-col gap-3 bg-muted/20 p-4 border border-border/60 border-dashed rounded-xl opacity-80">
          <div className="flex items-center gap-3">
            <span className="flex justify-center items-center bg-muted rounded-xl w-10 h-10 text-muted-foreground">
              <MessageSquareText className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-foreground text-sm">
                {t("Message Templates")}
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                {t(
                  "Coming soon. Message templates are not wired into messaging yet.",
                )}
              </p>
            </div>
          </div>
          <span className="inline-flex self-start items-center bg-muted px-2 py-0.5 rounded-full font-medium text-muted-foreground text-[10px]">
            {t("Coming soon")}
          </span>
        </div>
      </div>
    </SettingsSection>
  );
}
