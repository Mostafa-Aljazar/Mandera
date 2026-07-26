// PropertyFinder's fixed `amenities` enum (see docs/openapi.json). The form
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
