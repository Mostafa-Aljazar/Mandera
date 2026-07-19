-- Minimal seed data so the Properties module's create-form dropdowns
-- (Property Type, Owner) aren't empty for the Gold Real Estate test company.
-- Company id: af1a6d45-4a4a-4d6b-979c-f5548f2feaab (see LOCAL_DEV_CREDENTIALS.md)

insert into property_types (name, company_id) values
  ('شقة', 'af1a6d45-4a4a-4d6b-979c-f5548f2feaab'),
  ('فيلا', 'af1a6d45-4a4a-4d6b-979c-f5548f2feaab'),
  ('مكتب', 'af1a6d45-4a4a-4d6b-979c-f5548f2feaab');

insert into owners (name, phone, country, company_id) values
  ('أحمد الفلاسي', '+971501234567', 'AE', 'af1a6d45-4a4a-4d6b-979c-f5548f2feaab'),
  ('فاطمة النعيمي', '+971509876543', 'AE', 'af1a6d45-4a4a-4d6b-979c-f5548f2feaab');
