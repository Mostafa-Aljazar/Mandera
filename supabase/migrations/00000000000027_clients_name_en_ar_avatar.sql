-- Bilingual client names + optional avatar.
alter table clients
  add column if not exists name_en text,
  add column if not exists name_ar text,
  add column if not exists avatar_url text;

update clients
set
  name_en = coalesce(nullif(btrim(name_en), ''), name),
  name_ar = coalesce(nullif(btrim(name_ar), ''), name);

alter table clients
  alter column name_en set not null,
  alter column name_ar set not null;
