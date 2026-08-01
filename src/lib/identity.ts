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

/** Canonical server/UI error when a locked identity write is attempted. */
export const IDENTITY_FIELDS_LOCKED_ERROR =
  "Identity fields (name, phone, country) are locked after create. Only Master Admin can apply an exceptional correction with a full audit log.";

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
  // PDF: first name only, then asterisks (e.g. "Ahmed *****").
  const firstWord = trimmed.split(/\s+/)[0] || trimmed;
  return `${firstWord} *****`;
}

export function maskPhone(phone: string | null | undefined): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "05********";

  // Normalize UAE internationals (+9715…) to local 05… form from the PDF.
  let local = digits;
  if (local.startsWith("971")) local = local.slice(3);
  if (local.startsWith("5") && !local.startsWith("05")) {
    local = `0${local}`;
  }

  if (local.startsWith("05") && local.length >= 3) {
    return `05${"*".repeat(8)}`;
  }
  if (local.length <= 2) return "********";
  return `${local.slice(0, 2)}${"*".repeat(Math.max(8, local.length - 2))}`;
}
