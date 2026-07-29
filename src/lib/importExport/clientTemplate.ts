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

export interface BuildClientTemplateOptions {
  employees: ImportEmployeeOption[];
  marketingChannels: string[];
  language: string;
}

const HEADER_ROW = 1;
const EXAMPLE_ROWS = 2;
const FIRST_DATA_ROW = HEADER_ROW + EXAMPLE_ROWS + 1; // 4
const LAST_DATA_ROW = FIRST_DATA_ROW + TEMPLATE_DATA_ROW_COUNT - 1;

export async function buildClientImportTemplate({
  employees,
  marketingChannels,
  language,
}: BuildClientTemplateOptions): Promise<ExcelJS.Workbook> {
  const { default: ExcelJSLib } = await import("exceljs");
  const workbook = new ExcelJSLib.Workbook();
  const isAr = language === "ar";

  const sheet = workbook.addWorksheet("Clients", {
    views: [{ state: "frozen", ySplit: HEADER_ROW }],
  });

  const columns: { header: string; key: string; width: number }[] = [
    { header: isAr ? "الاسم الكامل (EN) *" : "Full Name (EN) *", key: "name_en", width: 24 },
    { header: isAr ? "الاسم الكامل (AR) *" : "Full Name (AR) *", key: "name_ar", width: 24 },
    { header: isAr ? "رقم الهاتف *" : "Phone *", key: "phone", width: 18 },
    { header: isAr ? "الدولة *" : "Country *", key: "country", width: 22 },
    { header: isAr ? "نوع الاهتمام (Sale/Rent) *" : "Interest Type (Sale/Rent) *", key: "interest_type", width: 22 },
    { header: isAr ? "الموظف المسؤول *" : "Assigned Employee *", key: "employee", width: 26 },
    { header: isAr ? "قناة التسويق" : "Marketing Channel", key: "marketing_channel", width: 22 },
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
      interest_type: "Sale",
      employee: exampleEmployeeName,
      marketing_channel: "",
    },
    {
      name_en: "EXAMPLE — delete this row",
      name_ar: "مثال — احذف هذا الصف",
      phone: "+971509876543",
      country: isAr ? "المملكة العربية السعودية" : "Saudi Arabia",
      interest_type: "Rent",
      employee: exampleEmployeeName,
      marketing_channel: "",
    },
  ];

  exampleRows.forEach((row, index) => {
    const excelRow = sheet.getRow(HEADER_ROW + 1 + index);
    excelRow.values = [
      row.name_en,
      row.name_ar,
      row.phone,
      row.country,
      row.interest_type,
      row.employee,
      row.marketing_channel,
    ];
    excelRow.eachCell((cell) => {
      cell.fill = EXAMPLE_ROW_FILL;
      cell.font = EXAMPLE_FONT;
    });
  });

  // Phone column stored as text so Excel doesn't strip a leading "+".
  sheet.getColumn("phone").numFmt = "@";
  for (let row = FIRST_DATA_ROW; row <= LAST_DATA_ROW; row++) {
    sheet.getCell(`C${row}`).numFmt = "@";
  }

  // Helper sheet backing the dropdown lists — a plain hidden sheet (not
  // "veryHidden") for the widest compatibility with data-validation formulas
  // that reference another sheet across Excel/LibreOffice/Google Sheets.
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

  if (employeeNames.length > 0) {
    addListValidation(
      sheet,
      "F",
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
  addListValidation(sheet, "E", FIRST_DATA_ROW, LAST_DATA_ROW, '"Sale,Rent"');
  if (channelNames.length > 0) {
    addListValidation(
      sheet,
      "G",
      FIRST_DATA_ROW,
      LAST_DATA_ROW,
      `_lists!$C$1:$C$${channelNames.length}`,
    );
  }

  return workbook;
}
