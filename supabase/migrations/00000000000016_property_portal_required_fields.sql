-- Extra Bayut/dubizzle + PropertyFinder fields needed for a complete
-- portal-ready listing form. See docs/PORTAL_INTEGRATION_PLAN.md and
-- docs/"Bayut & dubizzle Combined XML Guidelines - Updated.pdf".
--
-- All columns nullable so existing rows stay valid; the app form enforces
-- requiredness at create/edit time for portal-ready listings.

alter table properties
  -- Bayut off-plan detail tags (required when is_off_plan = true)
  add column if not exists offplan_sale_type text,
  add column if not exists offplan_dld_waiver numeric,
  add column if not exists offplan_original_price numeric,
  add column if not exists offplan_amount_paid numeric,
  -- PropertyFinder / general listing extras
  add column if not exists available_from date,
  add column if not exists parking_slots integer;

-- Optional check constraints (soft — only when value is set)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'properties_offplan_sale_type_check'
  ) then
    alter table properties
      add constraint properties_offplan_sale_type_check
      check (offplan_sale_type is null or offplan_sale_type in ('New', 'Resale'));
  end if;
end $$;
