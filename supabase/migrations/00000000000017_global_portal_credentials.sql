-- Portal credentials are Mandera-global, not per-company.
--
-- Correction to migration 15: Mandera holds ONE account per platform (one
-- Bayut/dubizzle contract + one PropertyFinder Enterprise account) and every
-- company's listings syndicate through it. So credentials move from the
-- per-company `company_portal_credentials` table to a single global
-- `portal_credentials` table (one row per platform), managed only by
-- master_admin. `property_publications` stays per-property/per-company — each
-- company still chooses which of ITS properties to publish.
--
-- Consequences:
--   * There is ONE combined Bayut+dubizzle feed (one feed_token) that contains
--     every company's published listings.
--   * PropertyFinder publishes use the single global API key/secret.
--   * The credentials UI lives under /master (master_admin), not company Settings.

-- ---------------------------------------------------------------------------
-- 1. Global portal_credentials (one row per platform)
-- ---------------------------------------------------------------------------
create table if not exists portal_credentials (
  id uuid primary key default gen_random_uuid(),
  platform text not null unique check (platform in ('bayut_dubizzle', 'propertyfinder')),
  enabled boolean not null default false,
  -- bayut_dubizzle: secures the single public feed URL
  feed_token text,
  -- propertyfinder: OAuth2 credentials + identity
  api_key text,
  api_secret text,
  pf_public_profile_id text,
  license_number text,
  default_permit_type text,
  -- propertyfinder: cached 30-min JWT (no refresh flow)
  cached_access_token text,
  cached_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- feed_token is looked up on every unauthenticated feed crawl -> index it.
create unique index if not exists portal_credentials_feed_token_idx
  on portal_credentials (feed_token) where feed_token is not null;

drop trigger if exists trg_portal_credentials_updated_at on portal_credentials;
create trigger trg_portal_credentials_updated_at
  before update on portal_credentials
  for each row execute function set_updated_at();

-- Seed the two platform rows so upsert-by-platform and the feed always have a
-- row to work with. Bayut gets a random feed_token up front.
insert into portal_credentials (platform, enabled, feed_token)
values ('bayut_dubizzle', false, replace(gen_random_uuid()::text, '-', ''))
on conflict (platform) do nothing;
insert into portal_credentials (platform, enabled)
values ('propertyfinder', false)
on conflict (platform) do nothing;

-- ---------------------------------------------------------------------------
-- 2. RLS: master_admin only (these are Mandera's private secrets).
--    Server-side code (feed route, PF client, publish action) reads them with
--    the service-role client, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table portal_credentials enable row level security;

drop policy if exists portal_credentials_all_master on portal_credentials;
create policy portal_credentials_all_master on portal_credentials for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'master_admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'master_admin'));

-- ---------------------------------------------------------------------------
-- 3. Retire the per-company credentials table (feature is not yet in real use).
--    property_publications is unchanged.
-- ---------------------------------------------------------------------------
drop table if exists company_portal_credentials cascade;
