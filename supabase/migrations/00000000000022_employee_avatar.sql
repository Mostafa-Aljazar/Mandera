-- Employee profile photo URL.
alter table employees
  add column if not exists avatar_url text;
