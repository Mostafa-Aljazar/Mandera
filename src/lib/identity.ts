/** Pure helpers for identity-field locking and owner PII masking (not server actions). */

/**
 * PDF locks first_name / middle_name / last_name / full_name / phone_number / country_code.
 * This schema stores bilingual full names (+ legacy `name`) — there are no separate
 * first/middle/last columns on clients/owners — so the locked set is the mapped equivalent.
 */
export const CLIENT_IDENTITY_FIELDS = [
  "name",
  "name_en",
  "name_ar",
  "phone",
  "country_code",
] as const;

export const OWNER_IDENTITY_FIELDS = [
  "name",
  "name_en",
  "name_ar",
  "phone",
  "country",
] as const;

/**
 * Always strip identity fields from normal update payloads.
 * Master Admin exceptional corrections go through `correctIdentityField` (audited) only —
 * never through the regular client/owner update actions.
 */
export function stripIdentityFields<T extends Record<string, unknown>>(
  patch: T,
  fields: readonly string[],
): T {
  const next = { ...patch };
  for (const field of fields) {
    delete next[field];
  }
  return next;
}

/** True when any identity field is present on a patch (used to reject bypass attempts). */
export function patchTouchesIdentityFields(
  patch: Record<string, unknown>,
  fields: readonly string[],
): boolean {
  return fields.some((field) =>
    Object.prototype.hasOwnProperty.call(patch, field),
  );
}

export function maskOwnerName(name: string | null | undefined): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "*****";
  // PDF: first 3–4 letters of the first word (e.g. Ahmed → Ahme*****).
  const firstWord = trimmed.split(/\s+/)[0] || trimmed;
  const visible = firstWord.slice(0, 4);
  return `${visible}*****`;
}

export function maskPhone(phone: string | null | undefined): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "05********";
  // Prefer UAE-style mask from the PDF (05********) when number starts with 05/5.
  if (digits.startsWith("05") && digits.length >= 3) {
    return `05${"*".repeat(Math.max(8, digits.length - 2))}`;
  }
  if (digits.startsWith("5") && digits.length >= 2) {
    return `05${"*".repeat(Math.max(8, digits.length - 1))}`;
  }
  if (digits.length <= 2) return "********";
  return `${digits.slice(0, 2)}${"*".repeat(Math.max(8, digits.length - 2))}`;
}
