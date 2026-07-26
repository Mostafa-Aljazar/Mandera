-- Portal publishing: syndicate properties to Bayut, dubizzle & PropertyFinder.
-- See docs/PORTAL_INTEGRATION_PLAN.md for the design rationale.
--
--  1. Extend `properties` with the portal-required listing fields (all nullable
--     so existing rows are unaffected).
--  2. `company_portal_credentials` — per-company, per-platform accounts/keys.
--  3. `property_publications` — per-property, per-platform publish state.
--
-- RLS mirrors the existing company-scoped pattern from migration 1
-- (`_select` = same company; `_write` = same company + company_super_admin;
-- master_admin bypasses everything).

-- ---------------------------------------------------------------------------
-- 1. Extend properties with portal listing fields
-- ---------------------------------------------------------------------------
alter table properties
  add column if not exists title_ar text,
  add column if not exists description_ar text,
  add column if not exists bedrooms text,
  add column if not exists bathrooms text,
  add column if not exists furnishing text,
  add column if not exists size_unit text default 'SQFT',
  add column if not exists rent_frequency text,
  add column if not exists is_off_plan boolean default false,
  add column if not exists project_status text,
  add column if not exists amenities text[] default '{}',
  add column if not exists features text[] default '{}',
  add column if not exists permit_type text,
  add column if not exists issuing_license_number text,
  add column if not exists city text,
  add column if not exists locality text,
  add column if not exists sub_locality text,
  add column if not exists tower_name text,
  add column if not exists pf_location_id integer;

-- ---------------------------------------------------------------------------
-- 2. company_portal_credentials (one row per company per platform)
--    platform 'bayut_dubizzle' -> shared XML feed; 'propertyfinder' -> REST API.
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
  -- propertyfinder: cached 30-min JWT (no refresh flow) so we do not re-auth per call
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
-- 3. property_publications (per property + granular platform)
--    platform here is granular ('bayut' | 'dubizzle' | 'propertyfinder') so the
--    three toggles are independent, even though bayut+dubizzle share one feed.
-- ---------------------------------------------------------------------------
create table if not exists property_publications (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  platform text not null check (platform in ('bayut', 'dubizzle', 'propertyfinder')),
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'published', 'failed', 'unpublished')),
  external_id text,        -- PropertyFinder listing id
  last_error text,
  last_synced_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, platform)
);

create index if not exists property_publications_property_id_idx
  on property_publications (property_id);
create index if not exists property_publications_company_platform_idx
  on property_publications (company_id, platform, status);
create index if not exists property_publications_external_id_idx
  on property_publications (external_id) where external_id is not null;

drop trigger if exists trg_property_publications_updated_at on property_publications;
create trigger trg_property_publications_updated_at
  before update on property_publications
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (company-scoped, mirrors properties_select/properties_write)
-- ---------------------------------------------------------------------------
alter table company_portal_credentials enable row level security;
alter table property_publications enable row level security;

create policy company_portal_credentials_select on company_portal_credentials for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = company_portal_credentials.company_id)));
create policy company_portal_credentials_write on company_portal_credentials for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = company_portal_credentials.company_id and p.role = 'company_super_admin'))))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = company_portal_credentials.company_id and p.role = 'company_super_admin'))));

create policy property_publications_select on property_publications for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or p.company_id = property_publications.company_id)));
create policy property_publications_write on property_publications for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = property_publications.company_id and p.role = 'company_super_admin'))))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and (p.role = 'master_admin' or (p.company_id = property_publications.company_id and p.role = 'company_super_admin'))));
