import type ExcelJS from "exceljs";
import type { TFunction } from "i18next";
import { isValidPhoneNumber } from "react-phone-number-input";
import { findCountry } from "@/lib/countries";
import {
  buildEmployeeNameIndex,
  buildEmployeeCodeIndex,
  resolveEmployeeCell,
  cellText,
  type ImportEmployeeOption,
} from "@/lib/importExport/shared";
import type { PropertyCodeOption } from "@/actions/properties";
import type { OwnerImportRow, ParsedImportRow } from "@/lib/importExport/types";

const FIRST_DATA_ROW = 4;

export interface ParseOwnerImportOptions {
  employees: ImportEmployeeOption[];
  propertyCodes: PropertyCodeOption[];
  language: string;
  t: TFunction;
  /** Phone numbers (as stored in the DB) that already belong to an existing owner. */
  existingPhones: Set<string>;
}

export function parseOwnerImportWorkbook(
  workbook: ExcelJS.Workbook,
  { employees, propertyCodes, language, t, existingPhones }: ParseOwnerImportOptions,
): ParsedImportRow<OwnerImportRow>[] {
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const employeeNameIndex = buildEmployeeNameIndex(employees);
  const employeeCodeIndex = buildEmployeeCodeIndex(employees);
  const propertyCodeIndex = new Map(
    propertyCodes.map((p) => [p.code.trim().toLowerCase(), p.id]),
  );
  const results: ParsedImportRow<OwnerImportRow>[] = [];
  const phoneRowMap = new Map<string, number[]>();

  const lastRow = Math.max(sheet.actualRowCount, sheet.rowCount);
  for (let rowNumber = FIRST_DATA_ROW; rowNumber <= lastRow; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const nameEn = cellText(row.getCell(1)).trim();
    const nameAr = cellText(row.getCell(2)).trim();
    const phoneRaw = cellText(row.getCell(3)).trim();
    const countryRaw = cellText(row.getCell(4)).trim();
    const employeeRaw = cellText(row.getCell(5)).trim();
    const marketingChannel = cellText(row.getCell(6)).trim();
    const propertyCodesRaw = cellText(row.getCell(7)).trim();

    const isBlank = ![
      nameEn,
      nameAr,
      phoneRaw,
      countryRaw,
      employeeRaw,
      marketingChannel,
      propertyCodesRaw,
    ].some((v) => v.length > 0);
    if (isBlank) continue;

    const errors: string[] = [];

    if (!nameEn) errors.push(t("Full Name (EN) is required"));
    if (!nameAr) errors.push(t("Full Name (AR) is required"));

    const phoneValid = !!phoneRaw && isValidPhoneNumber(phoneRaw);
    if (!phoneRaw) errors.push(t("Phone number is required"));
    else if (!phoneValid) errors.push(t("Enter a valid phone number"));
    else if (existingPhones.has(phoneRaw)) {
      errors.push(t("This phone number already exists in the system"));
    }

    const country = findCountry(countryRaw);
    if (!countryRaw) errors.push(t("Country is required"));
    else if (!country) {
      errors.push(
        t("Unrecognized country — please use one of the values from the dropdown"),
      );
    }

    // Assigned employee is optional for owners — blank cell is valid.
    let employeeId: string | null = null;
    if (employeeRaw) {
      const resolution = resolveEmployeeCell(employeeRaw, employeeCodeIndex, employeeNameIndex);
      if (resolution.error === "unknown") {
        errors.push(t("Unknown employee name — check spelling or use the dropdown"));
      } else if (resolution.error === "ambiguous") {
        errors.push(t("Multiple employees share this name — please contact support"));
      } else {
        employeeId = resolution.employeeId;
      }
    }

    // Linked property codes are optional — blank is valid (no properties linked yet).
    const propertyIds: string[] = [];
    if (propertyCodesRaw) {
      const codes = propertyCodesRaw
        .split(/[,،]/)
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      const unknownCodes: string[] = [];
      for (const code of codes) {
        const propertyId = propertyCodeIndex.get(code.toLowerCase());
        if (propertyId) propertyIds.push(propertyId);
        else unknownCodes.push(code);
      }
      if (unknownCodes.length > 0) {
        errors.push(
          t("Unknown property code(s): {{codes}}", { codes: unknownCodes.join(", ") }),
        );
      }
    }

    if (phoneValid) {
      const key = phoneRaw.replace(/\D/g, "");
      const list = phoneRowMap.get(key) ?? [];
      list.push(rowNumber);
      phoneRowMap.set(key, list);
    }

    results.push({
      row: rowNumber,
      data:
        errors.length === 0
          ? {
              name_en: nameEn,
              name_ar: nameAr,
              phone: phoneRaw,
              country: country!.name_en,
              assigned_employee_id: employeeId,
              marketing_channel: marketingChannel || null,
              property_ids: propertyIds,
            }
          : undefined,
      errors: errors.length > 0 ? errors : undefined,
    });
  }

  for (const rows of phoneRowMap.values()) {
    if (rows.length <= 1) continue;
    for (const result of results) {
      if (!rows.includes(result.row)) continue;
      const otherRows = rows.filter((r) => r !== result.row);
      const message = t(
        "Duplicate phone number also appears in row(s) {{rows}}",
        { rows: otherRows.join(", ") },
      );
      result.errors = result.errors ? [...result.errors, message] : [message];
      result.data = undefined;
    }
  }

  return results;
}
