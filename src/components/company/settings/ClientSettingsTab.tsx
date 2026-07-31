"use client";

import { Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import SettingsSection from "./SettingsSection";
import MarketingChannelsTab from "./MarketingChannelsTab";

/**
 * PDF "Client settings" — groups client acquisition settings and points
 * managers to the Client Status tab for pipeline stages.
 */
export default function ClientSettingsTab() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <SettingsSection
        title={t("Client settings")}
        description={t(
          "Configure client acquisition channels. Manage pipeline stages from the Client Status tab.",
        )}
        icon={Settings2}
      >
        <div className="p-5 text-sm text-muted-foreground">
          {t(
            "Client stages (statuses) are managed under Client Status. Marketing channels below control Clients by Source reporting.",
          )}
        </div>
      </SettingsSection>
      <MarketingChannelsTab />
    </div>
  );
}
