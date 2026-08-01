-- Optional free-text client preference fields.

alter table public.clients
  add column if not exists preferred_area text,
  add column if not exists interests text;

comment on column public.clients.preferred_area is
  'Optional preferred area / location the client is looking in.';
comment on column public.clients.interests is
  'Optional free-text notes about client property interests.';
