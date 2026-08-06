-- Performance indexes for company-dashboard queries (leaderboard, follow-ups,
-- pipeline, activity log, revenue). Purely additive: does not read, modify,
-- or delete any existing row — only builds lookup structures alongside the
-- tables. Safe to run against the live database.
--
-- Every business table is filtered by company_id (multi-tenant RLS), and the
-- dashboard widgets additionally filter/sort by employee_id, created_at, or
-- follow_up_date — none of those had a matching index before this file.

create index if not exists idx_clients_company_employee
  on clients (company_id, employee_id);

create index if not exists idx_clients_company_created_at
  on clients (company_id, created_at);

create index if not exists idx_clients_company_follow_up_date
  on clients (company_id, follow_up_date);

create index if not exists idx_properties_company_employee
  on properties (company_id, employee_id);

create index if not exists idx_properties_company_created_at
  on properties (company_id, created_at);

create index if not exists idx_owners_company_assigned_employee
  on owners (company_id, assigned_employee_id);

create index if not exists idx_client_status_history_company_created_at
  on client_status_history (company_id, created_at);

create index if not exists idx_client_status_history_client_id
  on client_status_history (client_id);

create index if not exists idx_client_status_history_created_by
  on client_status_history (created_by);

create index if not exists idx_owner_status_history_company_created_at
  on owner_status_history (company_id, created_at);

create index if not exists idx_owner_status_history_created_by
  on owner_status_history (created_by);

create index if not exists idx_property_status_history_company_created_at
  on property_status_history (company_id, created_at);

create index if not exists idx_property_status_history_created_by
  on property_status_history (created_by);

create index if not exists idx_revenues_company_id
  on revenues (company_id);

create index if not exists idx_revenues_employee_id
  on revenues (employee_id);
