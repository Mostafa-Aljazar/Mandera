-- employees.job_title was constrained to Arabic string literals
-- ('وكيل مبيعات','مسؤول','مدير') carried over from the PocketBase schema.
-- Switching to stable English codes so the database stores
-- language-neutral values; the UI still displays translated labels via
-- t('Sales Agent') etc. No real employee data exists yet, so no data
-- migration is needed -- just the constraint change.
alter table employees drop constraint if exists employees_job_title_check;
alter table employees
  add constraint employees_job_title_check
  check (job_title in ('sales_agent', 'admin', 'manager'));
