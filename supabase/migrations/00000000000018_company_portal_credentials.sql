-- Portal credentials are per-company again — reverses migration 17.
--
-- Correction to migration 17: each company registers and manages its OWN
-- Bayut/dubizzle feed and PropertyFinder Enterprise API account (own permit,
-- branding, and billing on the portal side); Mandera does not hold one shared
-- account on their behalf. `company_portal_credentials` is reinstated as a
-- per-company table (mirrors the original migration 15 design).
--
-- The global `portal_credentials` table from migration 17 is intentionally
-- LEFT IN PLACE (not dropped) — it may already hold a real, tested
-- PropertyFinder API key/secret entered via the master-admin screen, and
-- dropping it would silently destroy that. It is simply no longer read by
-- the app; a future cleanup migration can drop it once confirmed unused.
--
-- `property_publications` is unchanged (already per-property/per-company).

-- ---------------------------------------------------------------------------
-- 1. company_portal_credentials (one row per company per platform)
-- ---------------------------------------------------------------------------
create table if not exists company_portal_credentials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  platform text not null check (platform in ('bayut_dubizzle', 'propertyfinder')),
  enabled boolean not null default false,
  -- bayut_dubizzle: secures this company's public feed URL
  feed_token text,
  -- propertyfinder: OAuth2 credentials + identity
  api_key text,
  api_secret text,
  pf_public_profile_id text,
  license_number text,
  default_permit_type text,
  -- propertyfinder: cached 30-min JWT (no refresh flow) so we do not re-auth
  -- on every call
  cached_access_token text,
  cached_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, platform)
);

create index if not exists company_portal_credentials_company_id_idx
  on company_portal_credentials (company_id);
-- feed_token is looked up on every unauthenticated feed crawl -> index it.
create unique index if not exists company_portal_credentials_feed_token_idx
  on company_portal_credentials (feed_token) where feed_token is not null;

drop trigger if exists trg_company_portal_credentials_updated_at on company_portal_credentials;
create trigger trg_company_portal_credentials_updated_at
  before update on company_portal_credentials
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. RLS — company-scoped, mirrors properties_select/properties_write.
--    Any authenticated staff of the company can see the saved key/secret
--    (same pattern as e.g. `properties`); only company_super_admin can write.
--    master_admin bypasses scoping entirely, consistent with every other
--    company-scoped table.
-- ---------------------------------------------------------------------------
alter table company_portal_credentials enable row level security;

drop policy if exists company_portal_credentials_select on company_portal_credentials;
create policy company_portal_credentials_select on company_portal_credentials for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = company_portal_credentials.company_id)));

drop policy if exists company_portal_credentials_write on company_portal_credentials;
create policy company_portal_credentials_write on company_portal_credentials for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = company_portal_credentials.company_id and p.role = 'company_super_admin'))))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = company_portal_credentials.company_id and p.role = 'company_super_admin'))));
