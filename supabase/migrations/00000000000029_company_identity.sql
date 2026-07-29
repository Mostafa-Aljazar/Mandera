-- Add bilingual company name (company_name_en + company_name_ar) and a logo_url
-- column to companies. Legacy `company_name` is intentionally kept (not dropped)
-- until the new columns are verified end-to-end — see
-- 00000000000030_company_name_drop_legacy.sql for the follow-up drop.
-- Safe to re-run if columns already exist.
alter table companies
  add column if not exists company_name_en text,
  add column if not exists company_name_ar text,
  add column if not exists logo_url text;

-- Backfill from legacy `company_name` only while that column still exists.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'companies'
      and column_name = 'company_name'
  ) then
    update companies
    set
      company_name_en = coalesce(nullif(btrim(company_name_en), ''), company_name),
      company_name_ar = coalesce(nullif(btrim(company_name_ar), ''), company_name);
  end if;
end $$;

-- Ensure no nulls before NOT NULL (fallback if backfill couldn't run).
update companies set company_name_en = 'Untitled Company' where company_name_en is null or btrim(company_name_en) = '';
update companies set company_name_ar = company_name_en where company_name_ar is null or btrim(company_name_ar) = '';

alter table companies
  alter column company_name_en set not null,
  alter column company_name_ar set not null;
