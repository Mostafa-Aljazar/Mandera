-- Internal bilingual notes for company employees (not portal-published).
alter table properties
  add column if not exists note_en text default '',
  add column if not exists note_ar text default '';
