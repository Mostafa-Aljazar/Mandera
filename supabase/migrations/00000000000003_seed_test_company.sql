-- Seed a demo company for local/test login, mirroring the PocketBase-era
-- demo tenant documented in .claude/LOCAL_DEV_CREDENTIALS.md ("Gold Real
-- Estate Company" / COMP001). Auth users + their profiles rows are created
-- separately via the Supabase Dashboard (Authentication -> Users), since
-- auth.users can't be inserted directly via SQL in the same way.
insert into companies (
  company_code,
  company_name,
  email,
  subscription_start_date,
  subscription_end_date,
  max_employee_count,
  is_active,
  is_frozen
) values (
  'COMP001',
  'شركة العقارات الذهبية',
  'admin@goldrealestate.test',
  '2025-01-01',
  '2027-12-31',
  10,
  true,
  false
)
returning id, company_code, company_name;
