-- Replace employees.first_name / last_name with bilingual EN + AR columns.
alter table employees
  add column if not exists first_name_en text,
  add column if not exists first_name_ar text,
  add column if not exists last_name_en text,
  add column if not exists last_name_ar text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employees'
      and column_name = 'first_name'
  ) then
    update employees
    set
      first_name_en = coalesce(nullif(btrim(first_name_en), ''), first_name),
      first_name_ar = coalesce(nullif(btrim(first_name_ar), ''), first_name),
      last_name_en = coalesce(nullif(btrim(last_name_en), ''), last_name),
      last_name_ar = coalesce(nullif(btrim(last_name_ar), ''), last_name);
  else
    update employees
    set
      first_name_en = coalesce(nullif(btrim(first_name_en), ''), ''),
      first_name_ar = coalesce(nullif(btrim(first_name_ar), ''), first_name_en, ''),
      last_name_en = coalesce(nullif(btrim(last_name_en), ''), ''),
      last_name_ar = coalesce(nullif(btrim(last_name_ar), ''), last_name_en, '');
  end if;
end $$;

alter table employees
  alter column first_name_en set not null,
  alter column first_name_ar set not null,
  alter column last_name_en set not null,
  alter column last_name_ar set not null;

alter table employees
  drop column if exists first_name,
  drop column if exists last_name;
