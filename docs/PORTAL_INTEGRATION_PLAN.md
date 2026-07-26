# Portal Publishing Integration — Bayut, dubizzle & PropertyFinder

> **Implementation status (built):** All phases are implemented. The
> "Current architecture" section below is the *pre-implementation snapshot* — it
> no longer reflects the codebase (there ARE now `src/app/api/**` routes, the
> property add/detail pages exist, and the `[id]` page is real, not a stub).
>
> **Credentials are per-company** (final, settled model): each company enters its
> OWN Bayut/dubizzle feed config and PropertyFinder API key/secret/public profile
> id/license number under **company Settings → Portals** (`PortalIntegrationsTab`).
> This matches the original migration 15 design.
>
> `00000000000017_global_portal_credentials.sql` (a `portal_credentials` table
> shared by every company, managed only by master_admin) was a **detour that was
> never applied** to the database — **do not run it**. `00000000000018_company_portal_credentials.sql`
> reinstates the per-company `company_portal_credentials` table/RLS (idempotent —
> mostly a no-op if migration 15's table is still live, which it is). Applied
> migrations: `00000000000015_portal_publishing.sql`,
> `00000000000016_property_portal_required_fields.sql` (off-plan fields,
> `available_from`, `parking_slots`), `00000000000018_company_portal_credentials.sql`.
>
> Per-portal publish requirements are enforced at publish time by
> `src/lib/portals/validate.ts`; the property **form** only requires core + Bayut
> fields to save — `pf_location_id` is optional at save time (it needs PF API keys
> to look up) and is required only when publishing to PropertyFinder. Each
> company's feed route is `/api/feeds/portals/{company's feed_token}`, returning
> only that company's published properties. Remaining follow-ups: enter real PF
> creds per company in Settings → Portals, rotate any secrets in
> `docs/platforms.md`, and run the end-to-end publish test.

## Context

Mandera CRM stores real-estate listings ("properties") that agencies now want to
**syndicate to external portals**: **Bayut**, **dubizzle**, and **PropertyFinder**.
Today a property lives only inside the CRM (`properties` table, managed at
`/company/properties`) with no path to any portal.

The two portals use **fundamentally different integration models** (confirmed from
`docs/Bayut & dubizzle Combined XML Guidelines - Updated.pdf`, `docs/platforms.md`,
`docs/propertyfinder.md`, `docs/openapi.json`):

| Portal | Model | Direction | Auth |
|---|---|---|---|
| **Bayut + dubizzle** | **One combined XML feed** we host at a public URL; their crawler polls it. A `<Portals>` tag per property decides bayut / dubizzle / both. | **Pull** | Public URL guarded by a random feed token |
| **PropertyFinder** | Enterprise REST API: create draft → publish, async confirmation via webhooks. Server-to-server only. | **Push** | OAuth2 (apiKey/apiSecret → 30-min JWT) |

Outcome: on `/company/properties` each property gets a **Publish** control opening a
dialog with **3 toggles** (Bayut / dubizzle / PropertyFinder), each showing live
status. Bayut/dubizzle toggles flip feed inclusion (takes effect on next poll);
PropertyFinder toggle triggers a live API publish/unpublish.

**Decisions locked with the user:** combined XML feed for Bayut+dubizzle · per-company
credentials in a DB table · single "Publish" dialog with 3 toggles + status ·
full end-to-end build, phased · property add/detail moved to dedicated pages.

### Account ownership model (confirmed)

**Every company holds its OWN accounts on each portal and enters its own credentials.**
This is required by the portals themselves — listings publish under the agency's own
RERA/DLD permit, branding, agents, and billing; they cannot share one account.

- **Bayut/dubizzle**: the agency has its own Bayut/dubizzle contract and registers the
  feed URL we host. Our per-company `feed_token` only secures that URL; the real account
  is on the portal side.
- **PropertyFinder**: the agency generates its own `apiKey`/`apiSecret` in PF Expert
  (Developer Resources) plus its `publicProfileId` and license number.
- Each `company_super_admin` enters/manages their company's keys in **company Settings**.
- A company with no account for a portal simply leaves that toggle **unconfigured/disabled**;
  the Publish dialog shows it as "not configured".
- This is why credentials are keyed per `company_id` (multi-tenant), not global env vars.

---

## Current architecture (verified)

- **App Router**, no `src/app/api/**` routes yet — all data access is **Server Actions**
  (`src/actions/*.ts`, `getServerSupabase()` / `getSupabaseAdmin()` from
  `src/lib/supabase/server.ts`) wrapped by **React Query hooks** (`src/hooks/queries/*.ts`).
- **Properties**: `src/actions/properties.ts`, `src/hooks/queries/useProperties.ts`,
  page `src/app/company/(app)/properties/page.tsx` (inline create/edit dialog),
  card `src/components/company/properties/PropertyCard.tsx` (View/Edit buttons in
  `CardFooter`), detail `PropertyDetailModal.tsx`.
- **Sibling convention to mirror**: clients/owners/employees each have a **`/new` page**
  and a **`/[id]` page**, both thin wrappers that render a single shared view component —
  e.g. `clients/new/page.tsx` and `clients/[id]/page.tsx` both render
  `<ClientDetailView clientId?={id} />` (no id ⇒ create; id ⇒ view/edit). **Properties is
  the outlier**: it has no add page (uses an inline dialog on the list) and its
  `properties/[id]/page.tsx` is a **placeholder stub**. This plan brings properties in line
  with that pattern.
- **DB**: hosted Supabase, migrations in `supabase/migrations/` (next number:
  `00000000000015`). Company-scoped RLS pattern (`_select` = same company;
  `_write` = same company + `company_super_admin`; `master_admin` bypasses).
  No Postgres enums — constrained fields use `text ... check (... in (...))`.
- **Images** already live in the **public** `property-images` bucket → public HTTPS URLs,
  usable directly by both the XML feed and PropertyFinder.
- **`properties` today** lacks portal-required fields: bilingual title/description,
  bedrooms, bathrooms, furnishing, rent frequency, off-plan flag, amenities/features,
  permit type, license number, Bayut location tree (city/locality/sub-locality/tower),
  and PF `location_id` / `public_profile_id`.

---

## Field-mapping reference (drives the schema)

**Bayut/dubizzle XML** `<Property>` tags: `Property_Ref_No`, `Permit_Number`,
`Property_Status` (live|deleted), `Property_purpose` (Buy|Rent), `Property_Type`,
`Property_Size` + `Property_Size_Unit` (SQFT), `plotArea`, `Bedrooms`, `Bathrooms`,
`Features/Feature`, `Off_plan` (Yes|No), `Portals/Portal` (Bayut|dubizzle),
`Last_Updated`, `Property_Title[_AR]`, `Property_Description[_AR]`, `Price`,
`Rent_Frequency` (Daily|Weekly|Monthly|Yearly), `Furnished` (Yes|No|Partly),
`offplanDetails_*`, `Images/Image`, `Videos/Video`, `Floor_Plans/Floor_Plan`,
`City`, `Locality`, `Sub_Locality`, `Tower_Name`, `Listing_Agent[_Phone|_Email]`.

**PropertyFinder `POST /v1/listings`** (all optional at schema level, business-required):
`reference`, `category` (residential|commercial), `type` (apartment|villa|…),
`price{type: sale|yearly|monthly|weekly|daily, amounts}`, `bedrooms` (studio|1..),
`bathrooms`, `size`, `builtUpArea`, `location{id}`, `media{images:[{original:{url}}]}`,
`title{en,ar}`, `description{en,ar}`, `amenities[]` (fixed enum),
`furnishingType`, `projectStatus`, `uaeEmirate`,
`compliance{type: rera|dtcm|adrec, listingAdvertisementNumber, issuingClientLicenseNumber}`,
`createdBy` (public profile id). Flow: auth token → (Dubai) `GET /v1/compliances/{permit}/{license}`
→ `POST /v1/listings` (draft) → `POST /v1/listings/{id}/publish` → webhook confirms.

---

## Implementation plan

### Phase 0 — Save the doc
Save/sync this plan to `docs/PORTAL_INTEGRATION_PLAN.md` (this file).

### Phase 1 — Database (`supabase/migrations/00000000000015_portal_publishing.sql`)

Follow the existing migration style (nullable `add column if not exists`, company-scoped
RLS copied from the `properties_select` / `properties_write` policies, `set_updated_at`
triggers).

**1a. Extend `properties`** (all nullable → existing rows unaffected):
`title_ar`, `description_ar` text · `bedrooms` text · `bathrooms` text ·
`furnishing` text · `size_unit` text default `'SQFT'` · `rent_frequency` text ·
`is_off_plan` boolean default false · `project_status` text ·
`amenities` text[] default `'{}'` · `features` text[] default `'{}'` ·
`permit_type` text · `issuing_license_number` text ·
`city` text · `locality` text · `sub_locality` text · `tower_name` text ·
`pf_location_id` integer.
(Agent name/phone/email are **derived** from the assigned employee at render time — no columns.)

**1b. `company_portal_credentials`** (per company + platform, `unique(company_id, platform)`):
`platform text check in ('bayut_dubizzle','propertyfinder')`, `enabled boolean`,
`feed_token text` (random, for that company's feed URL), `api_key`, `api_secret`,
`pf_public_profile_id`, `license_number`, `default_permit_type`,
`cached_access_token`, `cached_token_expires_at timestamptz`, timestamps.
RLS: company-scoped select + `company_super_admin` write. Secrets are read server-side
via `getSupabaseAdmin()`. (Note: `api_secret` stored plaintext under RLS — flag
column-level encryption as a future hardening.)

**1c. `property_publications`** (per property + granular platform,
`unique(property_id, platform)`):
`property_id` FK cascade, `company_id` FK, `platform text check in ('bayut','dubizzle','propertyfinder')`,
`status text default 'draft' check in ('draft','pending','published','failed','unpublished')`,
`external_id text` (PF listingId), `last_error text`, `last_synced_at`, `published_at`, timestamps.
RLS: company-scoped, `company_super_admin` write.

**1d. Types**: mirror all of the above into `src/types/supabase-entities.types.ts`
(`Portal`, `PortalCredentials`, `PropertyPublication`, extended `Property`).

### Phase 2 — Bayut + dubizzle combined XML feed (first `src/app/api` route)

- **`src/app/api/feeds/portals/[token]/route.ts`** — public `GET` Route Handler
  (`export const dynamic = "force-dynamic"`). Resolve `token` → `company_portal_credentials`
  (platform `bayut_dubizzle`, enabled) → `company_id` via `getSupabaseAdmin()` (crawler is
  unauthenticated, so service-role read, scoped strictly by token). Each company has its
  own feed URL/token.
- Load properties **of that company** that have a `property_publications` row for `bayut`
  or `dubizzle` with status `published` **or** `unpublished` (unpublished emitted once as
  `Property_Status=deleted` so the portal removes them), joined to type/owner/employee/area.
- **`src/lib/portals/bayut-xml.ts`** — pure builder mapping a `PropertyWithRelations` →
  the `<Property>` block; `<Portals>` lists only the enabled portals for that property;
  CDATA-wrap text; agent contact from the joined employee; images from `images[]`.
  Return `Content-Type: application/xml`.
- The company's feed URL (`/api/feeds/portals/{token}`) is shown in that company's Settings
  to hand to Bayut/dubizzle.

### Phase 3 — PropertyFinder REST client + publish flow

- **`src/lib/portals/propertyfinder/client.ts`** — token acquisition
  (`POST https://atlas.propertyfinder.com/v1/auth/token` with the company's apiKey/secret)
  cached per company in `cached_access_token`/`cached_token_expires_at` (30-min JWT, no
  refresh flow); thin wrappers for `createListing`, `publishListing`, `unpublishListing`,
  `getCompliance`, `searchLocations`; incremental-backoff retry on 429.
- **`src/lib/portals/propertyfinder/map.ts`** — `PropertyWithRelations` +
  the company's credentials → `POST /v1/listings` body (category/type/price/bedrooms/
  amenities/compliance/`createdBy`(company's publicProfileId)/`issuingClientLicenseNumber`
  (company's license)/location.id/media, bilingual title+description).
- **`src/actions/portalPublishing.ts`** (`"use server"`):
  - `getPropertyPublications(propertyId)`, `getPortalCredentials(companyId)`,
    `upsertPortalCredentials(...)`.
  - `setPortalPublication(propertyId, platform, enabled)` — loads the property's company
    credentials first; errors clearly if that platform is not configured for the company:
    - **bayut/dubizzle** → upsert `property_publications` status (`published`/`unpublished`).
      No external call; effective on next crawl.
    - **propertyfinder, enable** → validate required fields → (Dubai) `getCompliance`
      → `createListing` (draft) → `publishListing` → store `external_id`, status `pending`.
    - **propertyfinder, disable** → `unpublishListing(external_id)` → status `unpublished`.
  - `validatePropertyForPortal(property, platform)` → list of missing required fields
    (drives the UI's "can't enable yet" state).
- **`src/app/api/webhooks/propertyfinder/route.ts`** — `POST` handler for
  `listing.published` / `listing.publishFailed` / `listing.unpublished`; match
  `external_id`, update `property_publications` status + `last_error`. (Subscribe via
  `POST /v1/webhooks` per company — one-time setup helper or manual.)

### Phase 4 — Property pages restructure (add + detail) & extracted form

Bring properties in line with the clients/owners `/new` + `/[id]` convention: **one shared
view component drives the add page, the detail page, and edit** — replacing the inline
dialog and the `[id]` stub.

- **`src/components/company/properties/PropertyDetailView.tsx`** (new, mirrors
  `ClientDetailView`) — accepts an optional `propertyId`:
  - **no id ⇒ create/add mode**: renders the property form (see below), on save calls
    `useCreateProperty` then routes to the new `/[id]`.
  - **id ⇒ detail + edit mode**: shows the full detail (image carousel, details, status
    history — reuse the content currently in `PropertyDetailModal.tsx`), a **Publish to
    portals** section, and an **Edit** affordance that reveals the same form prefilled
    (`useProperty` + `useUpdateProperty`).
- **`src/app/company/(app)/properties/add/page.tsx`** (new) — thin wrapper (DocumentHead +
  `CompanyAdminHeader` + `<PropertyDetailView />`), matching `clients/new/page.tsx`.
  *(App convention elsewhere is `/new`; using `/add` per the explicit request.)*
- **`src/app/company/(app)/properties/[id]/page.tsx`** (replace stub) — thin wrapper
  rendering `<PropertyDetailView propertyId={id} />`, matching `clients/[id]/page.tsx`.
- **`src/app/company/(app)/properties/page.tsx`** — remove the inline create/edit dialog;
  the **"Add Property"** buttons now navigate (`Link`/`router.push`) to `/company/properties/add`.
- **`PropertyCard.tsx`** — **View** button → navigate to `/company/properties/{id}`;
  **Edit** → `/company/properties/{id}` (edit affordance there). Keep the quick status select.
- The **create/edit form** (currently inline in `properties/page.tsx`, tabs "Basic Info" /
  "Details & Media") moves into `PropertyDetailView` (or a `PropertyForm` it renders) and
  gains a **"Portal / Publishing" tab**; extend `PropertySchema`
  (`src/validations/property.schema.ts`) with the new portal fields (bilingual
  title/description, bedrooms, bathrooms, furnishing, rent frequency, off-plan, amenities,
  permit type/number, license number, Bayut location fields, PF location picker).

### Phase 5 — Publish UI & Settings

- **`src/hooks/queries/usePortalPublishing.ts`** — React Query wrappers
  (`usePropertyPublications`, `useSetPortalPublication`, `usePortalCredentials`,
  `useUpsertPortalCredentials`) following the `useProperties.ts` invalidation pattern.
- **`src/components/company/properties/PublishToPortalsModal.tsx`** — one dialog, three
  rows (Bayut / dubizzle / PropertyFinder), each: toggle + status badge
  (draft/pending/published/failed/unpublished) + last-synced time + error text +
  a "missing fields" hint from `validatePropertyForPortal`, and a "not configured" state
  when the company hasn't set that platform's credentials. PF row shows a spinner while
  the publish action runs.
- Add a **Publish** button (e.g. `Share2`/`Globe` icon) to `PropertyCard.tsx` `CardFooter`
  and into the `PropertyDetailView` detail mode, opening the modal for that property.
- **Settings** (`src/app/company/(app)/settings/page.tsx`) — new **"Portal Integrations"**
  section (per company): manage Bayut/dubizzle feed (show the company's feed URL + regenerate
  token) and PropertyFinder credentials (api key/secret, public profile id, license number),
  backed by `company_portal_credentials`.

### Phase 6 — PF location & amenity helpers (supporting)
- Location autocomplete in the form calling `searchLocations` (PF requires manual
  selection → store `pf_location_id`).
- Map CRM free-form features → PF's fixed `amenities` enum (`src/lib/portals/amenities.ts`).

---

## Critical files

| Area | Path |
|---|---|
| Migration (new) | `supabase/migrations/00000000000015_portal_publishing.sql` |
| Types | `src/types/supabase-entities.types.ts` |
| XML feed route (new) | `src/app/api/feeds/portals/[token]/route.ts` |
| XML builder (new) | `src/lib/portals/bayut-xml.ts` |
| PF client/map (new) | `src/lib/portals/propertyfinder/{client,map}.ts` |
| PF webhook (new) | `src/app/api/webhooks/propertyfinder/route.ts` |
| Publish actions (new) | `src/actions/portalPublishing.ts` |
| Publish hooks (new) | `src/hooks/queries/usePortalPublishing.ts` |
| Publish modal (new) | `src/components/company/properties/PublishToPortalsModal.tsx` |
| Shared detail/form view (new) | `src/components/company/properties/PropertyDetailView.tsx` (mirrors `ClientDetailView.tsx`) |
| Add page (new) | `src/app/company/(app)/properties/add/page.tsx` |
| Detail page (replace stub) | `src/app/company/(app)/properties/[id]/page.tsx` |
| Card / old modal (reuse content) | `src/components/company/properties/PropertyCard.tsx`, `PropertyDetailModal.tsx` |
| List page + schema | `src/app/company/(app)/properties/page.tsx`, `src/validations/property.schema.ts` |
| Settings | `src/app/company/(app)/settings/page.tsx` |
| Reuse | `src/lib/supabase/server.ts` (`getSupabaseAdmin`), `src/actions/properties.ts` (`PROPERTIES_SELECT`) |

---

## Verification

1. **Migration**: apply `00000000000015`; confirm new columns/tables + RLS in Supabase.
2. **Feed**: for a company, enter its Bayut/dubizzle feed config, enable Bayut+dubizzle on
   a property, open `/api/feeds/portals/{token}`, validate XML against the PDF sample
   (correct `<Portals>`, CDATA, images, agent); confirm cross-company isolation (a
   company's token returns only its own properties; wrong token → 404/empty) and that
   toggling off emits `Property_Status=deleted`.
3. **PropertyFinder** (sandbox creds from `docs/platforms.md`): configure a company's PF
   credentials, enable PF on a property → assert draft created + publish accepted +
   `external_id`/`pending` stored; simulate a `listing.published` webhook → status flips to
   `published`; disable → `unpublish`.
4. **UI**: modal shows correct per-platform status, "not configured" when the company has no
   keys, "missing fields" blocks enabling until satisfied, error surfaces on failed publish.
5. **Pages**: `/company/properties/add` renders the create form and saves → redirects to
   `/company/properties/{id}`; `/company/properties/{id}` shows real detail (no more stub)
   with working Edit + Publish; list "Add Property" and card View/Edit navigate to the new
   routes.
6. **Regression**: existing property create/edit/delete/status flow still works through the
   new pages (`npm run build` / lint; new fields are nullable and optional).

## Sequencing
Phase 1 → (2 and 3 in parallel: Bayut/dubizzle feed + PropertyFinder client) →
4 (pages restructure + extracted form) → 5 (publish UI + Settings) → 6 (PF helpers).
Phase 4 can start right after Phase 1 in parallel with 2/3 since it depends only on the
new `properties` fields.
