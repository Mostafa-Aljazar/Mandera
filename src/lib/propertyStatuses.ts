import {
  FINAL_PROPERTY_STATUSES,
  OPERATIONAL_PROPERTY_STATUSES,
  PROPERTY_STATUS_OPTIONS,
  isFinalPropertyStatus,
} from "@/lib/permissions";

export type CompanyPropertyStatus = {
  key: string;
  name_en: string;
  name_ar: string;
  enabled: boolean;
  is_final: boolean;
};

const FINAL_KEYS = new Set<string>([
  ...FINAL_PROPERTY_STATUSES,
  "Deal Completed",
]);

const OPERATIONAL_KEYS = new Set<string>([...OPERATIONAL_PROPERTY_STATUSES]);

/** Sensible Arabic defaults so EN/AR fields are not identical out of the box. */
const DEFAULT_AR_LABELS: Record<string, string> = {
  Available: "متاح",
  "Viewing Scheduled": "معاينة مجدولة",
  "Under Offer": "قيد العرض",
  Reserved: "محجوز",
  "Follow-up Required": "يحتاج متابعة",
  Sold: "مباع",
  Rented: "مؤجَّر",
  Unavailable: "غير متاح",
  Archived: "مؤرشف",
  Cancelled: "ملغى",
  "Deal Completed": "صفقة مكتملة",
  Hold: "معلّق",
};

function defaultArabicName(key: string): string {
  return DEFAULT_AR_LABELS[key] ?? key;
}

function resolveArabicName(
  key: string,
  nameEn: string,
  nameAr: string | undefined,
): string {
  const ar = nameAr?.trim() ?? "";
  // Treat missing / copied-English values as unset so defaults appear.
  if (!ar || ar === key || ar === nameEn.trim()) {
    return defaultArabicName(key);
  }
  return ar;
}

function defaultRows(): CompanyPropertyStatus[] {
  return PROPERTY_STATUS_OPTIONS.map((key) => ({
    key,
    name_en: key,
    name_ar: defaultArabicName(key),
    enabled: true,
    is_final: FINAL_KEYS.has(key),
  }));
}

/**
 * Merge company publish_settings.property_statuses with the canonical key set.
 * Missing/invalid saved config falls back to all statuses enabled.
 */
export function resolveCompanyPropertyStatuses(
  publishSettings: Record<string, unknown> | null | undefined,
): CompanyPropertyStatus[] {
  const saved = publishSettings?.property_statuses;
  if (!Array.isArray(saved) || saved.length === 0) {
    return defaultRows();
  }

  const byKey = new Map<string, CompanyPropertyStatus>();
  for (const item of saved) {
    if (!item || typeof item !== "object" || !("key" in item)) continue;
    const row = item as Partial<CompanyPropertyStatus>;
    const key = String(row.key ?? "");
    if (!key) continue;
    byKey.set(key, {
      key,
      name_en: String(row.name_en ?? key),
      name_ar: resolveArabicName(
        key,
        String(row.name_en ?? key),
        row.name_ar != null ? String(row.name_ar) : undefined,
      ),
      enabled: row.enabled !== false,
      is_final:
        typeof row.is_final === "boolean"
          ? row.is_final
          : FINAL_KEYS.has(key) || isFinalPropertyStatus(key),
    });
  }

  return PROPERTY_STATUS_OPTIONS.map((key) => {
    const existing = byKey.get(key);
    return (
      existing ?? {
        key,
        name_en: key,
        name_ar: defaultArabicName(key),
        enabled: true,
        is_final: FINAL_KEYS.has(key),
      }
    );
  });
}

export function splitSelectablePropertyStatuses(
  statuses: CompanyPropertyStatus[],
  options?: { includeKey?: string | null; agentsOnly?: boolean },
): {
  operational: CompanyPropertyStatus[];
  final: CompanyPropertyStatus[];
} {
  const includeKey = options?.includeKey ?? null;
  const agentsOnly = options?.agentsOnly === true;

  const keep = (row: CompanyPropertyStatus) =>
    row.enabled || row.key === includeKey;

  const isFinalRow = (row: CompanyPropertyStatus) =>
    row.is_final || FINAL_KEYS.has(row.key) || isFinalPropertyStatus(row.key);

  const operational = statuses.filter((row) => {
    if (!keep(row)) return false;
    if (agentsOnly) return OPERATIONAL_KEYS.has(row.key) && !isFinalRow(row);
    return !isFinalRow(row);
  });

  const final = agentsOnly
    ? []
    : statuses.filter((row) => keep(row) && isFinalRow(row));

  return { operational, final };
}

export function propertyStatusLabel(
  row: CompanyPropertyStatus,
  language: string,
): string {
  if (language === "ar") {
    return row.name_ar?.trim() || row.name_en?.trim() || row.key;
  }
  return row.name_en?.trim() || row.name_ar?.trim() || row.key;
}
