-- Optional owner profile photo URL.
alter table owners
  add column if not exists avatar_url text;
