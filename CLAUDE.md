# Mandera CRM — working notes for Claude

Multi-tenant, bilingual (Arabic/English) SaaS CRM for UAE real-estate brokerages. Next.js App
Router + TypeScript + Supabase (Postgres/Auth/Storage). Full product context, tech stack, and
domain model live in [README.md](README.md) — this file is the "how we actually work in this
repo" layer, read it before making changes, not instead of the README.

## Contents

1. [Non-negotiable architectural rule](#non-negotiable-architectural-rule)
2. [Two Supabase clients — pick the right one](#two-supabase-clients--pick-the-right-one)
3. [Multi-tenancy](#multi-tenancy)
4. [Applying schema changes](#applying-schema-changes)
5. [Bilingual content convention](#bilingual-content-convention)
6. [i18n / RTL](#i18n--rtl)
7. [Feature modules](#feature-modules)
8. [Conventions worth knowing before you start](#conventions-worth-knowing-before-you-start)
9. [Where things live](#where-things-live)
10. [Historical context](#historical-context)

---

## Non-negotiable architectural rule

**Only `src/actions/*.ts` may talk to Supabase.** No `supabase.from(...)`, `.storage...`, or any
Supabase client import outside that directory — not in pages, not in components, not in hooks.
Pages/components call TanStack Query hooks in `src/hooks/queries/`; those hooks call action
functions from `src/actions/`. This is intentional and strict, not a style preference — it's the
only enforced boundary between UI and data access in this codebase.

Every action returns `{ data } | { error: string }`, never throws across the boundary:

```ts
export async function updateThing(input: Input): Promise<ActionResult<Thing>> {
  const { data, error } = await supabase.from("things").update(...).select().single();
  if (error) return { error: error.message };
  return { data };
}
```

Hooks convert the error field into a thrown `Error` inside `queryFn`/`mutationFn` so TanStack
Query's own loading/error state handles it — don't add try/catch plumbing beyond that.

## Two Supabase clients — pick the right one

`src/lib/supabase/server.ts` exports both:

| Client | Behavior | Use for |
|---|---|---|
| **`getServerSupabase()`** | Cookie-bound, RLS-enforcing | The default — every read, and writes where the RLS policy already permits the caller (e.g. `master_admin` writing `companies`, or a `manager` writing their own company-scoped tables) |
| **`getSupabaseAdmin()`** | Service-role key, bypasses RLS entirely | Only when RLS genuinely can't grant the access needed (e.g. `manager` self-service writes to `companies`, which RLS restricts to `master_admin` only), and for `auth.admin.createUser`/`deleteUser`, which has no RLS-bound equivalent |

**Reaching for the admin client without an explicit role check first is a real security bug, not
just a style issue.** Every admin-client write path in this repo asserts the caller's
role/company membership first — see `assertCompanyAccess` in `src/actions/employees.ts`, or the
full read-role → assert → write-via-admin pattern in `src/actions/company-settings.ts`. That
pattern is duplicated per-file rather than shared, which matches this codebase's existing
convention — don't introduce a shared helper module for it without asking.

## Multi-tenancy

Every business table carries `company_id`; Postgres RLS enforces tenant isolation at the database
level, not just in the UI.

| Role | Scope |
|---|---|
| `master_admin` | Platform operator, full access across all tenants |
| `manager` | Full access within their own tenant, including revenue/commission data, Employees, and Company Settings |
| `administrator` | Company-wide read/manage access within their own tenant (clients, owners, properties, approvals), but no Revenue, Employees, or Company Settings |
| `sales_agent` | Scoped to clients/owners/properties explicitly assigned to them; new properties they create start as `draft` and need `administrator`/`manager` approval |

This four-role model (`master_admin`/`sales_agent`/`administrator`/`manager` on `profiles.role`)
replaced an earlier two-tier `company_super_admin`/`company_employee` model — see
`supabase/migrations/00000000000033_permissions_roles_and_workflows.sql` for the full RLS
rewrite and `src/lib/permissions.ts` for the role predicates (`isSalesAgent`,
`isAdministratorOrAbove`, `canAccessManagerModules`, etc.) used throughout the app layer.

When adding a new table or action, check the RLS policy in
`supabase/migrations/00000000000033_permissions_roles_and_workflows.sql` (or the table's own
migration) before assuming a client can write to it — plenty of tables only grant `manager`
write access, not `administrator`/`sales_agent`.

## Applying schema changes

**There is no working Supabase CLI on this dev machine and no linked project** — `supabase db
push` does not apply here. Migration files under `supabase/migrations/` are the historical record
of schema changes, but the SQL itself gets applied one of two ways:

1. The user runs it manually via the Supabase Dashboard SQL Editor, or
2. It gets executed directly against the live database using the service-role key already present
   in `.env.local` (`SUPABASE_SECRET_KEY`) via a short throwaway Node script — the same approach
   used for every migration to date (see git history on `src/actions/company-settings.ts`'s
   introduction for a worked example).

**Never assume a migration file being present in the repo means it's been applied.** Verify
against the live schema (a quick `select` for the new column, or a check against
`information_schema.columns`) before writing application code that depends on it. See the
`supabase-schema-change` skill for the full workflow, including the bilingual-column pattern
(`name_en`/`name_ar`) used throughout this schema.

## Bilingual content convention

Every human-facing name field is split `..._en`/`..._ar` (not a single field plus a separate
translation table) — `company_name_en`/`company_name_ar`, `name_en`/`name_ar` on lookup tables
(`property_types`, `client_statuses`, `owner_statuses`), `first_name_en`/`first_name_ar` +
`last_name_en`/`last_name_ar` on person records (employees/owners/clients).

Display logic picks the right one for the current UI language via helpers in
`src/lib/bilingualLabel.ts`:

- `bilingualLabel()` — simple name pairs
- `employeeDisplayName()` — split first/last names
- `companyDisplayName()` — companies

Never read `.name_en` directly in a component when a helper exists — the helpers also handle the
fallback chain for legacy/partial data.

Migrating an existing single-language column to this pattern follows a fixed shape: add both
`_en`/`_ar` columns, backfill both from the old column, set `not null`, then drop the old column —
see any of `supabase/migrations/000000000000{19,20,21,23,24,27,29}_*.sql` for the exact SQL shape,
or the `supabase-schema-change` skill.

`src/locales/en.json`/`ar.json` are separate from this — those are UI chrome (buttons, labels,
toasts), not data. Arabic translations there use standard/fusha Arabic, not Egyptian or other
colloquial dialects — this was explicit user feedback, apply it consistently.

## i18n / RTL

Every screen ships in both languages via `react-i18next`; Arabic mode flips the whole layout RTL,
including third-party component internals (Radix dropdowns/popovers) via Radix's
`DirectionProvider`, not just `dir="rtl"` on the body. When adding a new translated string, add
the key to *both* `en.json` and `ar.json` in the same change — a missing Arabic key silently falls
back to the key name in the UI.

## Feature modules

Two subsystems have their own gotchas and dedicated reference material — read the linked doc/skill
before touching either.

**Excel import/export.** Clients and Owners both have a bulk import/export feature built on
`exceljs`, sharing `src/lib/importExport/shared.ts`. This module has a specific,
previously-shipped-broken gotcha around Excel data-validation dropdowns — see the
`excel-import-export` skill before touching `addListValidation`, the template builders, or the
import parsers.

**Portal syndication (Bayut, dubizzle, PropertyFinder).** Properties can be published to a
combined Bayut/dubizzle XML feed (`src/lib/portals/bayut-xml.ts`) and to PropertyFinder's
Enterprise API (`src/lib/portals/propertyfinder/`), both from `PublishToPortalsModal.tsx`.
Credentials are per-company (`company_portal_credentials`, RLS-scoped, managed from Settings →
Portal Integrations), never hardcoded. Read
[`docs/portals/portal-integration-plan.md`](docs/portals/portal-integration-plan.md) — the
architecture doc covering the data model and publish flow for each portal — before touching
`src/lib/portals/` or the publish modal.

## Conventions worth knowing before you start

- **Commit messages**: Conventional Commits prefixes (`feat:`, `fix:`, `refactor:`, `docs:`, etc.)
  with a detailed, professional body — explicit user preference, not a default.
- **Don't commit unless explicitly asked.** No exceptions for "obviously fine" changes.
- **Don't pick an email/notification provider unprompted.** Assignment-change notification emails
  (property/owner/client `employee_id` changes) were intentionally deferred during the Supabase
  migration — the hook points still exist as `// TODO` stubs in
  `src/actions/{properties,owners,clients}.ts`. If asked to wire this up, surface the provider
  choice to the user rather than guessing.
- **Master-admin pages are English-only** — no `useLanguage()`/RTL handling there, unlike every
  company-side page. Don't add bilingual UI to `src/app/master/**` unless asked.
- Scratch/debug Node scripts for one-off data checks or migrations are fine to write, but delete
  them when done — don't leave `_check_*.mjs`/`_test_*.mjs` files in the repo root.

## Where things live

```
src/
├── app/                                # App Router pages — /master/** and /company/** realms
├── actions/                            # Server Actions — the ONLY Supabase access point
├── components/
│   ├── company/, master/               # feature components, scoped by realm
│   ├── ui/                             # shadcn/ui primitives
│   └── common/                         # shared cross-realm components
├── contexts/                           # CompanyAuthContext, MasterAuthContext, LanguageContext
├── hooks/queries/                      # TanStack Query hooks wrapping actions
├── lib/
│   ├── supabase/                       # client.ts (browser), server.ts (RLS + admin clients)
│   ├── importExport/                   # Excel import/export shared logic
│   ├── portals/                        # Bayut/dubizzle XML + PropertyFinder API syndication
│   └── bilingualLabel.ts               # bilingual display helpers
├── locales/en.json, ar.json            # i18n dictionaries
├── validations/                        # zod schemas, one per form
├── middleware.ts                       # session refresh + route protection
└── types/supabase-entities.types.ts    # hand-written row types, grown module-by-module

supabase/migrations/                    # SQL schema history (see "Applying schema changes" above)

docs/                                   # portal-integration references (portals/) + a sample
                                         # listing for manual form testing (sample/) — see
                                         # docs/README.md for the index

.claude/
├── skills/                             # how-to notes for recurring workflows (schema changes,
│                                        # Excel import/export)
├── LOCAL_DEV_CREDENTIALS.md            # local login credentials + portal API keys — gitignored
└── archive/                            # historical migration docs (Vite→Next.js,
                                         # PocketBase→Supabase) — not current, kept for context
```

## Historical context

The app was originally Vite + React Router + PocketBase, ported to Next.js App Router while still
on PocketBase, then fully migrated to Supabase with a proper Server Actions + TanStack Query
layer. All of that is finished — the repo was later flattened out of its original monorepo shape
too. The docs in `.claude/archive/` walk through that journey in detail if you need to understand
*why* something is shaped the way it is, but treat every file path and tech-stack claim in them as
historical, not current.
