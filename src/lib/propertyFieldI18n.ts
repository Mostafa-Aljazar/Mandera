import type { TFunction, i18n } from "i18next";
import { resolveNotificationBilingual } from "@/lib/notificationCopy";

/** DB column → existing UI label translation key. */
const PROPERTY_FIELD_LABEL_KEYS: Record<string, string> = {
  title: "Title (EN)",
  title_ar: "Title (AR)",
  description: "Description (EN)",
  description_ar: "Description (AR)",
  type: "Property Type",
  listing_type: "Listing Type",
  price: "Price",
  rent_frequency: "Rent Frequency",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  furnishing: "Furnishing",
  building_area: "Building Area",
  plot_area: "Plot Area",
  land_area: "Land Area",
  parking_slots: "Parking slots",
  amenities: "Amenities",
  emirate: "Emirate",
  city: "City",
  locality: "Locality",
  sub_locality: "Sub-locality",
  tower_name: "Tower / Building",
  address: "Address",
  area: "Area",
  area_district: "Area / District",
  owner_id: "Owner",
  employee_id: "Assigned Agent",
  permit_type: "Permit Type",
  advertising_permit_number: "Advertising Permit Number",
  issuing_license_number: "Issuing License Number",
  project_status: "Project Status",
  status: "Status",
  note: "Note",
  note_en: "Note (EN)",
  note_ar: "Note (AR)",
  available_from: "Available from",
  pf_location_id: "PropertyFinder location",
  offplan_sale_type: "Off-plan sale type",
  offplan_dld_waiver: "DLD waiver",
  offplan_original_price: "Original price",
  offplan_amount_paid: "Amount paid",
};

function translateKnown(value: string, t: TFunction, i18nInstance: i18n): string {
  if (!value) return value;
  if (i18nInstance.exists(value)) return t(value);
  const lower = value.toLowerCase();
  if (lower !== value && i18nInstance.exists(lower)) return t(lower);
  return value;
}

export function propertyFieldLabel(
  field: string,
  t: TFunction,
  i18nInstance: i18n,
): string {
  const key = PROPERTY_FIELD_LABEL_KEYS[field];
  if (key) return translateKnown(key, t, i18nInstance);
  return field.replace(/_/g, " ");
}

export function formatPropertyDiffValue(
  value: unknown,
  t: TFunction,
  i18nInstance: i18n,
): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? t("Yes") : t("No");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  const str = String(value);
  // Keep UUIDs / codes as-is
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str;
  }
  return translateKnown(str, t, i18nInstance);
}

/** Translate known English notification titles stored in the DB. */
export function translateNotificationTitle(
  title: string,
  t: TFunction,
  i18nInstance: i18n,
): string {
  return translateKnown(title, t, i18nInstance);
}

/**
 * Translate common English prefixes/labels in stored notification bodies.
 * Existing rows were written in English; this keeps them readable in AR without a migration.
 * Bilingual [[en|||ar]] tokens (names / property titles) are resolved by UI language.
 */
export function translateNotificationBody(
  body: string,
  t: TFunction,
  i18nInstance: i18n,
): string {
  if (!body) return body;

  let next = resolveNotificationBilingual(body, i18nInstance.language || "en");

  const approvalStatusValue = (raw: string): string => {
    const value = raw.trim();
    const known: Record<string, string> = {
      draft: t("Draft"),
      pending_review: t("Pending Review"),
      approved: t("Approved"),
      rejected: t("Rejected"),
      Draft: t("Draft"),
    };
    return known[value] ?? translateKnown(value, t, i18nInstance);
  };

  next = next
    .replace(/^Property:/gm, `${t("Property")}:`)
    .replace(/^Agent:/gm, t("Agent:"))
    .replace(/^Title:/gm, `${t("Title")}:`)
    .replace(/^Status:/gm, `${t("Status")}:`)
    .replace(/^Fields:/gm, `${t("Fields")}:`)
    .replace(/^Date:/gm, `${t("Date")}:`)
    .replace(/^Note:/gm, `${t("Note")}:`)
    .replace(/^Reason:/gm, `${t("Reason")}:`)
    .replace(/^Previous Status:/gm, `${t("Previous Status")}:`)
    .replace(/^New Status:/gm, `${t("New Status")}:`)
    .replace(/^Images added:/gm, `${t("Images added")}:`)
    .replace(/^Images removed:/gm, `${t("Images removed")}:`)
    .replace(/^Last updated:/gm, t("Last updated:"))
    .replace(
      /^Unreviewed for (\d+)\+ days/gm,
      (_m, days: string) =>
        t("Unreviewed for {{count}}+ days", { count: Number(days) }),
    );

  // Translate approval-status / property-status values on status lines
  next = next.replace(
    new RegExp(
      `(${t("Status")}|Status|${t("Previous Status")}|Previous Status|${t("New Status")}|New Status):\\s*(.+)`,
      "g",
    ),
    (_match, label: string, value: string) =>
      `${label}: ${approvalStatusValue(value)}`,
  );

  // Translate comma-separated field keys on the Fields line
  next = next.replace(
    new RegExp(`(${t("Fields")}|Fields):\\s*(.+)`, "g"),
    (_match, label: string, fieldsCsv: string) => {
      const sep = i18nInstance.language?.startsWith("ar") ? "، " : ", ";
      const translated = fieldsCsv
        .split(",")
        .map((f) => propertyFieldLabel(f.trim(), t, i18nInstance))
        .join(sep);
      return `${label}: ${translated}`;
    },
  );

  return next;
}
