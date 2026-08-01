-- Separate commission approval from deal approval on revenues.
-- Deal approval stays on approval_status; commission has its own status.

alter table public.revenues
  add column if not exists commission_approval_status text;

update public.revenues
set commission_approval_status = case
  when coalesce(commission_paid, false) then 'approved'
  else 'pending'
end
where commission_approval_status is null;

alter table public.revenues
  alter column commission_approval_status set default 'pending',
  alter column commission_approval_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'revenues_commission_approval_status_check'
  ) then
    alter table public.revenues
      add constraint revenues_commission_approval_status_check
      check (commission_approval_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;
