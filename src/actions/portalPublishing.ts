"use server";

import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import { assertCompanyMember } from "@/actions/_access";
import { canApproveProperties, canPublishToPortals, canViewCompanySettings } from "@/lib/permissions";
import {
  createListing,
  publishListing,
  unpublishListing,
  getCompliance,
  searchLocations,
  diagnosePfConnection,
  type PfLocation,
  type ConnectionDiagnosticStep,
  PropertyFinderError,
} from "@/lib/portals/propertyfinder/client";
import { mapPropertyToPfListing } from "@/lib/portals/propertyfinder/map";
import { validatePropertyForPortal } from "@/lib/portals/validate";
import type {
  Portal,
  PortalCredentialPlatform,
  PortalCredentials,
  PortalPublicConfig,
  PropertyPublication,
  PropertyWithRelations,
} from "@/types/supabase-entities.types";

type ActionResult<T> =
  | { data: T; error?: undefined }
  | { data?: undefined; error: string };

const PROPERTIES_SELECT = `
  *,
  property_type:property_types(id, name_en, name_ar),
  owner:owners(id, name, phone),
  area_district_ref:areas_districts(id, name),
  employee:profiles!properties_employee_id_fkey(id, name, employee_record:employees!profiles_employee_id_fkey(phone, email))
`;

/** The credential row that backs a given granular portal. */
function credentialPlatformFor(portal: Portal): PortalCredentialPlatform {
  return portal === "propertyfinder" ? "propertyfinder" : "bayut_dubizzle";
}

/** Load a company's credential row server-side with the service-role client.
 *  Used by publish/search flows so any staff member can trigger a publish
 *  without depending on the caller's own RLS session. Never expose the
 *  returned row (it contains secrets) to the client — return only pass/fail +
 *  status from callers. */
async function loadCredential(
  companyId: string,
  platform: PortalCredentialPlatform,
): Promise<PortalCredentials | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("company_portal_credentials")
    .select("*")
    .eq("company_id", companyId)
    .eq("platform", platform)
    .maybeSingle();
  return (data as PortalCredentials) ?? null;
}

// --- Reads ------------------------------------------------------------------

export async function getPropertyPublications(
  propertyId: string,
): Promise<ActionResult<PropertyPublication[]>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("property_publications")
    .select("*")
    .eq("property_id", propertyId);
  if (error) return { error: error.message };
  return { data: (data ?? []) as PropertyPublication[] };
}

/** Full credentials (incl. secrets) for a company's Settings screen — manager only. */
export async function getPortalCredentials(
  companyId: string,
): Promise<ActionResult<PortalCredentials[]>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" };
  }
  if (!canViewCompanySettings(access.data.role)) {
    return { error: "Only managers can view portal credentials." };
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("company_portal_credentials")
    .select("*")
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  return { data: (data ?? []) as PortalCredentials[] };
}

/** Non-secret per-platform config for a company (publish toggles + the
 *  property form's PF location picker). Loaded via the service-role client so
 *  it works regardless of the caller's role, but returns NO secrets. */
export async function getPortalPublicConfig(
  companyId: string,
): Promise<ActionResult<PortalPublicConfig[]>> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("company_portal_credentials")
    .select("platform, enabled, api_key, api_secret, pf_public_profile_id, license_number")
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  const config: PortalPublicConfig[] = (data ?? []).map((row) => ({
    company_id: companyId,
    platform: row.platform as PortalCredentialPlatform,
    enabled: !!row.enabled,
    has_api_credentials: !!row.api_key && !!row.api_secret,
    pf_public_profile_id: row.pf_public_profile_id ?? null,
    license_number: row.license_number ?? null,
  }));
  return { data: config };
}

export interface UpsertPortalCredentialsInput {
  companyId: string;
  platform: PortalCredentialPlatform;
  enabled?: boolean;
  feed_token?: string | null;
  api_key?: string | null;
  api_secret?: string | null;
  pf_public_profile_id?: string | null;
  license_number?: string | null;
  default_permit_type?: string | null;
}

export async function upsertPortalCredentials(
  input: UpsertPortalCredentialsInput,
): Promise<ActionResult<PortalCredentials>> {
  const access = await assertCompanyMember(input.companyId);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" };
  }
  if (!canViewCompanySettings(access.data.role)) {
    return { error: "Only managers can manage portal credentials." };
  }

  const supabase = await getServerSupabase();

  const payload: Record<string, unknown> = {
    company_id: input.companyId,
    platform: input.platform,
  };
  for (const key of [
    "enabled",
    "feed_token",
    "api_key",
    "api_secret",
    "pf_public_profile_id",
    "license_number",
    "default_permit_type",
  ] as const) {
    if (input[key] !== undefined) payload[key] = input[key];
  }
  // Any credential change invalidates the cached PF token.
  if (input.platform === "propertyfinder") {
    payload.cached_access_token = null;
    payload.cached_token_expires_at = null;
  }

  const { data, error } = await supabase
    .from("company_portal_credentials")
    .upsert(payload, { onConflict: "company_id,platform" })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as PortalCredentials };
}

/** Search PropertyFinder locations for the manual location picker in the form.
 *  Loads the company's own PF credentials server-side (secrets never reach
 *  the client — only location results do). */
export async function searchPfLocations(
  companyId: string,
  query: string,
): Promise<ActionResult<PfLocation[]>> {
  if (!query || query.trim().length < 2) return { data: [] };
  const cred = await loadCredential(companyId, "propertyfinder");
  if (!cred || !cred.api_key || !cred.api_secret) {
    return { error: "PropertyFinder is not configured" };
  }
  try {
    const results = await searchLocations(cred, query.trim());
    return { data: results };
  } catch (err) {
    if (err instanceof PropertyFinderError && err.status === 404) {
      // The Locations endpoint's documented responses are 200/400/401/403/429
      // — a 404 here is NOT "no results" (that's an empty 200 array), it means
      // the route itself wasn't found for this account. That's an account/key
      // provisioning issue on PropertyFinder's side, not a bad search term.
      return {
        error:
          "PropertyFinder's Locations service returned 404 for this API key (not a normal 'no results' response). Verify the key has Enterprise API / Atlas access, or contact your PropertyFinder account manager.",
      };
    }
    const message =
      err instanceof PropertyFinderError ? err.message : (err as Error).message;
    return { error: message };
  }
}

/** Diagnostic: exercise auth + the Locations endpoint with the company's saved
 *  PropertyFinder keys and report raw status/body per step. Use this to
 *  produce concrete evidence (e.g. an unexpected 404 on a default scope) to
 *  hand to PropertyFinder's integration support. */
export async function testPfConnection(
  companyId: string,
): Promise<ActionResult<ConnectionDiagnosticStep[]>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" };
  }
  if (!canViewCompanySettings(access.data.role)) {
    return { error: "Only managers can test portal connections." };
  }

  const cred = await loadCredential(companyId, "propertyfinder");
  if (!cred) return { error: "PropertyFinder is not configured" };
  const steps = await diagnosePfConnection(cred);
  return { data: steps };
}

/** Generate/rotate this company's Bayut+dubizzle feed token. */
export async function regenerateFeedToken(
  companyId: string,
): Promise<ActionResult<string>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" };
  }
  if (!canViewCompanySettings(access.data.role)) {
    return { error: "Only managers can manage portal credentials." };
  }

  const token = crypto.randomUUID().replace(/-/g, "");
  const res = await upsertPortalCredentials({
    companyId,
    platform: "bayut_dubizzle",
    feed_token: token,
  });
  if (res.error) return { error: res.error };
  return { data: token };
}

// --- Publish toggle ---------------------------------------------------------

async function loadCompanyPublishSettings(
  companyId: string,
): Promise<Record<string, unknown>> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("companies")
    .select("publish_settings")
    .eq("id", companyId)
    .maybeSingle();
  return (data?.publish_settings as Record<string, unknown> | null) ?? {};
}

/**
 * Unpublish every active portal listing for a property (used when pausing
 * with auto_unpublish_on_pause enabled).
 */
export async function unpublishAllPortalsForProperty(
  propertyId: string,
  companyId: string,
): Promise<ActionResult<null>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" };
  }
  if (
    !canPublishToPortals(access.data.role) &&
    !canApproveProperties(access.data.role)
  ) {
    return { error: "Access denied" };
  }

  const supabase = await getServerSupabase();
  const { data: pubs, error } = await supabase
    .from("property_publications")
    .select("platform, status")
    .eq("property_id", propertyId)
    .eq("company_id", companyId)
    .in("status", ["published", "pending"]);

  if (error) return { error: error.message };

  for (const pub of pubs ?? []) {
    const result = await setPortalPublication(
      propertyId,
      pub.platform as Portal,
      false,
    );
    if (result.error) {
      console.warn(
        `[portals] auto-unpublish ${pub.platform} failed:`,
        result.error,
      );
    }
  }

  return { data: null };
}

async function fetchPropertyWithRelations(
  propertyId: string,
): Promise<PropertyWithRelations | null> {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("properties")
    .select(PROPERTIES_SELECT)
    .eq("id", propertyId)
    .single();
  return (data as PropertyWithRelations) ?? null;
}

async function upsertPublication(
  propertyId: string,
  companyId: string,
  portal: Portal,
  fields: Partial<PropertyPublication>,
): Promise<ActionResult<PropertyPublication>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("property_publications")
    .upsert(
      {
        property_id: propertyId,
        company_id: companyId,
        platform: portal,
        ...fields,
      },
      { onConflict: "property_id,platform" },
    )
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: data as PropertyPublication };
}

/**
 * Enable/disable a property on one portal.
 *  - bayut/dubizzle: just flip the publication status (feed picks it up on the
 *    next crawl — no external call).
 *  - propertyfinder: create+publish (enable) or unpublish (disable) via the API.
 */
export async function setPortalPublication(
  propertyId: string,
  portal: Portal,
  enabled: boolean,
): Promise<ActionResult<PropertyPublication>> {
  const property = await fetchPropertyWithRelations(propertyId);
  if (!property) return { error: "Property not found" };

  const access = await assertCompanyMember(property.company_id);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" };
  }
  if (!canPublishToPortals(access.data.role)) {
    return { error: "Only administrators and managers can publish to portals." };
  }

  const publishSettings = await loadCompanyPublishSettings(property.company_id);
  const requireApproval = publishSettings.require_approval_before_publish !== false;

  // Draft / pending / rejected listings must not go to portals when the
  // company requires approval first (default: on).
  if (enabled && requireApproval && property.approval_status !== "approved") {
    return {
      error:
        "Only approved properties can be published to portals. Complete the approval workflow first.",
    };
  }

  if (enabled && property.paused_at) {
    return {
      error:
        "This property is paused and cannot be published. Unpause it first.",
    };
  }

  // This company's own account for this portal (secrets stay server-side).
  const cred = await loadCredential(property.company_id, credentialPlatformFor(portal));

  if (!cred || !cred.enabled) {
    return { error: `${portal} is not configured` };
  }

  // Bayut / dubizzle — feed-based, no external call.
  if (portal === "bayut" || portal === "dubizzle") {
    if (enabled) {
      const missing = validatePropertyForPortal(property, portal, cred);
      if (missing.length > 0) {
        return { error: `Missing required fields: ${missing.join(", ")}` };
      }
    }
    return upsertPublication(propertyId, property.company_id, portal, {
      status: enabled ? "published" : "unpublished",
      last_error: null,
      last_synced_at: new Date().toISOString(),
      ...(enabled ? { published_at: new Date().toISOString() } : {}),
    });
  }

  // PropertyFinder — live REST API.
  if (enabled) {
    const missing = validatePropertyForPortal(property, portal, cred);
    if (missing.length > 0) {
      return { error: `Missing required fields: ${missing.join(", ")}` };
    }
    try {
      // Dubai listings require DLD permit validation before create.
      if (
        (property.emirate ?? "").toLowerCase() === "dubai" &&
        property.advertising_permit_number &&
        cred.license_number
      ) {
        await getCompliance(cred, property.advertising_permit_number, cred.license_number);
      }

      const body = mapPropertyToPfListing(property, cred);
      const created = await createListing(cred, body);
      const listingId = String(created.id);
      await publishListing(cred, listingId);

      return upsertPublication(propertyId, property.company_id, portal, {
        status: "pending",
        external_id: listingId,
        last_error: null,
        last_synced_at: new Date().toISOString(),
      });
    } catch (err) {
      const message =
        err instanceof PropertyFinderError
          ? `${err.message}: ${typeof err.body === "string" ? err.body : ""}`.trim()
          : (err as Error).message;
      await upsertPublication(propertyId, property.company_id, portal, {
        status: "failed",
        last_error: message,
        last_synced_at: new Date().toISOString(),
      });
      return { error: message };
    }
  }

  // Disable PropertyFinder.
  const supabase = await getServerSupabase();
  const { data: pub } = await supabase
    .from("property_publications")
    .select("external_id")
    .eq("property_id", propertyId)
    .eq("platform", "propertyfinder")
    .maybeSingle();

  try {
    if (pub?.external_id) {
      await unpublishListing(cred, pub.external_id as string);
    }
  } catch (err) {
    const message =
      err instanceof PropertyFinderError ? err.message : (err as Error).message;
    return { error: message };
  }

  return upsertPublication(propertyId, property.company_id, portal, {
    status: "unpublished",
    last_error: null,
    last_synced_at: new Date().toISOString(),
  });
}
