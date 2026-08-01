-- Client budget as a from–to range (replaces single clients.budget for app writes).

alter table public.clients
  add column if not exists budget_from numeric,
  add column if not exists budget_to numeric;

update public.clients
set
  budget_from = coalesce(budget_from, budget),
  budget_to = coalesce(budget_to, budget)
where budget is not null
  and (budget_from is null or budget_to is null);

comment on column public.clients.budget_from is
  'Optional client budget range lower bound (AED).';
comment on column public.clients.budget_to is
  'Optional client budget range upper bound (AED).';
