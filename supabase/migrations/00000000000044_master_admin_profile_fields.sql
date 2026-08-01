-- Bilingual display name + avatar for profiles (used by master_admin settings;
-- company employees still prefer employees.* for their own bilingual names).

alter table profiles
  add column if not exists name_en text,
  add column if not exists name_ar text,
  add column if not exists avatar_url text;

-- Backfill from legacy single-locale `name` where bilingual values are empty.
update profiles set
  name_en = coalesce(nullif(btrim(name_en), ''), nullif(btrim(name), ''), 'Admin'),
  name_ar = coalesce(nullif(btrim(name_ar), ''), nullif(btrim(name), ''), 'Admin')
where name_en is null or name_ar is null or btrim(coalesce(name_en, '')) = '' or btrim(coalesce(name_ar, '')) = '';
