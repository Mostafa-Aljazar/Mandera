-- Remove unused free-text client fields (campaign, preferred area, investment unit).
-- App no longer reads/writes these; Clients-by-Source is marketing_channel only.

alter table public.clients
  drop column if exists campaign,
  drop column if exists preferred_area,
  drop column if exists investment_unit;
