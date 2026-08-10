"use server";

import { getServerSupabase, getSupabaseAdmin } from "@/lib/supabase/server";
import { assertCompanyMember } from "@/actions/_access";
import { canApproveProperties, canPublishToPortals, canViewCompanySettings } from "@/lib/permissions";
import {
  createListing,
  updateListing,
  findListingByReference,
  publishListing,
  unpublishListing,
  getCompliance,
  searchLocations,
  listUsers,
  diagnosePfConnection,
  type PfLocation,
  type PfUser,
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
  PropertyPublicationStatus,
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

/**
 * Re-check a pending PropertyFinder publication against PF's live state.
 *
 * The publish-time poll gives up after a few seconds, so a listing PF rejects
 * later would otherwise sit on "pending" forever. The publish dialog calls this
 * on open, which is the only moment anyone is actually looking at the status.
 *
 * No-ops unless there's a pending PF row — nothing to correct otherwise.
 */
export async function refreshPfPublicationStatus(
  propertyId: string,
): Promise<ActionResult<PropertyPublication | null>> {
  const property = await fetchPropertyWithRelations(propertyId);
  if (!property) return { error: "Property not found" };

  const access = await assertCompanyMember(property.company_id);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" };
  }
  // Refreshing writes to property_publications, which RLS restricts the same
  // way publishing is — for everyone else this is simply a no-op.
  if (!canPublishToPortals(access.data.role)) return { data: null };

  const supabase = await getServerSupabase();
  const { data: pub } = await supabase
    .from("property_publications")
    .select("status, external_id")
    .eq("property_id", propertyId)
    .eq("platform", "propertyfinder")
    .maybeSingle();
  if (!pub || pub.status !== "pending") return { data: null };

  const cred = await loadCredential(property.company_id, "propertyfinder");
  if (!cred || !cred.api_key || !cred.api_secret) return { data: null };

  try {
    const listing = await findListingByReference(cred, property.code);
    const stateType = listing?.state?.type;
    if (stateType === "live") {
      return upsertPublication(propertyId, property.company_id, "propertyfinder", {
        status: "published",
        last_error: null,
        published_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      });
    }
    if (stateType && /failed|rejected/.test(stateType)) {
      const reason =
        (listing?.state?.reasons ?? [])
          .map((r) => r.en || r.ar)
          .filter(Boolean)
          .join(" | ") || stateType;
      return upsertPublication(propertyId, property.company_id, "propertyfinder", {
        status: "failed",
        last_error: reason,
        last_synced_at: new Date().toISOString(),
      });
    }
    return { data: null }; // still in flight — leave it pending
  } catch (err) {
    // A failed status check must never look like a publishing failure.
    console.warn(
      `[PropertyFinder] status refresh failed for ${property.code}:`,
      (err as Error).message,
    );
    return { data: null };
  }
}

/** The PF agents this company's key may assign listings to — populates the
 *  public-profile picker in Settings → Portal Integrations. Manager-only, same
 *  gate as the credentials themselves. */
export async function listPfUsers(companyId: string): Promise<ActionResult<PfUser[]>> {
  const access = await assertCompanyMember(companyId);
  if (access.error || !access.data) {
    return { error: access.error || "Access denied" };
  }
  if (!canViewCompanySettings(access.data.role)) {
    return { error: "Only managers can manage portal credentials." };
  }

  const cred = await loadCredential(companyId, "propertyfinder");
  if (!cred || !cred.api_key || !cred.api_secret) {
    return { error: "Enter and save the PropertyFinder API key and secret first." };
  }
  try {
    return { data: await listUsers(cred) };
  } catch (err) {
    return { error: (err as Error).message };
  }
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

      // PF keys listings by our `reference` and rejects a second create with
      // the same one ("A Catalog with this reference already exists for this
      // client"). A listing can therefore exist on PF while we hold no
      // external_id — an earlier run whose bookkeeping row never landed, or a
      // publish that failed on PF's side after the create succeeded. Adopt it
      // and update in place instead of dead-ending on a duplicate reference.
      const supabase = await getServerSupabase();
      const { data: existing } = await supabase
        .from("property_publications")
        .select("external_id")
        .eq("property_id", propertyId)
        .eq("platform", portal)
        .maybeSingle();

      let listingId = (existing?.external_id as string | null) ?? null;
      if (!listingId) {
        const found = await findListingByReference(cred, property.code);
        listingId = found?.id ?? null;
      }

      if (listingId) {
        await updateListing(cred, listingId, body);
      } else {
        listingId = String((await createListing(cred, body)).id);
      }
      await publishListing(cred, listingId);

      // Publishing is asynchronous on PF's side. Compliance rejections
      // (invalid/expired permit, permit at capacity) settle in a second or
      // two, but NOT instantly — reading the state back immediately races the
      // publish and reports a stale "draft", which is how a rejected listing
      // ended up displayed as "pending" indefinitely. Poll a few times and
      // stop as soon as the state is terminal; if it is still in flight when
      // the budget runs out, leave it pending as before.
      let status: PropertyPublicationStatus = "pending";
      let lastError: string | null = null;
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 1500 : 2000));
          const after = await findListingByReference(cred, property.code);
          const stateType = after?.state?.type;
          if (stateType === "live") {
            status = "published";
            break;
          }
          if (stateType && /failed|rejected/.test(stateType)) {
            status = "failed";
            lastError =
              (after?.state?.reasons ?? [])
                .map((r) => r.en || r.ar)
                .filter(Boolean)
                .join(" | ") || stateType;
            break;
          }
        }
      } catch (readBackErr) {
        // Best-effort only — the publish request itself already succeeded.
        console.warn(
          `[PropertyFinder] could not read back listing state for ${property.code}:`,
          (readBackErr as Error).message,
        );
      }

      return upsertPublication(propertyId, property.company_id, portal, {
        status,
        external_id: listingId,
        last_error: lastError,
        last_synced_at: new Date().toISOString(),
        ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
      });
    } catch (err) {
      const message = (err as Error).message;
      if (err instanceof PropertyFinderError) {
        // The trimmed message goes to the UI/`last_error`; keep the raw
        // envelope in the server log so a rejected field can be traced
        // without re-running the publish.
        console.error(
          `[PropertyFinder] publish failed for property ${propertyId}:`,
          JSON.stringify(err.body),
        );
      }
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
    // "catalog is not live" — the listing never made it live (still a draft, or
    // its publish was rejected), so there is nothing to pull down. That's the
    // outcome the caller asked for, not a failure: fall through and record it
    // as unpublished instead of leaving the toggle stuck on.
    const alreadyNotLive =
      err instanceof PropertyFinderError &&
      err.status === 422 &&
      /not\s+live/i.test(message);
    if (!alreadyNotLive) return { error: message };
  }

  return upsertPublication(propertyId, property.company_id, portal, {
    status: "unpublished",
    last_error: null,
    last_synced_at: new Date().toISOString(),
  });
}
