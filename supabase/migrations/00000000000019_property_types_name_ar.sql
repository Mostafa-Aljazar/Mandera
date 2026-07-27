-- Replace property_types.name with bilingual name_en + name_ar.
alter table property_types
  add column if not exists name_en text,
  add column if not exists name_ar text;

-- Backfill from legacy `name` (seed data was often Arabic-only).
update property_types
set
  name_ar = coalesce(nullif(btrim(name_ar), ''), name),
  name_en = coalesce(nullif(btrim(name_en), ''), name);

alter table property_types
  alter column name_en set not null,
  alter column name_ar set not null;

alter table property_types
  drop column if exists name;
