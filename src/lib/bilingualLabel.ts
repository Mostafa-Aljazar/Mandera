/** Bilingual label helper for CRM lookup rows (property types, client statuses, …). */
export type BilingualName = {
  name_en?: string | null;
  name_ar?: string | null;
  /** @deprecated legacy single-name fallback while migrations settle */
  name?: string | null;
};

export function bilingualLabel(
  item: BilingualName | null | undefined,
  language: string,
): string {
  if (!item) return "";
  if (language === "ar") {
    return titleCaseName(item.name_ar || item.name_en || item.name || "");
  }
  return titleCaseName(item.name_en || item.name_ar || item.name || "");
}

export type CompanyNameParts = {
  company_name_en?: string | null;
  company_name_ar?: string | null;
};

/** Company display name from bilingual company_name_en/company_name_ar. */
export function companyDisplayName(
  company: CompanyNameParts | null | undefined,
  language: string,
): string {
  if (!company) return "";
  return bilingualLabel(
    { name_en: company.company_name_en, name_ar: company.company_name_ar },
    language,
  );
}

export type EmployeeNameParts = {
  first_name_en?: string | null;
  first_name_ar?: string | null;
  last_name_en?: string | null;
  last_name_ar?: string | null;
  /** @deprecated legacy single-locale columns */
  first_name?: string | null;
  last_name?: string | null;
};

/** Full employee display name from bilingual first/last parts. */
export function employeeDisplayName(
  record: EmployeeNameParts | null | undefined,
  language: string,
  fallback?: string | null,
): string {
  if (!record) return titleCaseName(fallback?.trim() || "");

  const isAr = language === "ar";
  const first = isAr
    ? record.first_name_ar || record.first_name_en || record.first_name
    : record.first_name_en || record.first_name_ar || record.first_name;
  const last = isAr
    ? record.last_name_ar || record.last_name_en || record.last_name
    : record.last_name_en || record.last_name_ar || record.last_name;

  const full = [first, last].filter(Boolean).join(" ").trim();
  return titleCaseName(full || fallback?.trim() || "");
}

/** Capitalize the first character of each word (safe for Arabic — no case change). */
export function titleCaseName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toLocaleUpperCase() + part.slice(1).toLocaleLowerCase(),
    )
    .join(" ");
}
