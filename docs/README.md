# docs/

Reference material behind the app's portal-syndication feature (Bayut, dubizzle,
PropertyFinder), plus a couple of standalone assets. Most of this is primary-source research —
API specs, vendor docs, onboarding notes — kept for provenance rather than turned into prose,
except where noted below.

## Start here

[`portals/portal-integration-plan.md`](portals/portal-integration-plan.md) — the architecture
document for the portal-publishing feature: how it's built, where every piece lives, and what's
still outstanding. Everything else in `portals/` is reference material it draws from.

## `portals/` — portal integration references

| File | What it is |
|---|---|
| [`portal-integration-plan.md`](portals/portal-integration-plan.md) | How the portal-publishing feature is built — data model, publish flow for each portal, file map, verification checklist. Read this first. |
| [`propertyfinder-integration-notes.md`](portals/propertyfinder-integration-notes.md) | Curated summary of PropertyFinder's API: auth flow, image upload requirements (including the CMYK gotcha and egress IPs to allowlist), rate limits, region-specific compliance rules (Dubai RERA/DLD, Abu Dhabi ADREC, Saudi REGA), and webhook events. Read this before `propertyfinder-api-reference.md` — it's shorter and covers what you need day-to-day. |
| [`propertyfinder-openapi.json`](portals/propertyfinder-openapi.json) | PropertyFinder's Enterprise API as a machine-readable OpenAPI spec. Referenced directly from code comments in `src/lib/portals/propertyfinder/map.ts` and `src/lib/portals/amenities.ts`. |
| [`propertyfinder-api-reference.md`](portals/propertyfinder-api-reference.md) | The full PropertyFinder API reference in readable Markdown — every endpoint, parameter table, and schema. Use this or the OpenAPI file above when the integration notes doc doesn't have the detail you need. |
| `bayut-dubizzle-xml-guidelines.pdf` | Bayut's official spec for the combined XML feed format both portals crawl. Source of truth for `src/lib/portals/bayut-xml.ts`. |
| [`propertybase-research.md`](portals/propertybase-research.md) / `.png` | Notes on how a comparable CRM (Propertybase) implemented the same three portal integrations — used as a cross-check on field requirements, not as a spec for either portal. |
| [`portal-account-setup.md`](portals/portal-account-setup.md) | The human process for getting Mandera's own API access to each portal — where to log in, what to request. Contains no credential values; those live in `.claude/LOCAL_DEV_CREDENTIALS.md` (gitignored). |

## `sample/`

[`sample-listing.md`](sample/sample-listing.md) and [`images/`](sample/images/) — a cleaned-up,
realistic off-plan property listing (pricing, payment plan, amenities, location) for manually
testing the property form instead of typing lorem ipsum. Not wired into any seed script.

## Assets

`logo.png` — used in the project [README](../README.md).
