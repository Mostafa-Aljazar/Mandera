// Map a CRM property (+ the company's PF credentials) to a PropertyFinder
// POST /v1/listings request body. See docs/portals/propertyfinder-api-reference.md
// & docs/portals/propertyfinder-openapi.json.

import { filterPfAmenities } from "@/lib/portals/amenities";
import type {
  PortalCredentials,
  PropertyWithRelations,
} from "@/types/supabase-entities.types";

type PfCategory = "residential" | "commercial";
type PfPriceType = "sale" | "yearly" | "monthly" | "weekly" | "daily";

// Property-type names that indicate a commercial listing.
const COMMERCIAL_TYPES = new Set([
  "office",
  "office-space",
  "shop",
  "retail",
  "warehouse",
  "factory",
  "labour-camp",
  "labor-camp",
  "commercial-building",
  "commercial-floor",
  "commercial-land",
  "show-room",
  "showroom",
  "business-center",
  "co-working-space",
  "staff-accommodation",
]);

// CRM property-type name (slug/label) -> PF `type` enum. Best-effort; falls
// back to "apartment". Extend as the company's property_types grow.
const PF_TYPE_MAP: Record<string, string> = {
  apartment: "apartment",
  villa: "villa",
  townhouse: "townhouse",
  penthouse: "penthouse",
  duplex: "duplex",
  "hotel-apartment": "hotel-apartment",
  "hotel apartment": "hotel-apartment",
  compound: "compound",
  bungalow: "bungalow",
  "full-floor": "full-floor",
  "half-floor": "half-floor",
  "whole-building": "whole-building",
  "residential-building": "whole-building",
  land: "land",
  "residential-land": "land",
  office: "office-space",
  "office-space": "office-space",
  shop: "shop",
  retail: "retail",
  warehouse: "warehouse",
  factory: "factory",
  "show-room": "show-room",
  showroom: "show-room",
};

const EMIRATE_MAP: Record<string, string> = {
  dubai: "dubai",
  "abu dhabi": "abu_dhabi",
  abudhabi: "abu_dhabi",
  sharjah: "northern_emirates",
  ajman: "northern_emirates",
  "umm al quwain": "northern_emirates",
  "ras al khaimah": "northern_emirates",
  fujairah: "northern_emirates",
};

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function mapCategory(typeName: string | null | undefined): PfCategory {
  return COMMERCIAL_TYPES.has(normalize(typeName)) ? "commercial" : "residential";
}

function mapType(typeName: string | null | undefined): string {
  return PF_TYPE_MAP[normalize(typeName)] ?? "apartment";
}

function mapPriceType(
  listingType: string,
  rentFrequency: string | null,
): PfPriceType {
  if (normalize(listingType) === "sale") return "sale";
  switch (normalize(rentFrequency)) {
    case "daily":
      return "daily";
    case "weekly":
      return "weekly";
    case "monthly":
      return "monthly";
    default:
      return "yearly";
  }
}

/** PF `bedrooms` enum accepts "studio" or "1".."30". */
function mapBedrooms(bedrooms: string | null): string | undefined {
  if (!bedrooms) return undefined;
  const b = normalize(bedrooms);
  if (b === "studio" || b === "0") return "studio";
  const n = parseInt(b, 10);
  if (Number.isNaN(n)) return undefined;
  if (n <= 0) return "studio";
  return String(Math.min(n, 30));
}

/**
 * PF `bathrooms` enum accepts "none" or "1".."20" — a plain "0" (which the
 * CRM form happily stores) is rejected with a 400, so map it to "none" and
 * clamp anything above the enum's ceiling.
 */
function mapBathrooms(bathrooms: string | null): string | undefined {
  if (!bathrooms) return undefined;
  const b = normalize(bathrooms);
  if (b === "none") return "none";
  const n = parseInt(b, 10);
  if (Number.isNaN(n)) return undefined;
  if (n <= 0) return "none";
  return String(Math.min(n, 20));
}

function mapEmirate(emirate: string | null): string | undefined {
  return EMIRATE_MAP[normalize(emirate)];
}

/** permit_type -> PF compliance.type enum. */
function mapPermitType(permitType: string | null): string | undefined {
  const t = normalize(permitType);
  if (t === "rera" || t === "dtcm" || t === "adrec") return t;
  return undefined;
}

export function mapPropertyToPfListing(
  property: PropertyWithRelations,
  cred: PortalCredentials,
): Record<string, unknown> {
  const typeName = property.property_type?.name_en || property.type;
  const category = mapCategory(typeName);
  const pfType = mapType(typeName);
  const priceType = mapPriceType(property.listing_type, property.rent_frequency);
  const amount = Math.round(property.price);

  const images = (property.images ?? [])
    .filter((url) => url && url.trim() !== "")
    .map((url) => ({ original: { url } }));

  // PF only accepts a single primary video per listing (media.videos.default) —
  // Bayut/dubizzle's <Videos> tag supports a list, so just take the first.
  const firstVideo = (property.video_urls ?? []).find((url) => url && url.trim() !== "");

  const body: Record<string, unknown> = {
    reference: property.code,
    category,
    type: pfType,
    title: {
      en: property.title || undefined,
      ar: property.title_ar || undefined,
    },
    description: {
      en: property.description || undefined,
      ar: property.description_ar || undefined,
    },
    price: { type: priceType, amounts: { [priceType]: amount } },
    size: property.building_area ?? property.land_area ?? undefined,
    amenities: filterPfAmenities(property.amenities, category, pfType),
    media: firstVideo ? { images, videos: { default: firstVideo } } : { images },
  };

  const bedrooms = mapBedrooms(property.bedrooms);
  if (bedrooms) body.bedrooms = bedrooms;
  const bathrooms = mapBathrooms(property.bathrooms);
  if (bathrooms) body.bathrooms = bathrooms;
  if (property.furnishing) body.furnishingType = property.furnishing;
  if (property.project_status) body.projectStatus = property.project_status;
  if (property.available_from) body.availableFrom = property.available_from;
  if (property.parking_slots !== null && property.parking_slots !== undefined) {
    body.parkingSlots = property.parking_slots;
    body.hasParkingOnSite = property.parking_slots > 0;
  }

  const uaeEmirate = mapEmirate(property.emirate);
  if (uaeEmirate) body.uaeEmirate = uaeEmirate;

  if (property.pf_location_id) body.location = { id: property.pf_location_id };

  if (cred.pf_public_profile_id) {
    const id = Number(cred.pf_public_profile_id);
    const profile = { id: Number.isNaN(id) ? cred.pf_public_profile_id : id };
    body.createdBy = profile;
    // PF rejects the create with "/assigned_to: This field is required." when
    // no agent is assigned. We have no per-employee PF public-profile id yet,
    // so the company's configured profile owns every listing — reassign on the
    // PF side, or add a per-agent id later if agents need their own byline.
    body.assignedTo = profile;
  }

  const permitType = mapPermitType(property.permit_type);
  if (permitType || property.advertising_permit_number) {
    body.compliance = {
      ...(permitType ? { type: permitType } : {}),
      ...(property.advertising_permit_number
        ? { listingAdvertisementNumber: property.advertising_permit_number }
        : {}),
      ...(cred.license_number
        ? { issuingClientLicenseNumber: cred.license_number }
        : {}),
      userConfirmedDataIsCorrect: true,
    };
  }

  return body;
}
