# Portal Publishing — Bayut, dubizzle & PropertyFinder

Mandera CRM syndicates property listings to three external portals — Bayut, dubizzle, and
PropertyFinder — directly from `/company/properties`. This document describes the shipped
architecture: the two integration models, the data model, the publish flow, and where each piece
of the implementation lives.

**Status: implemented and shipped.** Outstanding follow-ups are listed in [Open items](#open-items).

## Why two different integration models

Bayut/dubizzle and PropertyFinder require fundamentally different integrations, confirmed against
their respective specs (see [`docs/README.md`](../README.md) for the full reference list):

| Portal | Model | Direction | Auth |
|---|---|---|---|
| **Bayut + dubizzle** | One combined XML feed hosted at a public URL; their crawler polls it. A `<Portals>` tag per property decides Bayut, dubizzle, or both. | Pull | Public URL guarded by a random per-company feed token |
| **PropertyFinder** | Enterprise REST API — create draft, publish, async confirmation via webhook. Server-to-server only. | Push | OAuth2 (`apiKey`/`apiSecret` → 30-minute JWT) |

On the properties list and detail pages, each property has a **Publish** control that opens a
dialog with three toggles (Bayut / dubizzle / PropertyFinder), each showing live status. The
Bayut/dubizzle toggles flip feed inclusion (effective on the portal's next poll); the PropertyFinder
toggle triggers a live API publish or unpublish.

## Credential ownership

Every company holds its own account on each portal and enters its own credentials — this is a
requirement of the portals themselves, since listings publish under the agency's own RERA/DLD
permit, branding, agents, and billing, and accounts cannot be shared across agencies.

- **Bayut/dubizzle**: the agency holds its own Bayut/dubizzle contract and registers the feed URL
  Mandera hosts. The per-company `feed_token` secures that URL; the real account lives on the
  portal's side.
- **PropertyFinder**: the agency generates its own `apiKey`/`apiSecret` in PF Expert (Developer
  Resources), plus its `publicProfileId` and license number.
- Each `company_super_admin` manages their company's credentials under **Settings → Portals**
  (`PortalIntegrationsTab`).
- A company with no account for a given portal simply leaves that toggle unconfigured — the
  Publish dialog shows it as "not configured" rather than blocking the other two portals.
- Credentials are therefore keyed per `company_id` in the database, not sourced from global
  environment variables.

## Data model

Three migrations added everything portal-specific:

- `00000000000015_portal_publishing.sql` — core tables (below).
- `00000000000016_property_portal_required_fields.sql` — off-plan fields, `available_from`,
  `parking_slots`.
- `00000000000018_company_portal_credentials.sql` — the per-company credentials table, superseding
  an earlier detour (`00000000000017_global_portal_credentials.sql`, a single shared-credentials
  table managed by `master_admin`) that was designed but **never applied** to the database and
  should not be run.

**`properties`** gained portal-required columns, all nullable so existing rows are unaffected:
`title_ar`, `description_ar`, `bedrooms`, `bathrooms`, `furnishing`, `size_unit` (default
`'SQFT'`), `rent_frequency`, `is_off_plan` (default `false`), `project_status`, `amenities text[]`,
`permit_type`, `issuing_license_number`, `city`, `locality`, `sub_locality`, `tower_name`,
`pf_location_id`. (Listing agent name/phone/email are derived from the assigned employee at render
time, not stored as columns.) A later pass (`00000000000028_property_videos_floor_plans.sql`)
added `video_urls` and a floor-plan image uploader — see [Known limitations](#known-limitations).

**`company_portal_credentials`** — one row per company per platform (`unique(company_id, platform)`):
`platform` (`'bayut_dubizzle' | 'propertyfinder'`), `enabled`, `feed_token`, `api_key`,
`api_secret`, `pf_public_profile_id`, `license_number`, `default_permit_type`,
`cached_access_token`, `cached_token_expires_at`. RLS is company-scoped select, `company_super_admin`
write; secrets are read server-side only, via `getSupabaseAdmin()`.

**`property_publications`** — one row per property per platform (`unique(property_id, platform)`):
`platform` (`'bayut' | 'dubizzle' | 'propertyfinder'`), `status`
(`'draft' | 'pending' | 'published' | 'failed' | 'unpublished'`), `external_id` (PropertyFinder's
`listingId`), `last_error`, `last_synced_at`, `published_at`. RLS matches
`company_portal_credentials`.

Types for all three live in `src/types/supabase-entities.types.ts`.

## Bayut + dubizzle: the combined XML feed

- **`src/app/api/feeds/portals/[token]/route.ts`** — public `GET` route
  (`export const dynamic = "force-dynamic"`). Resolves the token to a company via
  `company_portal_credentials` (`platform = 'bayut_dubizzle'`, `enabled`), using
  `getSupabaseAdmin()` since the crawler hitting this endpoint is unauthenticated — access is
  scoped strictly by the token itself. Each company has its own feed URL.
- Loads that company's properties with a `property_publications` row for `bayut` or `dubizzle`
  with status `published` or `unpublished` — the latter is emitted once as
  `Property_Status=deleted` so the portal removes the listing, then the row can be cleared.
- **`src/lib/portals/bayut-xml.ts`** — a pure builder mapping `PropertyWithRelations` to the
  `<Property>` XML block: `<Portals>` lists only the platforms enabled for that property, text is
  CDATA-wrapped, agent contact comes from the joined employee, images from `images[]`. Returns
  `Content-Type: application/xml`.
- The company's feed URL (`/api/feeds/portals/{token}`) is surfaced in Settings for the company to
  hand to Bayut/dubizzle.

## PropertyFinder: REST publish flow

- **`src/lib/portals/propertyfinder/client.ts`** — token acquisition
  (`POST https://atlas.propertyfinder.com/v1/auth/token` with the company's `apiKey`/`apiSecret`),
  cached per company (30-minute JWT, no refresh flow — a new token is requested on expiry). Thin
  wrappers for `createListing`, `publishListing`, `unpublishListing`, `getCompliance`,
  `searchLocations`, with incremental-backoff retry on `429`.
- **`src/lib/portals/propertyfinder/map.ts`** — maps `PropertyWithRelations` plus the company's
  credentials to a `POST /v1/listings` body: category, type, price, bedrooms, amenities,
  compliance block (`createdBy` = company's `publicProfileId`, `issuingClientLicenseNumber` =
  company's license), `location.id`, media, bilingual title and description.
- **`src/actions/portalPublishing.ts`** — `getPropertyPublications`, `getPortalCredentials`,
  `upsertPortalCredentials`, and `setPortalPublication(propertyId, platform, enabled)`, which loads
  the property's company credentials first and errors clearly if that platform isn't configured:
  - **Bayut/dubizzle**: upserts the `property_publications` status. No external call — effective on
    the portal's next crawl.
  - **PropertyFinder, enabling**: validates required fields → `getCompliance` (Dubai) →
    `createListing` (draft) → `publishListing` → stores `external_id`, status `pending`.
  - **PropertyFinder, disabling**: `unpublishListing(external_id)` → status `unpublished`.
  - `validatePropertyForPortal(property, platform)` returns the list of missing required fields,
    driving the "can't enable yet" state in the UI.
- **`src/app/api/webhooks/propertyfinder/route.ts`** — handles `listing.published`,
  `listing.publishFailed`, and `listing.unpublished`, matching on `external_id` and updating
  `property_publications`' status and `last_error`.

### Field mapping reference

**Bayut/dubizzle XML `<Property>` tags**: `Property_Ref_No`, `Permit_Number`, `Property_Status`
(`live`/`deleted`), `Property_purpose` (`Buy`/`Rent`), `Property_Type`, `Property_Size` +
`Property_Size_Unit` (`SQFT`), `plotArea`, `Bedrooms`, `Bathrooms`, `Features/Feature`, `Off_plan`
(`Yes`/`No`), `Portals/Portal` (`Bayut`/`dubizzle`), `Last_Updated`, `Property_Title[_AR]`,
`Property_Description[_AR]`, `Price`, `Rent_Frequency`
(`Daily`/`Weekly`/`Monthly`/`Yearly`), `Furnished` (`Yes`/`No`/`Partly`), `offplanDetails_*`,
`Images/Image`, `Videos/Video`, `Floor_Plans/Floor_Plan`, `City`, `Locality`, `Sub_Locality`,
`Tower_Name`, `Listing_Agent[_Phone|_Email]`.

**PropertyFinder `POST /v1/listings`** (optional at schema level, business-required): `reference`,
`category` (`residential`/`commercial`), `type` (`apartment`/`villa`/…),
`price{type, amounts}`, `bedrooms` (`studio`/`1`/…), `bathrooms`, `size`, `builtUpArea`,
`location{id}`, `media{images}`, `title{en,ar}`, `description{en,ar}`, `amenities[]` (fixed enum),
`furnishingType`, `projectStatus`, `uaeEmirate`,
`compliance{type, listingAdvertisementNumber, issuingClientLicenseNumber}`, `createdBy` (public
profile id). Flow: acquire token → (Dubai) `GET /v1/compliances/{permit}/{license}` →
`POST /v1/listings` (draft) → `POST /v1/listings/{id}/publish` → webhook confirms.

## Property pages

Properties were brought in line with the `/new` + `/[id]` convention already used by clients,
owners, and employees — one shared view component drives create, view, and edit:

- **`src/components/company/properties/PropertyDetailView.tsx`** — accepts an optional
  `propertyId`. No id renders the create form (`useCreateProperty`, then routes to the new record's
  `/[id]`); an id renders full detail (image carousel, details, status history) plus a **Publish
  to portals** section and an edit affordance that reveals the same form, prefilled
  (`useProperty` + `useUpdateProperty`).
- **`src/app/company/(app)/properties/add/page.tsx`** and **`.../[id]/page.tsx`** are thin
  wrappers rendering `<PropertyDetailView />`, matching the `clients/new` and `clients/[id]`
  pattern. (The route is `/add` rather than `/new`, by explicit choice, unlike its siblings.)
- The list page (`properties/page.tsx`) no longer has an inline create/edit dialog — "Add
  Property" navigates to `/company/properties/add`; `PropertyCard`'s View/Edit buttons navigate to
  `/company/properties/{id}`.
- The create/edit form gained a "Portal / Publishing" tab and the full set of portal fields
  described above, in `src/validations/property.schema.ts`.

## Publish UI

- **`src/hooks/queries/usePortalPublishing.ts`** — `usePropertyPublications`,
  `useSetPortalPublication`, `usePortalCredentials`, `useUpsertPortalCredentials`, following the
  same invalidation pattern as `useProperties.ts`.
- **`src/components/company/properties/PublishToPortalsModal.tsx`** — one dialog, three rows
  (Bayut / dubizzle / PropertyFinder), each showing a toggle, status badge, last-synced time, any
  error text, and a "missing fields" hint from `validatePropertyForPortal` when relevant. A row
  shows "not configured" if the company hasn't set up that platform's credentials. The
  PropertyFinder row shows a spinner while its publish action is in flight.
- The Publish button lives in `PropertyCard`'s footer and in `PropertyDetailView`'s detail mode.
- **Settings → Portal Integrations** (`src/app/company/(app)/settings/page.tsx`) manages the
  Bayut/dubizzle feed (shows the feed URL, allows regenerating the token) and PropertyFinder
  credentials (API key/secret, public profile id, license number), backed by
  `company_portal_credentials`.
- Location autocomplete (`searchLocations`) resolves `pf_location_id`, since PropertyFinder
  requires manual location selection. CRM free-form amenities map to PropertyFinder's fixed enum
  via `src/lib/portals/amenities.ts`.

## Known limitations

- PropertyFinder has no per-listing floor-plan field (its `FloorPlan` schema belongs to the
  separate Projects API) — floor plans are therefore Bayut/dubizzle-only.
  `media.videos.default` is best-effort filled from the first video URL only.
- `company_portal_credentials.api_secret` is stored in plaintext, gated only by RLS.
  Column-level encryption is flagged as a future hardening, not yet implemented.

## Open items

- Enter real PropertyFinder credentials per company in Settings → Portals (currently unconfigured
  in production).
- Run the full end-to-end publish test described below against those real credentials.

## Where things live

| Area | Path |
|---|---|
| Migrations | `supabase/migrations/00000000000015_portal_publishing.sql`, `..016_property_portal_required_fields.sql`, `..018_company_portal_credentials.sql` |
| Types | `src/types/supabase-entities.types.ts` |
| XML feed route | `src/app/api/feeds/portals/[token]/route.ts` |
| XML builder | `src/lib/portals/bayut-xml.ts` |
| PropertyFinder client/mapper | `src/lib/portals/propertyfinder/{client,map}.ts` |
| PropertyFinder webhook | `src/app/api/webhooks/propertyfinder/route.ts` |
| Publish actions | `src/actions/portalPublishing.ts` |
| Publish hooks | `src/hooks/queries/usePortalPublishing.ts` |
| Publish modal | `src/components/company/properties/PublishToPortalsModal.tsx` |
| Shared detail/form view | `src/components/company/properties/PropertyDetailView.tsx` |
| Add / detail pages | `src/app/company/(app)/properties/{add,[id]}/page.tsx` |
| List page + schema | `src/app/company/(app)/properties/page.tsx`, `src/validations/property.schema.ts` |
| Settings | `src/app/company/(app)/settings/page.tsx` |

## Verification checklist

1. **Migrations** — confirm the new columns/tables and RLS policies exist in Supabase.
2. **Feed** — configure a company's Bayut/dubizzle feed, enable both on a property, open
   `/api/feeds/portals/{token}` and validate the XML against the Bayut PDF sample (correct
   `<Portals>`, CDATA, images, agent). Confirm cross-company isolation (a token returns only its
   own company's properties; an invalid token returns 404/empty) and that disabling a listing
   emits `Property_Status=deleted`.
3. **PropertyFinder** (sandbox credentials — see `.claude/LOCAL_DEV_CREDENTIALS.md`) — configure a company's PF
   credentials, enable PF on a property, and confirm a draft is created, publish is accepted, and
   `external_id`/`pending` are stored. Simulate a `listing.published` webhook and confirm status
   flips to `published`; disable and confirm `unpublish`.
4. **UI** — the modal shows correct per-platform status, "not configured" when a company has no
   keys, "missing fields" blocks enabling until satisfied, and errors surface on a failed publish.
5. **Pages** — `/company/properties/add` saves and redirects to the new `/company/properties/{id}`;
   the detail page shows real content with working Edit and Publish; list and card navigation both
   route correctly.
6. **Regression** — existing property create/edit/delete/status flows still work
   (`npm run build`, `npm run lint`; the new fields are all nullable/optional).
