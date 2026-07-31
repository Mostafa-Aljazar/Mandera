-- PDF Administrator: Clients by Source — performance by source, campaign, and employee.
-- Free-text campaign label on clients (optional; separate from marketing_channel).

alter table public.clients
  add column if not exists campaign text;

comment on column public.clients.campaign is
  'Optional marketing campaign label for Clients-by-Source reporting (PDF).';
