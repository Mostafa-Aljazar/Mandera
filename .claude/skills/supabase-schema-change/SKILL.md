---
name: supabase-schema-change
description: How to safely add or alter columns/tables in this project's Supabase database — there's no working CLI, so migration files alone don't apply anything. Use whenever a task requires a schema change (new column, new table, bilingual-name conversion, RLS policy change).
---

# Applying a Supabase schema change in mandera-crm

## The core problem

`supabase/migrations/*.sql` files in this repo are **not** applied by any automated tool — there's
no `supabase/config.toml`, no linked project, no `db push` step, no CI migration runner. A file
existing in that folder tells you nothing about whether it's been run against the live database.
**Never write application code that depends on a column/table without confirming it exists in the
live database first.**

## How migrations actually land

1. **DDL statements** (`alter table`, `create table`, RLS policy changes) — write the migration
   file, then ask the user to run it in the Supabase Dashboard SQL Editor. `supabase-js` has no
   generic "run arbitrary SQL" call, so you cannot execute `alter table` yourself without a
   pre-existing RPC function for it (there isn't one here). Tell the user exactly which file to
   run and why, then wait for confirmation before writing code that depends on it.

2. **Verifying state, and plain data reads/writes** (`select`, `insert`, `update`, storage
   uploads) — do this yourself, directly, via a short-lived Node script using
   `@supabase/supabase-js` and the service-role key already in `.env.local`
   (`SUPABASE_SECRET_KEY`):

   ```js
   import { createClient } from "@supabase/supabase-js";
   import fs from "fs";
   const env = fs.readFileSync(".env.local", "utf8");
   const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
   const key = env.match(/SUPABASE_SECRET_KEY=(.*)/)[1].trim();
   const supabase = createClient(url, key);
   // ...select/insert/update as needed, then delete this script when done.
   ```

After any schema change, **verify it actually landed** — `select` the new column, or check
`information_schema.columns` — before writing application code against it. Don't take "success"
at face value for anything consequential; a verification query is cheap and catches partial
failures or a change applied to the wrong environment.

## Migration file conventions

- Numbered sequentially: `supabase/migrations/00000000000NNN_description.sql`. Check the highest
  existing number in the folder first — don't assume the last one you personally added is still
  the latest.
- Idempotent where practical: `add column if not exists`, `drop column if exists`, guard backfills
  with `information_schema.columns` existence checks if a step might run more than once.
- One logical change per file. A destructive change (dropping a column or table) gets its **own**
  migration file, separate from the additive change that precedes it — see the staged rollout
  pattern below.

## The bilingual-column pattern

This schema's convention for any human-facing name field is `<field>_en` + `<field>_ar`, not a
single field plus a separate translations table. Converting an existing single-language column
follows this exact shape (see `supabase/migrations/00000000000021_owner_statuses_name_en_ar.sql`
for a real worked example):

```sql
alter table <table>
  add column if not exists <field>_en text,
  add column if not exists <field>_ar text;

update <table> set
  <field>_en = coalesce(nullif(btrim(<field>_en), ''), <field>),
  <field>_ar = coalesce(nullif(btrim(<field>_ar), ''), <field>);

alter table <table>
  alter column <field>_en set not null,
  alter column <field>_ar set not null;

-- Separate migration file, run only after app code + verification below are complete:
alter table <table> drop column if exists <field>;
```

Then in application code:

- `src/types/supabase-entities.types.ts` — replace the single field with the `_en`/`_ar` pair.
- Every display site: use `bilingualLabel()` (or a small wrapper like `companyDisplayName()`) from
  `src/lib/bilingualLabel.ts` rather than reading `.field_en` directly — it owns the language-pick
  and fallback logic consistently.
- Every write path (server action, form, zod schema): accept and validate both fields
  independently (`.trim().min(1, ...)` each) — never assume one implies the other.

## Staged rollout for anything destructive

Never combine an additive change and a destructive drop in one migration that gets run
immediately. Sequence:

1. **Stage 1 (additive)** — add the new columns, backfill, set constraints. Ship all application
   code against the new columns. The old column stays in place, unused, as a safety net.
2. **Verify end-to-end** — `tsc --noEmit`, `next lint`, and manual testing of every read/write path
   that touches the changed table.
3. **Stage 2 (destructive)** — a separate migration file that drops the old column. Only ask the
   user to run this once step 2 is genuinely done, and say explicitly that it's irreversible.

A mistake in stage 1's application code is trivially recoverable this way (the old data is still
there); a combined migration would not be.
