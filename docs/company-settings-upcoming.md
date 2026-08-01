# Company Settings — hidden / upcoming features

Settings that exist in the codebase (tables, actions, UI components) but are
**intentionally hidden** from the Company Settings navigation until product
wiring is ready.

These are not abandoned — they are deferred. Keep the backend/schema pieces;
do not delete without an explicit decision.

## Currently hidden

| Feature | Nav status | Code still present | Why deferred |
|---|---|---|---|
| **WhatsApp Settings** | Hidden from sidebar. Legacy `?tab=whatsapp-settings` redirects to Integrations. Shown as “Coming soon” on the Integrations hub. | `WhatsAppSettingsTab.tsx`, `companies.whatsapp_settings` JSON, CRUD via `companyExtendedSettings` | No live WhatsApp Business / provider integration yet. |
| **Message Templates** | Hidden from sidebar. Legacy `?tab=message-templates` redirects to Integrations. Shown as “Coming soon” on the Integrations hub. | `MessageTemplatesTab.tsx`, `message_templates` table, hooks/actions in `companyExtendedSettings` | Templates are CRUD-only today — not consumed by WhatsApp, email, or any send flow. |
| **Client distribution** | Hidden from sidebar. Legacy `?tab=distribution-rules` redirects to Client settings. | `DistributionRulesTab.tsx`, `client_distribution_rules` table, `src/actions/distributionRules.ts`, hooks in `useDistributionRules.ts`. Create-client flow still calls `pickEmployeeByDistributionRules` when an active round-robin rule exists. | Settings UI deferred; managers configure assignment via the employee field on the client form until product wants a dedicated rules screen again. Round-robin auto-assigns on create when a rule is active; manual keeps assignment to the form. |

## Re-enabling later

1. Add the nav item back in `src/app/company/(app)/settings/page.tsx` (`navEntries` + `SETTINGS_TABS`).
2. Remove the redirect in `resolveSettingsTab` for that tab key.
3. Render the tab component again in the settings page content switch.
4. Wire real usage (e.g. pick a template when messaging a client) before calling the feature “done”.
5. Update this doc.

## Related

- Integrations hub: `src/components/company/settings/IntegrationsTab.tsx`
- Company Settings checklist work lives under `/company/settings` (Manager only).
