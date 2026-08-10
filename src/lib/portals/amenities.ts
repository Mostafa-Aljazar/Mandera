// PropertyFinder's fixed `amenities` enum (see docs/portals/propertyfinder-openapi.json). The form
// stores these exact slugs on `properties.amenities` so the PF mapper can pass
// them through unchanged; the Bayut feed renders them as free-form <Feature>s.

export const PF_AMENITIES = [
  "central-ac",
  "built-in-wardrobes",
  "kitchen-appliances",
  "security",
  "concierge",
  "maid-service",
  "private-gym",
  "shared-gym",
  "private-jacuzzi",
  "shared-spa",
  "covered-parking",
  "maids-room",
  "study",
  "childrens-play-area",
  "pets-allowed",
  "barbecue-area",
  "shared-pool",
  "childrens-pool",
  "private-garden",
  "private-pool",
  "view-of-water",
  "view-of-landmark",
  "walk-in-closet",
  "lobby-in-building",
  "balcony",
  "networked",
  "dining-in-building",
  "conference-room",
  "vastu-compliant",
  "electricity",
  "waters",
  "sanitation",
  "fixed-phone",
  "fibre-optics",
  "flood-drainage",
] as const;

export type PfAmenity = (typeof PF_AMENITIES)[number];

// The enum above is PF's *global* list. For the UAE they additionally restrict
// which amenities are accepted per category + property type, and a single
// disallowed value fails the whole POST /v1/listings with a 400 (e.g.
// "/amenities/3: value must be one of 'shared-gym', 'covered-parking', …").
// Source: the "UAE – Allowed Categories, Property Types & Amenities" table in
// docs/portals/propertyfinder-openapi.json.

const UAE_COMMERCIAL_AMENITIES = [
  "shared-gym",
  "covered-parking",
  "networked",
  "shared-pool",
  "dining-in-building",
  "conference-room",
  "lobby-in-building",
  "vastu-compliant",
];

const UAE_RESIDENTIAL_AMENITIES = [
  "central-ac",
  "built-in-wardrobes",
  "kitchen-appliances",
  "security",
  "concierge",
  "maid-service",
  "balcony",
  "private-gym",
  "shared-gym",
  "private-jacuzzi",
  "shared-spa",
  "covered-parking",
  "maids-room",
  "study",
  "childrens-play-area",
  "pets-allowed",
  "barbecue-area",
  "shared-pool",
  "childrens-pool",
  "private-garden",
  "private-pool",
  "view-of-water",
  "view-of-landmark",
  "walk-in-closet",
  "lobby-in-building",
  "vastu-compliant",
];

/** Property types that accept no amenities at all, in either category. */
const NO_AMENITY_TYPES = new Set(["land", "farm"]);

/** Amenities PF accepts for a UAE listing of this category + PF property type. */
export function allowedPfAmenities(
  category: "residential" | "commercial",
  pfType: string,
): ReadonlySet<string> {
  if (NO_AMENITY_TYPES.has(pfType)) return new Set();
  return new Set(
    category === "commercial" ? UAE_COMMERCIAL_AMENITIES : UAE_RESIDENTIAL_AMENITIES,
  );
}

/**
 * Drop amenities PF won't accept for this listing. Dropping is deliberate: the
 * amenity is cosmetic, and rejecting the whole listing over one checkbox (the
 * previous behaviour) is far worse. The value stays on the property in the CRM
 * and still goes out in the Bayut/dubizzle feed, which has no such enum.
 */
export function filterPfAmenities(
  amenities: string[] | null | undefined,
  category: "residential" | "commercial",
  pfType: string,
): string[] {
  const allowed = allowedPfAmenities(category, pfType);
  return (amenities ?? []).filter((a) => allowed.has(a));
}

/** i18n key for an amenity slug — prefer stable `amenity.<slug>`, fall back to Title Case. */
export function amenityI18nKey(slug: string): string {
  return `amenity.${slug}`;
}

/** Human-readable English label for an amenity slug (Title Case). Also used as i18n fallback key. */
export function amenityLabel(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w === "ac" ? "AC" : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
