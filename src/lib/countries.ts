import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import arLocale from "i18n-iso-countries/langs/ar.json";

countries.registerLocale(enLocale);
countries.registerLocale(arLocale);

export type CountryOption = {
  /** ISO 3166-1 alpha-2 */
  code: string;
  /** English official name — also the value stored in the database */
  name_en: string;
  name_ar: string;
};

/** Legacy / short labels already present in CRM data. */
const LEGACY_ALIASES: Record<string, string> = {
  uae: "AE",
  ae: "AE",
  ksa: "SA",
  sa: "SA",
  uk: "GB",
  gb: "GB",
  britain: "GB",
  usa: "US",
  us: "US",
  america: "US",
  other: "XX",
};

const PRIORITY_CODES = ["AE", "SA", "QA", "OM", "BH", "KW", "EG", "JO", "LB"];

function buildCountries(): CountryOption[] {
  const enNames = countries.getNames("en", { select: "official" });
  const arNames = countries.getNames("ar", { select: "official" });

  const list: CountryOption[] = Object.keys(enNames).map((code) => ({
    code,
    name_en: enNames[code],
    name_ar: arNames[code] || enNames[code],
  }));

  // Keep "Other" for free-text / unspecified cases already used in the app.
  list.push({
    code: "XX",
    name_en: "Other",
    name_ar: "أخرى",
  });

  list.sort((a, b) => {
    const ai = PRIORITY_CODES.indexOf(a.code);
    const bi = PRIORITY_CODES.indexOf(b.code);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    if (a.code === "XX") return 1;
    if (b.code === "XX") return -1;
    return a.name_en.localeCompare(b.name_en, "en");
  });

  return list;
}

export const COUNTRIES: CountryOption[] = buildCountries();

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));
const byEn = new Map(
  COUNTRIES.map((c) => [c.name_en.toLowerCase(), c] as const),
);
const byAr = new Map(COUNTRIES.map((c) => [c.name_ar, c]));

export function countryLabel(
  country: CountryOption | string | null | undefined,
  language: string,
): string {
  if (!country) return "";
  if (typeof country === "string") {
    const found = findCountry(country);
    if (!found) return country;
    return language === "ar" ? found.name_ar : found.name_en;
  }
  return language === "ar" ? country.name_ar : country.name_en;
}

export function findCountry(
  value: string | null | undefined,
): CountryOption | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const upper = trimmed.toUpperCase();
  if (byCode.has(upper)) return byCode.get(upper);

  const legacyCode = LEGACY_ALIASES[trimmed.toLowerCase()];
  if (legacyCode && byCode.has(legacyCode)) return byCode.get(legacyCode);

  const fromEn = byEn.get(trimmed.toLowerCase());
  if (fromEn) return fromEn;

  const fromAr = byAr.get(trimmed);
  if (fromAr) return fromAr;

  // Library reverse lookup for English / Arabic official names.
  const alpha2 =
    countries.getAlpha2Code(trimmed, "en") ||
    countries.getAlpha2Code(trimmed, "ar");
  if (alpha2 && byCode.has(alpha2)) return byCode.get(alpha2);

  return undefined;
}

/** Normalize any stored/legacy value to the canonical English name. */
export function normalizeCountryValue(value: string | null | undefined): string {
  if (!value) return "";
  const found = findCountry(value);
  return found?.name_en || value.trim();
}
