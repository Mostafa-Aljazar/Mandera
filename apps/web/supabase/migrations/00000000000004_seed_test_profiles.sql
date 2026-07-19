-- Links the two auth.users created via the Dashboard to their profiles rows.
-- See .claude/LOCAL_DEV_CREDENTIALS.md for the corresponding login details.

insert into profiles (id, role, company_id, name)
values (
  '1c6a5ddf-8849-4d95-b060-b1c79a8eb276', -- master@realestate.test
  'master_admin',
  null,
  'Master Admin'
);

insert into profiles (id, role, company_id, name)
values (
  '8c1be29b-aac4-42c1-a90f-7b5be364db37', -- admin@goldrealestate.test
  'company_super_admin',
  'af1a6d45-4a4a-4d6b-979c-f5548f2feaab', -- Gold Real Estate Company
  'Gold Real Estate Admin'
);
