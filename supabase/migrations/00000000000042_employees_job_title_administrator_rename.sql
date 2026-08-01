-- Align employees.job_title with profiles.role: 'admin' -> 'administrator'.
-- profiles.role has used 'administrator' since migration 33; job_title was
-- never updated to match, leaving a silent naming mismatch bridged only by
-- app-code mapper functions (jobTitleForRole/roleFromJobTitle).

alter table employees
  drop constraint if exists employees_job_title_check;

update employees
set job_title = 'administrator'
where job_title = 'admin';

alter table employees
  add constraint employees_job_title_check
  check (job_title in ('sales_agent', 'administrator', 'manager'));
