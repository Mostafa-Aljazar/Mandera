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
    return item.name_ar || item.name_en || item.name || "";
  }
  return item.name_en || item.name_ar || item.name || "";
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
  if (!record) return fallback?.trim() || "";

  const isAr = language === "ar";
  const first = isAr
    ? record.first_name_ar || record.first_name_en || record.first_name
    : record.first_name_en || record.first_name_ar || record.first_name;
  const last = isAr
    ? record.last_name_ar || record.last_name_en || record.last_name
    : record.last_name_en || record.last_name_ar || record.last_name;

  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || fallback?.trim() || "";
}
