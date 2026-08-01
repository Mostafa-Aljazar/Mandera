-- PDF Manager: "transfer employee between branches" (Employees section).
-- company_branches (migration 35) existed only as a standalone directory with
-- no link back to employees, so the transfer described in the PDF had no
-- working path. Mirrors the team_id/reports_to_employee_id pattern.

alter table employees
  add column if not exists branch_id uuid references company_branches (id) on delete set null;
