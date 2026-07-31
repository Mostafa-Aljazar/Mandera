-- Identity audit: store free-text requester name (PDF: طالب التعديل).
-- Keep requested_by UUID optional for profile linkage when available.

alter table identity_field_audit
  add column if not exists requester_name text;

-- Backfill empty requester_name from null so older rows stay valid.
update identity_field_audit
set requester_name = coalesce(nullif(btrim(requester_name), ''), '—')
where requester_name is null;
