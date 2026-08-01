-- Drop legacy single budget column after app uses budget_from / budget_to.

alter table public.clients
  drop column if exists budget;
