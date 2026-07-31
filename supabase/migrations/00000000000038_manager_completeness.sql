-- Manager PDF completeness: property document attachments.

alter table public.properties
  add column if not exists document_urls text[] not null default '{}'::text[];

comment on column public.properties.document_urls is
  'PDF/image document URLs for title deeds and related files (Manager can view).';
