-- ---------------------------------------------------------------------------
-- Portal tables: bring RLS write policies onto the current four-role model.
--
-- `property_publications` and `company_portal_credentials` were created in
-- migrations 15/18, before 00000000000033_permissions_roles_and_workflows.sql
-- replaced company_super_admin/company_employee with
-- master_admin/manager/administrator/sales_agent. That migration rewrote the
-- policies for every other company-scoped table but missed these two, so their
-- write policies still require `p.role = 'company_super_admin'` — a value no
-- profile can hold any more. The practical effect: EVERY portal publish/
-- unpublish toggle failed with
--   new row violates row-level security policy for table "property_publications"
-- for every company user, including managers.
--
-- Write access mirrors the app-layer gates in src/actions/portalPublishing.ts:
--   * property_publications      -> canPublishToPortals()   = administrator | manager
--   * company_portal_credentials -> canViewCompanySettings() = manager only
-- Select policies already used the company_id check only and stay as they are.
-- ---------------------------------------------------------------------------

drop policy if exists property_publications_write on property_publications;
create policy property_publications_write on property_publications for all
  using (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = property_publications.company_id
      and auth_role() in ('administrator', 'manager')
    )
  )
  with check (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = property_publications.company_id
      and auth_role() in ('administrator', 'manager')
    )
  );

drop policy if exists company_portal_credentials_write on company_portal_credentials;
create policy company_portal_credentials_write on company_portal_credentials for all
  using (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = company_portal_credentials.company_id
      and auth_role() = 'manager'
    )
  )
  with check (
    auth_role() = 'master_admin'
    or (
      auth_company_id() = company_portal_credentials.company_id
      and auth_role() = 'manager'
    )
  );
