// Pure builder for the Bayut & dubizzle *Combined XML feed*.
// See docs/"Bayut & dubizzle Combined XML Guidelines - Updated.pdf".
//
// The portals poll a public URL and read this XML. A per-property <Portals> tag
// decides whether the listing goes live on Bayut, dubizzle, or both. To remove a
// listing from a portal, emit it with <Property_Status>deleted</Property_Status>.

import type { PropertyWithRelations } from "@/types/supabase-entities.types";
import { amenityLabel } from "./amenities";

/** A property paired with the portals it should appear on and its feed status. */
export interface FeedItem {
  property: PropertyWithRelations;
  /** Portals (Bayut/dubizzle) this property is live on. */
  livePortals: Array<"bayut" | "dubizzle">;
  /** Portals this property is being removed from. */
  removedPortals: Array<"bayut" | "dubizzle">;
}

const PORTAL_LABEL: Record<"bayut" | "dubizzle", string> = {
  bayut: "Bayut",
  dubizzle: "dubizzle",
};

function cdata(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  // CDATA cannot contain the literal "]]>" — split it defensively.
  const text = String(value).replace(/]]>/g, "]]]]><![CDATA[>");
  return `<![CDATA[ ${text} ]]>`;
}

/** Emit a single tag only when it has a value (keeps the feed clean). */
function tag(name: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return `    <${name}>${cdata(value)}</${name}>\n`;
}

/** "YYYY-MM-DD HH:mm:ss" in UTC, matching the guideline's Last_Updated sample. */
function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
  );
}

/** listing_type ("Sale" | "Rent") -> Bayut Property_purpose ("Buy" | "Rent"). */
function mapPurpose(listingType: string): string {
  return listingType?.toLowerCase() === "sale" ? "Buy" : "Rent";
}

/** furnishing -> Bayut Furnished ("Yes" | "No" | "Partly"). */
function mapFurnished(furnishing: string | null): string {
  switch ((furnishing ?? "").toLowerCase()) {
    case "furnished":
      return "Yes";
    case "unfurnished":
      return "No";
    case "semi-furnished":
    case "partly":
      return "Partly";
    default:
      return "";
  }
}

function childListTag(
  wrapper: string,
  child: string,
  values: string[] | null | undefined,
): string {
  const items = (values ?? []).filter((v) => v && v.trim() !== "");
  if (items.length === 0) return "";
  const inner = items.map((v) => `      <${child}>${cdata(v)}</${child}>`).join("\n");
  return `    <${wrapper}>\n${inner}\n    </${wrapper}>\n`;
}

/** Build one <Property> block. Pure — no I/O. */
export function buildPropertyXml(item: FeedItem): string {
  const { property: p } = item;
  const isRemoval = item.livePortals.length === 0;
  const portals = isRemoval ? item.removedPortals : item.livePortals;
  const status = isRemoval ? "deleted" : "live";

  const agentName = p.employee?.name ?? "";
  const agentPhone = p.employee?.employee_record?.phone ?? "";
  const agentEmail = p.employee?.employee_record?.email ?? "";
  const propertyType = p.property_type?.name_en ?? p.type ?? "";
  const size = p.building_area ?? p.land_area ?? null;
  const isRent = p.listing_type?.toLowerCase() === "rent";

  const portalTags = portals
    .map((portal) => `      <Portal>${cdata(PORTAL_LABEL[portal])}</Portal>`)
    .join("\n");

  return (
    `  <Property>\n` +
    tag("Property_Ref_No", p.code) +
    tag("Permit_Number", p.advertising_permit_number) +
    tag("Property_Status", status) +
    tag("Property_purpose", mapPurpose(p.listing_type)) +
    tag("Property_Type", propertyType) +
    tag("Property_Size", size) +
    tag("Property_Size_Unit", p.size_unit ?? "SQFT") +
    tag("plotArea", p.land_area) +
    tag("Bedrooms", p.bedrooms) +
    tag("Bathrooms", p.bathrooms) +
    // Bayut's Features are free text (no fixed enum); reuse the same amenity
    // selection the form collects for PropertyFinder rather than asking the
    // user to fill in a second, separate list.
    childListTag("Features", "Feature", (p.amenities ?? []).map(amenityLabel)) +
    tag("Off_Plan", p.is_off_plan ? "Yes" : "No") +
    `    <Portals>\n${portalTags}\n    </Portals>\n` +
    tag("Last_Updated", formatTimestamp(p.updated_at)) +
    tag("Property_Title", p.title) +
    tag("Property_Title_AR", p.title_ar) +
    tag("Property_Description", p.description) +
    tag("Property_Description_AR", p.description_ar) +
    tag("Price", p.price) +
    (isRent ? tag("Rent_Frequency", p.rent_frequency) : "") +
    tag("Furnished", mapFurnished(p.furnishing)) +
    (p.is_off_plan
      ? tag("offplanDetails_saleType", p.offplan_sale_type) +
        (p.offplan_sale_type === "New"
          ? tag("offplanDetails_dldWaiver", p.offplan_dld_waiver)
          : "") +
        (p.offplan_sale_type === "Resale"
          ? tag("offplanDetails_originalPrice", p.offplan_original_price) +
            tag("offplanDetails_amountPaid", p.offplan_amount_paid)
          : "")
      : "") +
    tag("City", p.city ?? p.emirate) +
    tag("Locality", p.locality ?? p.area_district_ref?.name) +
    tag("Sub_Locality", p.sub_locality) +
    tag("Tower_Name", p.tower_name) +
    childListTag("Images", "Image", p.images) +
    childListTag("Videos", "Video", p.video_urls) +
    childListTag("Floor_Plans", "Floor_Plan", p.floor_plan_urls) +
    tag("Listing_Agent", agentName) +
    tag("Listing_Agent_Phone", agentPhone) +
    tag("Listing_Agent_Email", agentEmail) +
    `  </Property>`
  );
}

/** Build the full combined feed document. */
export function buildPortalsFeed(items: FeedItem[]): string {
  const body = items.map(buildPropertyXml).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Properties>\n${body}\n</Properties>\n`;
}
