import type ExcelJS from "exceljs";

/** Minimal employee shape needed for the "Assigned Employee" dropdown/lookup. */
export interface ImportEmployeeOption {
  id: string;
  name?: string | null;
  first_name_en?: string | null;
  first_name_ar?: string | null;
  last_name_en?: string | null;
  last_name_ar?: string | null;
}

export const EXAMPLE_ROW_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF3F4F6" },
};

export const HEADER_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F2937" },
};

export const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
};

export const EXAMPLE_FONT: Partial<ExcelJS.Font> = {
  italic: true,
  color: { argb: "FF6B7280" },
};

/** Subtle tint marking a cell as a select/dropdown field, for visual polish. */
export const DROPDOWN_CELL_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEAF2FE" },
};

export const DROPDOWN_CELL_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFCBDDFB" } },
  left: { style: "thin", color: { argb: "FFCBDDFB" } },
  bottom: { style: "thin", color: { argb: "FFCBDDFB" } },
  right: { style: "thin", color: { argb: "FFCBDDFB" } },
};

/** Rows made available for the user to fill in below the header + example rows. */
export const TEMPLATE_DATA_ROW_COUNT = 500;

export async function writeWorkbookAndDownload(
  workbook: ExcelJS.Workbook,
  filename: string,
): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Builds a plain header + data-rows workbook — used for configurable exports. */
export async function buildSimpleExportWorkbook(
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
  rtl: boolean,
): Promise<ExcelJS.Workbook> {
  const { default: ExcelJSLib } = await import("exceljs");
  const workbook = new ExcelJSLib.Workbook();
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 1, rightToLeft: rtl }],
  });

  sheet.addRow(headers);
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  headerRow.height = 22;

  rows.forEach((row) => sheet.addRow(row));

  sheet.columns.forEach((column) => {
    column.width = 24;
  });

  return workbook;
}

export async function readWorkbookFromFile(
  file: File,
): Promise<ExcelJS.Workbook> {
  const { default: ExcelJSLib } = await import("exceljs");
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJSLib.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

/**
 * Applies a dropdown list data-validation rule to every cell in a column
 * across the given row range, with a light tint + border so the cells read
 * as obvious "select" fields rather than blending into the blank grid.
 *
 * The validation is registered once for the whole range via
 * `sheet.dataValidations.add(...)` rather than by assigning
 * `cell.dataValidation` in a per-row loop — the per-cell loop causes ExcelJS
 * to emit duplicate, overlapping `<dataValidation>` ranges in the saved
 * file's XML (e.g. both "D10:D503" and "D4:D503" for the same column).
 * ExcelJS itself re-reads that malformed XML without complaint, but real
 * Excel treats it as corrupt content, silently drops the validations during
 * its "repair" step on open, and the dropdown never appears.
 */
/** `Worksheet.dataValidations` is a real ExcelJS API but missing from its type defs. */
interface WorksheetWithDataValidations extends ExcelJS.Worksheet {
  dataValidations: {
    add(address: string, validation: ExcelJS.DataValidation): void;
  };
}

export function addListValidation(
  sheet: ExcelJS.Worksheet,
  columnLetter: string,
  firstRow: number,
  lastRow: number,
  formula: string,
): void {
  (sheet as WorksheetWithDataValidations).dataValidations.add(
    `${columnLetter}${firstRow}:${columnLetter}${lastRow}`,
    {
      type: "list",
      allowBlank: true,
      formulae: [formula],
      showErrorMessage: true,
      errorStyle: "warning",
      error: "Please pick a value from the dropdown list.",
    },
  );
  for (let row = firstRow; row <= lastRow; row++) {
    const cell = sheet.getCell(`${columnLetter}${row}`);
    cell.fill = DROPDOWN_CELL_FILL;
    cell.border = DROPDOWN_CELL_BORDER;
  }
}

/** Cell text, coerced defensively — Excel may store numbers/rich-text/formula results. */
export function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    // Rich text or formula-result object — fall back to the rendered text.
    if ("text" in value && typeof (value as { text?: unknown }).text === "string") {
      return (value as { text: string }).text;
    }
    if ("result" in value) {
      return String((value as { result?: unknown }).result ?? "");
    }
    return String(cell.text ?? "");
  }
  return String(value);
}

export function employeeSourceName(
  emp: ImportEmployeeOption,
  language: string,
): string {
  const isAr = language === "ar";
  const first = isAr
    ? emp.first_name_ar || emp.first_name_en
    : emp.first_name_en || emp.first_name_ar;
  const last = isAr
    ? emp.last_name_ar || emp.last_name_en
    : emp.last_name_en || emp.last_name_ar;
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || emp.name?.trim() || "";
}

/**
 * Case-insensitive, trimmed lookup map from employee display name -> matching
 * profile ids. Registers BOTH the English and Arabic display name for every
 * employee (not just whichever language the app happens to be in right now)
 * — a file downloaded in one language must still import correctly if the app
 * is switched to the other language before uploading, or if the file is
 * shared with someone using a different UI language. More than one id under
 * a key means the name is ambiguous.
 */
export function buildEmployeeNameIndex(
  employees: ImportEmployeeOption[],
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  const register = (name: string, id: string) => {
    const key = name.trim().toLowerCase();
    if (!key) return;
    const existing = index.get(key);
    if (existing) {
      if (!existing.includes(id)) existing.push(id);
    } else {
      index.set(key, [id]);
    }
  };
  for (const emp of employees) {
    register(employeeSourceName(emp, "en"), emp.id);
    register(employeeSourceName(emp, "ar"), emp.id);
  }
  return index;
}

/**
 * Short, stable, human-typeable code derived from the employee's profile id —
 * no schema change needed. Used so import matching doesn't depend on exact
 * name strings (which break on renames/typos/duplicate names).
 */
export function employeeShortCode(id: string): string {
  return id.replace(/-/g, "").slice(-6).toUpperCase();
}

const EMPLOYEE_CODE_PATTERN = /\(([0-9A-Fa-f]{6})\)\s*$/;

/** Extracts the trailing "(CODE)" from a dropdown-selected cell value, if present. */
export function extractEmployeeCode(cellValue: string): string | null {
  const match = cellValue.match(EMPLOYEE_CODE_PATTERN);
  return match ? match[1].toUpperCase() : null;
}

/** Code -> employee id. Codes are unique by construction (no ambiguity possible). */
export function buildEmployeeCodeIndex(
  employees: ImportEmployeeOption[],
): Map<string, string> {
  const index = new Map<string, string>();
  for (const emp of employees) {
    index.set(employeeShortCode(emp.id), emp.id);
  }
  return index;
}

export type EmployeeResolutionError = "unknown" | "ambiguous" | null;

export interface EmployeeResolution {
  employeeId: string | null;
  error: EmployeeResolutionError;
}

/**
 * Resolves a filled-in "Assigned Employee" cell to a profile id. Tries the
 * robust code path first (the "(CODE)" suffix the dropdown produces); falls
 * back to exact-name matching for cells a user typed by hand.
 */
export function resolveEmployeeCell(
  cellValue: string,
  codeIndex: Map<string, string>,
  nameIndex: Map<string, string[]>,
): EmployeeResolution {
  const code = extractEmployeeCode(cellValue);
  if (code) {
    const id = codeIndex.get(code);
    return id ? { employeeId: id, error: null } : { employeeId: null, error: "unknown" };
  }

  const matches = nameIndex.get(cellValue.trim().toLowerCase());
  if (!matches || matches.length === 0) return { employeeId: null, error: "unknown" };
  if (matches.length > 1) return { employeeId: null, error: "ambiguous" };
  return { employeeId: matches[0], error: null };
}
