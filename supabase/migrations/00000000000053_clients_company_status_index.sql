-- Speeds up Client Pipeline dashboard counts (company_id + status_id filters).
-- Additive only — safe to run on the live database.

create index if not exists idx_clients_company_status
  on clients (company_id, status_id);
