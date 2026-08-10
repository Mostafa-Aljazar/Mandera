// Portal errors reach us as raw English strings — either PropertyFinder's API
// error envelope or the rejection reason it stores on a listing. They are shown
// to agents who may be working in Arabic, so map the ones we've actually seen
// onto i18n keys and let the UI translate them.
//
// PF does return a `reasons[].ar`, but in practice it repeats the English text
// verbatim, so it can't be used as the Arabic copy.
//
// Anything unrecognised returns null — the caller then shows PF's raw English
// text rather than swallowing a message we don't have a translation for. A new
// error surfacing in English is a far better failure mode than a generic
// "something went wrong".

export interface PortalErrorMessage {
  /** i18n key, matching an entry in en.json/ar.json. */
  key: string;
  /** Interpolation values for the key's {{placeholders}}. */
  values?: Record<string, string>;
}

const PATTERNS: Array<{
  test: RegExp;
  key: string;
  values?: (m: RegExpMatchArray) => Record<string, string>;
}> = [
  // --- Compliance / permits (by far the most common in Abu Dhabi + Dubai) ---
  {
    test: /parent permit\s+for selected permit\s+(\S+)\s+is invalid/i,
    key: "portal_error.parent_permit_invalid",
    values: (m) => ({ permit: m[1] }),
  },
  {
    test: /permit\s+(\S+)\s+is at maximum capacity\s*\(([^)]*)\)/i,
    key: "portal_error.permit_at_capacity",
    values: (m) => ({ permit: m[1], capacity: m[2] }),
  },
  {
    test: /agent DARI invalid or not found/i,
    key: "portal_error.agent_dari_invalid",
  },

  // --- Listing lifecycle ---
  {
    test: /catalog is not live/i,
    key: "portal_error.listing_not_live",
  },
  {
    test: /A Catalog with this reference already exists/i,
    key: "portal_error.reference_in_use",
  },
  {
    test: /^\s*unpublished\s*$/i,
    key: "portal_error.listing_unpublished",
  },

  // --- Account / configuration ---
  {
    test: /assigned_to client does not match authenticated user/i,
    key: "portal_error.assigned_to_mismatch",
  },
  {
    test: /credentials not configured|is not configured/i,
    key: "portal_error.not_configured",
  },
  {
    test: /row-level security policy/i,
    key: "portal_error.permission_denied",
  },

  // --- Field-level validation (pointer: reason) ---
  {
    test: /([\w/[\]]+):\s*This field is required/i,
    key: "portal_error.field_required",
    values: (m) => ({ field: m[1] }),
  },
  {
    test: /([\w/[\]]+):\s*value must be one of\s*(.+)$/i,
    key: "portal_error.field_invalid_value",
    values: (m) => ({ field: m[1], allowed: m[2].trim() }),
  },
];

/**
 * Map a raw portal error onto an i18n key, or null when we have no translation
 * for it (caller falls back to the raw English text).
 */
export function portalErrorI18n(raw: string | null | undefined): PortalErrorMessage | null {
  if (!raw) return null;
  for (const pattern of PATTERNS) {
    const match = raw.match(pattern.test);
    if (match) {
      return { key: pattern.key, values: pattern.values?.(match) };
    }
  }
  return null;
}
