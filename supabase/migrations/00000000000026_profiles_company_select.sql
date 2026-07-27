-- Allow company users to read teammate profiles in their own company.
-- Previously profiles SELECT was limited to own row + master_admin, so the
-- employees list could not show other company members (even though create
-- succeeded via the service-role client).

drop policy if exists profiles_select_company on profiles;
create policy profiles_select_company on profiles for select
  using (
    auth_company_id() is not null
    and auth_company_id() = profiles.company_id
  );

-- Company super admins can update teammate profiles in their company
-- (name/role/employee_id linkage). Own-row update remains via profiles_update_own.
drop policy if exists profiles_update_company_admin on profiles;
create policy profiles_update_company_admin on profiles for update
  using (
    auth_role() = 'company_super_admin'
    and auth_company_id() is not null
    and auth_company_id() = profiles.company_id
  )
  with check (
    auth_role() = 'company_super_admin'
    and auth_company_id() is not null
    and auth_company_id() = profiles.company_id
  );
