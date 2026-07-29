---
name: excel-import-export
description: Conventions and known gotchas for the Clients/Owners bulk Excel import-export feature (src/lib/importExport/). Use before touching the template builders, import parsers, or the shared addListValidation/dropdown-validation logic.
---

# Excel import/export in mandera-crm

Clients and Owners each have a bulk import/export feature built on `exceljs`. The two modules are
structurally identical and share `src/lib/importExport/shared.ts` — look at the Owners
implementation first if extending or replicating this for a new entity, since it's the more
complete reference (it also demonstrates cross-entity linking, see below).

## File layout per entity

```
src/lib/importExport/
├── shared.ts                  # styling constants, addListValidation, upload/download helpers,
│                                 employee name/code matching, cellText coercion
├── {entity}Template.ts        # builds the downloadable .xlsx (header + example rows + hidden
│                                 "_lists" sheet backing the dropdowns)
└── {entity}ImportParser.ts    # parseXImportWorkbook(workbook, opts) -> ParsedImportRow[]
                                  (pure, synchronous, no I/O)
```

`components/company/{clients,owners}/Import{X}Dialog.tsx` orchestrates: read file → parse → show
per-row validation errors → confirm → bulk-create action. `Export{X}Dialog.tsx` is separate and
much simpler (column selection + language choice, no parsing).

## The dropdown data-validation bug — read this before touching `addListValidation`

`addListValidation()` in `shared.ts` registers a dropdown list on a column range. **Do not** set
`cell.dataValidation = {...}` in a per-row loop across hundreds of rows — this was the original
implementation and it silently corrupts the file:

- ExcelJS's internal range-merging bug emits **duplicate, overlapping** `<dataValidation>` ranges
  in the saved XML (e.g. both `D10:D503` and `D4:D503` for the same column, instead of one clean
  range).
- ExcelJS's own reader tolerates this malformed XML without complaint, so re-reading the file with
  ExcelJS and checking `cell.dataValidation` looks completely fine — **this is a trap**, it does
  not prove the file is valid.
- Real Microsoft Excel does not tolerate it: it silently strips the data validations during its
  automatic "repair" step on open, and the dropdown just doesn't appear. No error is shown to the
  user who opens the file.

The fix, already in place — register the whole range in **one call**:

```ts
sheet.dataValidations.add(`${columnLetter}${firstRow}:${columnLetter}${lastRow}`, {
  type: "list",
  allowBlank: true,
  formulae: [formula],
  showErrorMessage: true,
  errorStyle: "warning",
  error: "Please pick a value from the dropdown list.",
});
```

(`Worksheet.dataValidations` is a real runtime API but missing from ExcelJS's shipped type defs —
`shared.ts` has a local `WorksheetWithDataValidations` interface cast for this; reuse it rather
than re-adding `any`.)

**If you ever need to verify a generated `.xlsx` for real** — reading it back through ExcelJS is
not sufficient proof the dropdowns work. Inspect the raw `xl/worksheets/sheet1.xml` inside the
zip (e.g. via `jszip`) and confirm there's exactly one `<dataValidation>` entry per validated
column, with a single clean range — not several overlapping ones.

## The round-trip data-loss trap (different bug, same symptom)

Separately: if a `.xlsx` file is **read, modified, and re-saved** (not built fresh), ExcelJS can
drop data-validations that reference another worksheet (the hidden `_lists` sheet backing every
dropdown here) during that round-trip — even with the single-range fix above. Validations that
reference the *same* sheet survive; cross-sheet ones don't reliably. Practical implication: when
generating a one-off filled-in sample/demo file, build it **fresh** with ExcelJS (like the real
template builders do) rather than downloading the template and re-opening/re-saving it — don't
edit-in-place if you need dropdowns to survive.

## Employee name matching must not be language-dependent

`buildEmployeeNameIndex(employees)` registers **both** the English and Arabic display name for
every employee, regardless of the app's current UI language. This was a real shipped bug: the
matcher used to only index whichever language the app happened to be in at parse time, so a file
with Arabic employee names failed to import when the app was switched to English (and vice versa).
A file must import correctly regardless of which UI language it's uploaded under — don't
special-case matching on the current `language` value anywhere in the parsers.

Employee resolution order: try the `(CODE)` suffix pattern first (a stable 6-hex-char code derived
from the employee's profile id, via `employeeShortCode`/`buildEmployeeCodeIndex` — robust against
renames/typos), then fall back to exact-name matching via the bilingual index above.

## Bilingual data conventions to preserve

- Country matching (`findCountry()` in `src/lib/countries.ts`) already accepts both English and
  Arabic country names/legacy aliases — don't add a language-specific branch on top of it.
- Interest Type (Sale/Rent) is stored as literal English tokens everywhere and is not
  language-dependent.
- Marketing Channel is free text (validated against the company's configured channel list via the
  dropdown, but not hard-blocked at parse time).

## Cross-entity linking (Owners → Properties)

Owners' import optionally links to **existing** properties via a "Linked Property Code(s))" column
(comma-separated `properties.code` values — Excel list-validation can't do true multi-select, so
this column stays free text with a dropdown assist for the first pick, documented as such in the
in-app help accordion). Creating new properties via spreadsheet is explicitly out of scope — too
many required fields/images for a bulk-row format to carry safely. Don't add this to Clients
(`interested_properties`) unless specifically asked — it was a deliberate owners-only scope
decision.
