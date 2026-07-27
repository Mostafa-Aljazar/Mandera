-- Minimal seed data so the Properties module's create-form dropdowns
-- (Property Type, Owner) aren't empty for the Gold Real Estate test company.
-- Company id: af1a6d45-4a4a-4d6b-979c-f5548f2feaab (see LOCAL_DEV_CREDENTIALS.md)
-- Property type labels are bilingual after migration 19 (name_en / name_ar).

insert into property_types (name, company_id) values
  ('Apartment', 'af1a6d45-4a4a-4d6b-979c-f5548f2feaab'),
  ('Villa', 'af1a6d45-4a4a-4d6b-979c-f5548f2feaab'),
  ('Office', 'af1a6d45-4a4a-4d6b-979c-f5548f2feaab');

insert into owners (name, phone, country, company_id) values
  ('أحمد الفلاسي', '+971501234567', 'AE', 'af1a6d45-4a4a-4d6b-979c-f5548f2feaab'),
  ('فاطمة النعيمي', '+971509876543', 'AE', 'af1a6d45-4a4a-4d6b-979c-f5548f2feaab');
