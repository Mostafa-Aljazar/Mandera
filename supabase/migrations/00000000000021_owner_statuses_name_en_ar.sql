-- Replace owner_statuses.name with bilingual name_en + name_ar.
-- Safe to re-run if columns already exist / name already dropped.
alter table owner_statuses
  add column if not exists name_en text,
  add column if not exists name_ar text;

-- Backfill from legacy `name` only while that column still exists.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'owner_statuses'
      and column_name = 'name'
  ) then
    update owner_statuses
    set
      name_ar = coalesce(nullif(btrim(name_ar), ''), name),
      name_en = coalesce(nullif(btrim(name_en), ''), name);
  end if;
end $$;

-- Ensure no nulls before NOT NULL (fallback if backfill couldn't run).
update owner_statuses set name_en = 'Untitled' where name_en is null or btrim(name_en) = '';
update owner_statuses set name_ar = name_en where name_ar is null or btrim(name_ar) = '';

-- Upgrade common demo labels to professional EN/AR terms.
update owner_statuses set name_en = 'New Owner', name_ar = 'مالك جديد'
  where name_en in ('New', 'New Owner');
update owner_statuses set name_en = 'Available for Marketing', name_ar = 'متاح للتسويق'
  where name_en in ('Available', 'Available for Marketing');
update owner_statuses set name_en = 'On Hold', name_ar = 'موقوف مؤقتاً'
  where name_en in ('Hold', 'On Hold');
update owner_statuses set name_en = 'Cancelled', name_ar = 'ملغى'
  where name_en in ('Cancel', 'Cancelled');

alter table owner_statuses
  alter column name_en set not null,
  alter column name_ar set not null;

alter table owner_statuses
  drop column if exists name;
