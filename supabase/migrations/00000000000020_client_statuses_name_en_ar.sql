-- Replace client_statuses.name with bilingual name_en + name_ar.
alter table client_statuses
  add column if not exists name_en text,
  add column if not exists name_ar text;

update client_statuses
set
  name_ar = coalesce(nullif(btrim(name_ar), ''), name),
  name_en = coalesce(nullif(btrim(name_en), ''), name);

alter table client_statuses
  alter column name_en set not null,
  alter column name_ar set not null;

alter table client_statuses
  drop column if exists name;
