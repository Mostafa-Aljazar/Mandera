-- Basic company contact fields + file attachments for master admin.

alter table companies
  add column if not exists phone text,
  add column if not exists admin_name text,
  add column if not exists notes text;

create table if not exists company_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  note text,
  file_url text,
  file_name text,
  file_size integer,
  file_mime text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_documents_company_id_idx
  on company_documents (company_id, created_at desc);

drop trigger if exists trg_company_documents_updated_at on company_documents;
create trigger trg_company_documents_updated_at
  before update on company_documents
  for each row execute function set_updated_at();

alter table company_documents enable row level security;

drop policy if exists company_documents_all_master on company_documents;
create policy company_documents_all_master on company_documents for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'master_admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'master_admin'));

insert into storage.buckets (id, name, public)
values ('company-files', 'company-files', true)
on conflict (id) do nothing;

drop policy if exists company_files_insert_authenticated on storage.objects;
drop policy if exists company_files_update_authenticated on storage.objects;
drop policy if exists company_files_delete_authenticated on storage.objects;

create policy company_files_insert_authenticated
on storage.objects for insert
to authenticated
with check (bucket_id = 'company-files');

create policy company_files_update_authenticated
on storage.objects for update
to authenticated
using (bucket_id = 'company-files')
with check (bucket_id = 'company-files');

create policy company_files_delete_authenticated
on storage.objects for delete
to authenticated
using (bucket_id = 'company-files');
