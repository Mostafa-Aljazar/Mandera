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
import type { ClientImportRow, ParsedImportRow } from "@/lib/importExport/types";

const FIRST_DATA_ROW = 4;

export interface ParseClientImportOptions {
  employees: ImportEmployeeOption[];
  language: string;
  t: TFunction;
  /** Phone numbers (as stored in the DB) that already belong to an existing client. */
  existingPhones: Set<string>;
}

export function parseClientImportWorkbook(
  workbook: ExcelJS.Workbook,
  { employees, language, t, existingPhones }: ParseClientImportOptions,
): ParsedImportRow<ClientImportRow>[] {
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const employeeNameIndex = buildEmployeeNameIndex(employees);
  const employeeCodeIndex = buildEmployeeCodeIndex(employees);
  const results: ParsedImportRow<ClientImportRow>[] = [];
  const phoneRowMap = new Map<string, number[]>();

  const lastRow = Math.max(sheet.actualRowCount, sheet.rowCount);
  for (let rowNumber = FIRST_DATA_ROW; rowNumber <= lastRow; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const nameEn = cellText(row.getCell(1)).trim();
    const nameAr = cellText(row.getCell(2)).trim();
    const phoneRaw = cellText(row.getCell(3)).trim();
    const countryRaw = cellText(row.getCell(4)).trim();
    const interestRaw = cellText(row.getCell(5)).trim();
    const employeeRaw = cellText(row.getCell(6)).trim();
    const marketingChannel = cellText(row.getCell(7)).trim();

    const isBlank = ![
      nameEn,
      nameAr,
      phoneRaw,
      countryRaw,
      interestRaw,
      employeeRaw,
      marketingChannel,
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

    const interestLower = interestRaw.toLowerCase();
    const interestType =
      interestLower === "sale" ? "Sale" : interestLower === "rent" ? "Rent" : null;
    if (!interestRaw) errors.push(t("Interest type is required"));
    else if (!interestType) errors.push(t("Interest type must be Sale or Rent"));

    let employeeId: string | null = null;
    if (!employeeRaw) {
      errors.push(t("Assigned employee is required"));
    } else {
      const resolution = resolveEmployeeCell(employeeRaw, employeeCodeIndex, employeeNameIndex);
      if (resolution.error === "unknown") {
        errors.push(t("Unknown employee name — check spelling or use the dropdown"));
      } else if (resolution.error === "ambiguous") {
        errors.push(t("Multiple employees share this name — please contact support"));
      } else {
        employeeId = resolution.employeeId;
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
              country_code: country!.name_en,
              interest_type: interestType!,
              employee_id: employeeId!,
              marketing_channel: marketingChannel || null,
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
