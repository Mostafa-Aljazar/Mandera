import type ExcelJS from "exceljs";
import { COUNTRIES } from "@/lib/countries";
import {
  EXAMPLE_ROW_FILL,
  EXAMPLE_FONT,
  HEADER_FILL,
  HEADER_FONT,
  TEMPLATE_DATA_ROW_COUNT,
  addListValidation,
  employeeSourceName,
  type ImportEmployeeOption,
} from "@/lib/importExport/shared";
import type { PropertyCodeOption } from "@/actions/properties";

export interface BuildOwnerTemplateOptions {
  employees: ImportEmployeeOption[];
  propertyCodes: PropertyCodeOption[];
  marketingChannels: string[];
  language: string;
}

const HEADER_ROW = 1;
const EXAMPLE_ROWS = 2;
const FIRST_DATA_ROW = HEADER_ROW + EXAMPLE_ROWS + 1; // 4
const LAST_DATA_ROW = FIRST_DATA_ROW + TEMPLATE_DATA_ROW_COUNT - 1;

export async function buildOwnerImportTemplate({
  employees,
  propertyCodes,
  marketingChannels,
  language,
}: BuildOwnerTemplateOptions): Promise<ExcelJS.Workbook> {
  const { default: ExcelJSLib } = await import("exceljs");
  const workbook = new ExcelJSLib.Workbook();
  const isAr = language === "ar";

  const sampleCode = propertyCodes[0]?.code || "COMP002-S-0002";

  const sheet = workbook.addWorksheet("Owners", {
    views: [{ state: "frozen", ySplit: HEADER_ROW }],
  });

  const columns: { header: string; key: string; width: number }[] = [
    { header: isAr ? "الاسم الكامل (EN) *" : "Full Name (EN) *", key: "name_en", width: 24 },
    { header: isAr ? "الاسم الكامل (AR) *" : "Full Name (AR) *", key: "name_ar", width: 24 },
    { header: isAr ? "رقم الهاتف *" : "Phone *", key: "phone", width: 18 },
    { header: isAr ? "الدولة *" : "Country *", key: "country", width: 22 },
    { header: isAr ? "الموظف المسؤول" : "Assigned Employee", key: "employee", width: 26 },
    { header: isAr ? "قناة التسويق" : "Marketing Channel", key: "marketing_channel", width: 22 },
    {
      header: isAr ? "أكواد العقارات المرتبطة" : "Linked Property Code(s)",
      key: "property_codes",
      width: 28,
    },
  ];
  sheet.columns = columns;

  const headerRow = sheet.getRow(HEADER_ROW);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  headerRow.height = 22;

  const exampleEmployeeName = employees[0] ? employeeSourceName(employees[0], language) : "";

  const exampleRows: Record<string, string>[] = [
    {
      name_en: "EXAMPLE — delete this row",
      name_ar: "مثال — احذف هذا الصف",
      phone: "+971501234567",
      country: isAr ? "الإمارات العربية المتحدة" : "United Arab Emirates",
      employee: exampleEmployeeName,
      marketing_channel: "",
      property_codes: sampleCode,
    },
    {
      name_en: "EXAMPLE — delete this row",
      name_ar: "مثال — احذف هذا الصف",
      phone: "+971509876543",
      country: isAr ? "المملكة العربية السعودية" : "Saudi Arabia",
      employee: "",
      marketing_channel: "",
      property_codes: "",
    },
  ];

  exampleRows.forEach((row, index) => {
    const excelRow = sheet.getRow(HEADER_ROW + 1 + index);
    excelRow.values = [
      row.name_en,
      row.name_ar,
      row.phone,
      row.country,
      row.employee,
      row.marketing_channel,
      row.property_codes,
    ];
    excelRow.eachCell((cell) => {
      cell.fill = EXAMPLE_ROW_FILL;
      cell.font = EXAMPLE_FONT;
    });
  });

  sheet.getColumn("phone").numFmt = "@";
  for (let row = FIRST_DATA_ROW; row <= LAST_DATA_ROW; row++) {
    sheet.getCell(`C${row}`).numFmt = "@";
  }

  // Plain hidden sheet (not "veryHidden") for the widest compatibility with
  // data-validation formulas that reference another sheet.
  const listSheet = workbook.addWorksheet("_lists", { state: "hidden" });

  const employeeNames = Array.from(
    new Set(
      employees
        .map((emp) => employeeSourceName(emp, language))
        .filter((name) => name.length > 0),
    ),
  );
  employeeNames.forEach((name, index) => {
    listSheet.getCell(`A${index + 1}`).value = name;
  });

  const countryNames = COUNTRIES.map((c) => (isAr ? c.name_ar : c.name_en));
  countryNames.forEach((name, index) => {
    listSheet.getCell(`B${index + 1}`).value = name;
  });

  const channelNames = Array.from(
    new Set(marketingChannels.map((c) => c.trim()).filter((c) => c.length > 0)),
  );
  channelNames.forEach((name, index) => {
    listSheet.getCell(`C${index + 1}`).value = name;
  });

  const codeList = Array.from(
    new Set(propertyCodes.map((p) => p.code.trim()).filter((c) => c.length > 0)),
  );
  codeList.forEach((code, index) => {
    listSheet.getCell(`D${index + 1}`).value = code;
  });

  if (employeeNames.length > 0) {
    addListValidation(
      sheet,
      "E",
      FIRST_DATA_ROW,
      LAST_DATA_ROW,
      `_lists!$A$1:$A$${employeeNames.length}`,
    );
  }
  addListValidation(
    sheet,
    "D",
    FIRST_DATA_ROW,
    LAST_DATA_ROW,
    `_lists!$B$1:$B$${countryNames.length}`,
  );
  if (channelNames.length > 0) {
    addListValidation(
      sheet,
      "F",
      FIRST_DATA_ROW,
      LAST_DATA_ROW,
      `_lists!$C$1:$C$${channelNames.length}`,
    );
  }
  // Excel cells can only hold one dropdown pick at a time — this dropdown
  // helps pick the first/only code correctly; for more than one, the user
  // types additional codes after it separated by commas (the "warning"
  // validation style below allows that free typing, it doesn't hard-block).
  if (codeList.length > 0) {
    addListValidation(
      sheet,
      "G",
      FIRST_DATA_ROW,
      LAST_DATA_ROW,
      `_lists!$D$1:$D$${codeList.length}`,
    );
  }

  return workbook;
}
