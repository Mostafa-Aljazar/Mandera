# Identity field protection (name & phone)

Technical rule: after a **client** or **owner** is created, identity fields are
immutable everywhere except a Master Admin audited correction.

## Locked fields (schema mapping)

The PDF names `first_name` / `middle_name` / `last_name` / `full_name` /
`phone_number` / `country_code`. This schema stores bilingual full names, so
the locked columns are:

| Entity | Locked columns |
|---|---|
| Client | `name`, `name_en`, `name_ar`, `phone`, `country_code` |
| Owner | `name`, `name_en`, `name_ar`, `phone`, `country` |

Constants: `CLIENT_IDENTITY_FIELDS` / `OWNER_IDENTITY_FIELDS` in
`src/lib/identity.ts`.

## Enforcement layers

1. **UI** — Client/Owner detail forms disable identity inputs after create and
   show a lock banner (`Identity fields are locked after create`).
2. **Server Actions** — `updateClient` / `updateOwner` reject mismatched
   identity values (`IDENTITY_FIELDS_LOCKED_ERROR`) and strip identity from the
   patch before write.
3. **Excel import** — create-only (`bulkCreateClients` / `bulkCreateOwners`);
   parsers reject existing phones (no overwrite of name/phone).
4. **Bulk edit** — assign/reassign/delete only; no bulk identity write path.
5. **Database** — `BEFORE UPDATE` triggers on `clients` / `owners`
   (`enforce_identity_fields_immutable`) block identity column changes unless
   the transaction set `app.allow_identity_correction = true`.

## Master Admin exception + audit

- UI: `IdentityCorrectionPanel` on the Master company page
  (`src/app/master/dashboard/companies/[id]/page.tsx`).
- Action: `correctIdentityField` → RPC `master_correct_identity_field`
  (migration `00000000000050_identity_fields_lock_trigger.sql`).
- Table: `identity_field_audit` stores:
  - `old_value` / `new_value`
  - `reason`
  - `requester_name` (required) + optional `requested_by`
  - `performed_by` (Master Admin)
  - `created_at`

## Applying the DB lock

There is no linked Supabase CLI on this machine. After pulling the migration
file, run it in the Supabase Dashboard SQL Editor:

`supabase/migrations/00000000000050_identity_fields_lock_trigger.sql`

Until that SQL is applied, app-layer locks still work; PostgREST direct updates
are only blocked once the triggers exist.
