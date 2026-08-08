-- Platform mobile app store links (landing page Google Play / App Store buttons).
-- Public read (landing), master_admin write. Singleton row keyed by `key = 'default'`.

create table if not exists platform_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique default 'default' check (key = 'default'),
  google_play_url text,
  app_store_url text,
  google_play_coming_soon boolean not null default true,
  app_store_coming_soon boolean not null default true,
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_platform_settings_updated_at on platform_settings;
create trigger trg_platform_settings_updated_at
  before update on platform_settings
  for each row execute function set_updated_at();

insert into platform_settings (key)
values ('default')
on conflict (key) do nothing;

alter table platform_settings enable row level security;

drop policy if exists platform_settings_select_public on platform_settings;
create policy platform_settings_select_public on platform_settings
  for select using (true);

drop policy if exists platform_settings_write_master on platform_settings;
create policy platform_settings_write_master on platform_settings
  for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'master_admin'
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'master_admin'
    )
  );
