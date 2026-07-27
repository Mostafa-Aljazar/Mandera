-- Bilingual owner full name (EN + AR). Keep legacy `name` synced to English.
alter table owners
  add column if not exists name_en text,
  add column if not exists name_ar text;

update owners
set
  name_en = coalesce(nullif(btrim(name_en), ''), name),
  name_ar = coalesce(nullif(btrim(name_ar), ''), name);

alter table owners
  alter column name_en set not null,
  alter column name_ar set not null;
