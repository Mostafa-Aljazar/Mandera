import type { TFunction } from "i18next";

/**
 * Map raw action/Supabase errors to user-facing i18n strings.
 * Prefer exact known messages; fall back to pattern matches, then a safe default.
 */
export function actionErrorMessage(
  error: unknown,
  t: TFunction,
  fallbackKey = "Something went wrong",
): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (!raw.trim()) return t(fallbackKey);

  if (/row-level security/i.test(raw) || /permission denied/i.test(raw)) {
    return t("You don't have permission to perform this action.");
  }

  if (/JWT expired|Invalid JWT|not authenticated/i.test(raw)) {
    return t("Your session has expired. Please sign in again.");
  }

  // Exact keys already in locale files (login errors, identity lock, validation, etc.).
  // Use a sentinel defaultValue so EN keys (where translation === key) still match.
  const MISSING = "__i18n_missing__";
  const translated = t(raw, { defaultValue: MISSING });
  if (translated !== MISSING) return translated;

  return t(fallbackKey);
}
