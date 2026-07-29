-- Drops the legacy `company_name` column, now fully replaced by
-- company_name_en/company_name_ar (see 00000000000029_company_identity.sql).
-- Run this ONLY after confirming the General Settings tab, the master-admin
-- company forms, and every bilingual display site work correctly against
-- company_name_en/company_name_ar — this drop is not reversible.
alter table companies drop column if exists company_name;
