# PocketBase → Supabase Migration — Status & Handoff

This doc is a self-contained handoff for continuing the PocketBase→Supabase migration in **any** tool (Cursor, VS Code, etc.), not just Claude Code. It supersedes the ephemeral Claude Code plan file that this work was originally scoped from (`zany-jumping-tiger.md`, a per-session file that may no longer exist). Read this doc plus [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) / [PROJECT_ARCHITECTURE_V2_NEXTJS.md](PROJECT_ARCHITECTURE_V2_NEXTJS.md) for full context — those two cover the pre-Supabase architecture (PocketBase schema, then the Vite→Next.js frontend port); this doc covers everything since.

**Status as of 2026-07-19: all 9 planned modules are migrated and build-verified. PocketBase is no longer used anywhere in `apps/web` at runtime.** What remains is: (1) run one pending SQL migration, (2) the user's own manual browser smoke-testing, (3) an explicit decision on assignment-notification emails, (4) the actual decommissioning (deleting `apps/pocketbase` and related dead code/deps) — none of which has happened yet.

---

## 1. What this migration is

Full replacement of the PocketBase backend (`apps/pocketbase/`) with Supabase (Postgres + Auth + Storage + Realtime), while introducing a proper server layer that didn't exist before:

- **Server Actions** in `apps/web/src/actions/*.ts` (`"use server"`) — the **only** place that imports a Supabase client or writes `supabase.from(...)` queries. This was an explicit, strict, non-negotiable constraint from the user: pages and components must never import a Supabase client directly, only call action functions (usually via a hook).
- **TanStack Query hooks** in `apps/web/src/hooks/queries/*.ts` — `queryFn`/`mutationFn` call the Server Action directly (RPC-style, no `fetch()`/API route hop).
- Pages/components call only the query hooks (or occasionally an action function directly for one-off calls like CSV export).

Execution proceeded module-by-module, in this fixed order, each verified with `tsc --noEmit` + `npm run build` before moving to the next:

1. Auth & Profiles
2. Properties
3. Owners
4. Clients
5. Employees
6. Companies
7. Settings entities (property types, client/owner statuses, marketing channels, areas & districts)
8. Revenue
9. Legal Pages

All 9 are done. Additionally, a later cleanup pass closed two files that had been left in a deliberate **hybrid** state during the Clients-module transition (see §5).

---

## 2. Architecture reference

### Supabase client/server setup
- `apps/web/src/lib/supabase/client.ts` — lazy browser singleton (`createBrowserClient`)
- `apps/web/src/lib/supabase/server.ts` — exports:
  - `getServerSupabase()` — cookie-bound (`createServerClient`), RLS-respecting, used in nearly every action
  - `getSupabaseAdmin()` — service-role key, bypasses RLS, used **only** for `auth.admin.createUser`/`deleteUser` and cascade deletes
- `apps/web/src/middleware.ts` — rewritten for `@supabase/ssr` session refresh + route protection, checking `profiles.role` instead of the old PocketBase authStore model
- `apps/web/src/components/Providers.tsx` — wraps the tree in `QueryClientProvider` (stable instance via `useState(() => new QueryClient())`)
- `apps/web/src/hooks/useRealtimeInvalidate.ts` — shared hook: `useRealtimeInvalidate(table, queryKey, filter?)` subscribes to `postgres_changes`, debounce-invalidates a TanStack Query key. Used by `useClientPipeline.ts` (the Client Pipeline widget) — the one realtime consumer in the app, mirroring what PocketBase's realtime subscription used to do.

### Auth model
Single `auth.users` (Supabase Auth) + one `public.profiles` table, replacing PocketBase's 3 separate auth collections (`master_admins`, `company_super_admins`, `company_employees`):
- `profiles.role`: `'master_admin' | 'company_super_admin' | 'company_employee'`
- `profiles.company_id`, `profiles.employee_id`, `profiles.name`
- PocketBase's employee split (`employees` base collection + `company_employees` auth collection) collapsed into `profiles` (auth identity) + `employees` (detail record: name, phone, job_title, disabled).

### RLS
Every table has RLS enabled. Two `SECURITY DEFINER` SQL functions, `auth_role()` and `auth_company_id()`, were added specifically to fix an infinite-recursion bug (see §6) — every policy uses these instead of inline `exists (select ... from profiles ...)`. Standard pattern per table:
- `select`: `auth_role() = 'master_admin' OR auth_company_id() = <table>.company_id`
- `insert/update/delete`: additionally requires `auth_role() = 'company_super_admin'` (history tables are looser — company-scoped read/write only, matching the original PocketBase rules)
- `legal_pages`: publicly readable (`using (true)`), write restricted to `master_admin`

### Types
- `apps/web/src/types/supabase-entities.types.ts` — hand-written record shapes, grown module-by-module (`Profile`, `Company`, `PropertyType`, `Owner`, `AreaDistrict`, `CompanyEmployee`, `Property`, `PropertyWithRelations`, `PropertyStatusHistory`, `OwnerStatus`, `OwnerStatusHistory`, `MarketingChannelRecord`, `OwnerWithRelations`, `ClientStatus`, `ClientStatusHistory`, `Client`, `ClientWithRelations`, `EmployeeJobTitle`, `EmployeeRecord`, `CompanyEmployeeWithDetails`, `LegalPageType`, `LegalPage`, `Revenue`)
- `apps/web/src/types/supabase.types.ts` — placeholder `export type Database = any;`. **Not yet replaced** with real Supabase-generated types (`supabase gen types typescript ...`) — this was planned as a cleanup step during decommissioning, not done yet, since there's no working Supabase CLI on this Windows dev machine (`npx supabase` has no Windows binary; the user runs all migrations manually via the Supabase Dashboard SQL Editor).

### Migrations
All in `apps/web/supabase/migrations/`, run manually by the user in the Supabase Dashboard SQL Editor (in order):

| File | Purpose |
|---|---|
| `00000000000001_initial_schema.sql` | All 19 tables + RLS policies + realtime publication |
| `00000000000002_storage_policies.sql` | `property-images` Storage bucket policies |
| `00000000000003_seed_test_company.sql` | Demo company row |
| `00000000000004_seed_test_profiles.sql` | Demo master admin + company admin auth/profile rows |
| `00000000000005_fix_profiles_recursion.sql` | **Important bugfix** — `SECURITY DEFINER` functions to fix infinite RLS recursion (see §6) |
| `00000000000006_add_properties_area_district.sql` | Added missing `properties.area_district` FK column |
| `00000000000007_seed_test_property_data.sql` | Demo property data |
| `00000000000008_seed_marketing_channels.sql` | Demo marketing channels |
| `00000000000009_employees_job_title_english.sql` | Changed `employees.job_title` CHECK constraint + data from Arabic literals to English codes |
| `00000000000010_seed_legal_pages.sql` | **Not yet run** — seeds placeholder Privacy Policy / Terms of Service rows (idempotent, `where not exists` guarded) |

**Action needed**: run `00000000000010_seed_legal_pages.sql` in the Supabase Dashboard SQL Editor. Until this runs, `/privacy-policy` and `/terms-of-service` will show a "failed to load" state, and the admin Legal Pages editor will show "Missing Database Record" for both tabs.

### Credentials
See `.claude/LOCAL_DEV_CREDENTIALS.md` (gitignored) for Supabase project URL/dashboard link and test account logins (master admin + company admin). That file also documents legacy PocketBase accounts, kept until decommissioning.

---

## 3. Module-by-module: what was built

Every module follows the same shape: `src/actions/<module>.ts` + `src/hooks/queries/use<Module>.ts`, then every consuming page/component rewired to use the hook instead of `pb.collection(...)`.

- **Auth & Profiles**: `CompanyAuthContext.tsx`, `MasterAuthContext.tsx` rewritten for `supabase.auth.signInWithPassword` + `profiles` fetch, same frozen/inactive/subscription-expired checks preserved.
- **Properties**: `actions/properties.ts` (full CRUD, Storage image upload to `property-images` bucket, `getPropertiesForOwner`, plus shared lookups reused by later modules: `getPropertyTypesForCompany`, `getOwnersForCompany`, `getCompanyEmployeesForCompany`, `getAreasDistrictsForCompany`). Later extended with `getCompanyOperationsStats` (dashboard counts, added during the hybrid-cleanup pass).
- **Owners**: `actions/owners.ts`, `actions/statusUpdate.ts` (shared status-update action, now covers `owner`/`property`/`client` — see §5), `actions/statusHistory.ts` (same three-way coverage).
- **Clients**: `actions/clients.ts` (CRUD, follow-ups, bulk reassign, CSV export data, pipeline-by-source), `actions/clientPipeline.ts` (realtime-driven pipeline aggregate).
- **Employees**: `actions/employees.ts` — `createEmployee` provisions a real `auth.users` account via `getSupabaseAdmin().auth.admin.createUser` + inserts `employees` + `profiles` rows, rolling back all three on any failure. `deleteEmployeeWorkflow` reassigns owners/clients/properties then deletes `profiles` + `employees` + the auth user. **`EmployeeJobTitle` enum is English-only**: `'sales_agent' | 'admin' | 'manager'` (changed from Arabic literals `'وكيل مبيعات' | 'مسؤول' | 'مدير'` per explicit user instruction — UI still displays translated labels via `t()`, only the stored value/DB constraint changed).
- **Companies**: `actions/companies.ts` — `createCompany` provisions the `company_super_admin` auth account, `deleteCompanyCascade` clears every company-scoped table + all profiles/auth users for that company, `renewCompanySubscription`, `toggleCompanyFreeze`, `getCompanyDashboardStats` (master-dashboard aggregate).
- **Settings entities**: consolidated into one `actions/settings.ts` covering full CRUD for `property_types`, `client_statuses` (with `priority_order`, including an inline-edit `updateClientStatusPriority`), `owner_statuses`, `marketing_channels`, `areas_districts`, plus `getCompanyEmployeesWithDetails` for the Settings "Employees" tab.
- **Revenue**: `actions/revenues.ts` — `completeDeal` is one action that atomically updates `properties.status`, inserts a `revenues` row, and logs `property_status_history` (mirrors the original 3-step PocketBase flow from `DealCompletedModal`).
- **Legal Pages**: `actions/legalPages.ts` — `getLegalPages`, `getLegalPage(pageType)`, `updateLegalPage`. Public pages (`/privacy-policy`, `/terms-of-service`) and the admin editor (`/admin/legal-pages`) all rewired.

---

## 4. Deferred decision: assignment-notification emails

**Status: intentionally not implemented. Do not implement without asking the user first.**

PocketBase had 3 hooks (`property-assignment-email.pb.js`, `owner-assignment-email.pb.js`, `client-assignment-email.pb.js`) that sent a bilingual email whenever `employee_id`/`assigned_employee_id` changed on an update, routed through a "Builder Mailer" HTTP API (env vars `BUILDER_MAILER_SENDER_ADDRESS`/`_API_URL`/`_API_KEY`).

The user explicitly said to skip implementing the actual send during this migration, but to keep it in mind for later. Current state: the three relevant actions detect the assignment change (or at least have the surrounding structure to) but the email-send itself is a `// TODO` stub. Exact locations:

- `apps/web/src/actions/properties.ts:376` — `// TODO: send assignment-change notification email if employee_id changed`
- `apps/web/src/actions/owners.ts:174` — `// TODO: send assignment-change notification email if assigned_employee_id...`
- `apps/web/src/actions/clients.ts:147` — `// TODO: send assignment-change notification email if employee_id changed`

**If asked to "finish the migration" or "wire up emails" later**: do not silently pick a provider. Two options were discussed and left open:
- (a) Reuse the existing Builder Mailer HTTP API/env vars directly from the Server Action (fastest, reuses existing infra)
- (b) Adopt a standard transactional-email provider (e.g. Resend) called directly from the action

Surface this choice to the user rather than guessing.

---

## 5. Hybrid-cleanup pass (closed after initial 9-module migration)

During the Clients module migration, two shared files were deliberately left in a **hybrid** state (owner/property → Supabase, client → still PocketBase) since Clients wasn't migrated yet at that point in the sequence:
- `apps/web/src/hooks/useStatusUpdate.ts`
- `apps/web/src/components/StatusHistoryDisplay.tsx`

This was closed out in a later pass, once all modules were done:
- `actions/statusUpdate.ts`'s `StatusUpdateEntityType` extended from `"owner" | "property"` to `"owner" | "property" | "client"`, with client-specific handling added (updates `clients.follow_up_date`/`follow_up_time`, inserts into `client_status_history` with `client_id`/`status_id`/`employee_id`).
- `actions/statusHistory.ts`'s `HistoryEntityType` similarly extended to include `"client"`, joining `client_statuses` for the status name.
- `useStatusUpdate.ts` and `StatusHistoryDisplay.tsx` had their PocketBase branches deleted entirely — both now always go through the Supabase actions for all three entity types.
- `apps/web/src/app/company-dashboard/page.tsx` was migrated too (this one had been missed entirely, not just left hybrid) — dashboard stat counts now come from a new `getCompanyOperationsStats` action (`actions/properties.ts`), and the RBAC job-title check (deciding whether to show `EmployeeLeaderboard`/`ClientsBySourceWidget`) now uses `useBaseEmployee` + the English job-title codes (`'manager' | 'admin'`) instead of the old Arabic literals (`'مدير' | 'مسؤول'`).

**Verified: as of this pass, there is zero remaining PocketBase SDK usage anywhere in `apps/web/src`.** Confirmed via a full-tree grep for `pocketbaseClient`/`pocketbaseServer`/`from "pocketbase"` — the only matches left are the two now-dead wrapper files themselves (`src/lib/pocketbaseClient.ts`, `src/lib/pocketbaseServer.ts`), the unused `src/types/pocketbase.types.ts`, the still-listed-but-unused `pocketbase` npm dependency in `apps/web/package.json`, and a handful of harmless comments referencing "PocketBase-era behavior" for historical context.

---

## 6. Notable bugs hit and fixed during this migration

- **Infinite recursion in `profiles` RLS policy** (Postgres error 42P17): every policy checked the caller's role/company_id by querying `profiles` from within a policy defined on `profiles` itself. Fixed via `SECURITY DEFINER` functions `auth_role()`/`auth_company_id()` (migration 5) that bypass RLS internally; every policy across all 16 RLS-enabled tables was rewritten to use these instead of inline subqueries. The single biggest/subtlest bug in the whole migration.
- **Missing `properties.area_district` column**: original schema only had `properties.area` (free text); the UI/filters/PropertyCard depend on a real FK to `areas_districts` (mirroring PocketBase's `expand`). Fixed via migration 6.
- **Phone input rendering broken**: missing `import "react-phone-number-input/style.css"` in `phone-input.tsx` collapsed the library's internal flex layout. Fixed by adding the import and rewriting the `.phone-input` CSS block in `globals.css` to own the single visible border/radius (matching plain shadcn `Input`), with inner elements made transparent/borderless.
- **Status history not appearing after status update**: a genuine two-backend split — `StatusHistoryDisplay.tsx` was reading PocketBase while the new `useStatusUpdate.ts` path was writing to Supabase. Fixed by migrating history display alongside status update (later fully closed in §5).
- **`emp.email` references throughout Owners/Clients/Employees/Companies pages**: the new `profiles` table has no `email` column (Supabase Auth owns email in `auth.users`, not exposed to simple selects) — every reference changed to fall back to `.id` or dropped, since `name` is always populated for real accounts.
- Several camelCase→snake_case straggler bugs (`companyName`→`company_name`, `created`/`updated`→`created_at`/`updated_at`, `maxEmployeeCount` type coercion, etc.) — each caught by `tsc`/build and fixed individually.

---

## 7. Verification status

Every module was verified with a clean `npx tsc --noEmit` (in `apps/web`) and a successful `npm run build` (21/21 routes) before moving to the next. As of the hybrid-cleanup pass, both checks are clean with **zero warnings** (the two pre-existing `react-hooks/exhaustive-deps` warnings on `revenue/page.tsx` and `admin/legal-pages/page.tsx` disappeared naturally once those pages stopped using manual `useEffect`-based fetching).

**What has NOT been verified**: real browser smoke-testing of each module against the live Supabase project (creating/editing/deleting real records, confirming RLS boundaries, confirming realtime invalidation). The user has been doing this module-by-module but had not yet finished a full pass as of this doc's writing. Do this before decommissioning PocketBase.

---

## 8. What's left (not yet done)

In order of what should happen next:

1. **Run migration `00000000000010_seed_legal_pages.sql`** in the Supabase Dashboard SQL Editor (see §2).
2. **Manual smoke-test every module** in the browser — especially Settings, Revenue, and Legal Pages, which were migrated last and have seen the least manual testing.
3. **Decide on assignment-notification emails** (§4) — or explicitly decide to leave deferred indefinitely.
4. **Decommission `apps/pocketbase`** — only after 1–3 above. This means:
   - Delete `apps/pocketbase/` entirely (binaries, `pb_data`, `pb_hooks`, `pb_migrations`)
   - Root `package.json`: remove `apps/pocketbase` from `dev`/`start` `concurrently` invocations; drop from the `workspaces` glob if it stops matching anything
   - `apps/web/package.json`: remove the `pocketbase` npm dependency
   - Delete `apps/web/src/lib/pocketbaseClient.ts`, `pocketbaseServer.ts`
   - Delete `apps/web/src/types/pocketbase.types.ts`
   - Optionally generate real Supabase types (`supabase gen types typescript --project-id <id> > src/types/supabase.types.ts`) to replace the `Database = any` placeholder — needs a machine with a working Supabase CLI (not this Windows dev machine as of this doc)
   - Remove the "Legacy: PocketBase accounts" section from `.claude/LOCAL_DEV_CREDENTIALS.md`

None of step 4 has been done yet — `apps/pocketbase` is untouched and still runnable in parallel, per the original plan's explicit requirement that decommissioning only happens once everything above is green.

---

## 9. Working conventions to preserve

If continuing this work in a different tool, keep these conventions consistent with what's already in place:

- **Never** import a Supabase client or write a `supabase.from(...)` call outside `src/actions/*.ts`. Pages/components call query hooks or (rarely) action functions directly.
- Every action returns `{ data } | { error: string }` — never throws across the server/client boundary. Hooks do `if (result.error) throw new Error(result.error)` inside `queryFn`/`mutationFn` so TanStack Query's own error state handles it.
- Migration files: `apps/web/supabase/migrations/00000000000NNN_description.sql`, run manually via the Supabase Dashboard SQL Editor (no working Supabase CLI on Windows here).
- Commit messages: Conventional Commits prefixes (`feat:`, `fix:`, `refactor:`, `docs:`, etc.) with a detailed, professional body — this was explicit user feedback, not a guess.
- Don't commit anything without being explicitly asked — no commits have been made for any of this Supabase migration work as of this doc.
