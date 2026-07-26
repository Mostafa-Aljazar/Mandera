// Pure validation: which fields a property still needs before it can be
// published to a given portal. Shared by the server action and the publish UI
// (so it must NOT live in a "use server" module).

import type { Portal, PropertyWithRelations } from "@/types/supabase-entities.types";

/** Only the credential fields validation actually reads. Accepts both the full
 *  `PortalCredentials` (server action) and the non-secret `PortalPublicConfig`
 *  (client publish UI). */
type CredForValidation = {
  pf_public_profile_id?: string | null;
  license_number?: string | null;
} | null;

/** Human-readable list of fields still required before `portal` can be enabled.
 *  Empty array ⇒ ready to publish. */
export function validatePropertyForPortal(
  property: PropertyWithRelations,
  portal: Portal,
  cred: CredForValidation,
): string[] {
  const missing: string[] = [];
  const hasImages = (property.images ?? []).length > 0;
  const isRent = (property.listing_type ?? "").toLowerCase() === "rent";
  const isLandLike = /land|farm/i.test(property.property_type?.name ?? property.type ?? "");

  if (!property.title) missing.push("Title");
  if (!property.description) missing.push("Description");
  if (!property.price || property.price <= 0) missing.push("Price");
  if (!hasImages) missing.push("At least one image");
  if (!property.building_area && !property.land_area) missing.push("Size / building area");
  if (!property.furnishing) missing.push("Furnishing");
  if (!property.advertising_permit_number) missing.push("Permit number");
  if (!property.permit_type) missing.push("Permit type");
  if (!isLandLike && !property.bedrooms) missing.push("Bedrooms");
  if (!isLandLike && !property.bathrooms) missing.push("Bathrooms");
  if (isRent && !property.rent_frequency) missing.push("Rent frequency");

  if (portal === "propertyfinder") {
    if (!property.title_ar) missing.push("Arabic title");
    if (!property.description_ar) missing.push("Arabic description");
    if (!property.pf_location_id) missing.push("PropertyFinder location");
    if (!property.emirate) missing.push("Emirate");
    if (!cred?.pf_public_profile_id) missing.push("PF public profile id (Settings)");
    if (!cred?.license_number) missing.push("License number (Settings)");
  } else {
    // bayut / dubizzle
    if (!property.city && !property.emirate) missing.push("City/Emirate");
    if (!property.locality && !property.area_district_ref?.name) missing.push("Locality");
    if (!property.property_type?.name && !property.type) missing.push("Property type");
    if (property.is_off_plan) {
      if (!property.offplan_sale_type) missing.push("Off-plan sale type");
      if (property.offplan_sale_type === "New" && property.offplan_dld_waiver == null) {
        missing.push("DLD waiver");
      }
      if (property.offplan_sale_type === "Resale") {
        if (!property.offplan_original_price) missing.push("Off-plan original price");
        if (!property.offplan_amount_paid) missing.push("Off-plan amount paid");
      }
    }
  }

  return missing;
}
