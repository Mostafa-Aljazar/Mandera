// Public combined XML feed for Bayut & dubizzle.
//
// Credentials are per-company: each company has its OWN feed URL (its own
// `feed_token`) that it registers with Bayut/dubizzle, containing only that
// company's published listings. The portals' crawlers poll this URL
// (unauthenticated), so we read with the service-role client and gate on the
// company-scoped token.

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { buildPortalsFeed, type FeedItem } from "@/lib/portals/bayut-xml";
import type { PropertyWithRelations } from "@/types/supabase-entities.types";

export const dynamic = "force-dynamic";

const PROPERTIES_SELECT = `
  *,
  property_type:property_types(id, name),
  owner:owners(id, name, phone),
  area_district_ref:areas_districts(id, name),
  employee:profiles!properties_employee_id_fkey(id, name, employee_record:employees!profiles_employee_id_fkey(phone, email))
`;

type FeedPortal = "bayut" | "dubizzle";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) return new NextResponse("Not found", { status: 404 });

  const supabase = getSupabaseAdmin();

  // 1. Resolve the token to a specific company's enabled bayut_dubizzle row.
  const { data: cred } = await supabase
    .from("company_portal_credentials")
    .select("company_id, enabled")
    .eq("platform", "bayut_dubizzle")
    .eq("feed_token", token)
    .maybeSingle();

  if (!cred || !cred.enabled) {
    return new NextResponse("Not found", { status: 404 });
  }

  // 2. This company's publications on bayut/dubizzle for the feed.
  const { data: pubs, error: pubsError } = await supabase
    .from("property_publications")
    .select("property_id, platform, status")
    .eq("company_id", cred.company_id)
    .in("platform", ["bayut", "dubizzle"])
    .in("status", ["published", "unpublished"]);

  if (pubsError) {
    return new NextResponse("Feed error", { status: 500 });
  }

  const live = new Map<string, Set<FeedPortal>>();
  const removed = new Map<string, Set<FeedPortal>>();
  for (const pub of pubs ?? []) {
    const bucket = pub.status === "published" ? live : removed;
    const set = bucket.get(pub.property_id) ?? new Set<FeedPortal>();
    set.add(pub.platform as FeedPortal);
    bucket.set(pub.property_id, set);
  }

  const propertyIds = [...new Set([...live.keys(), ...removed.keys()])];
  if (propertyIds.length === 0) {
    return new NextResponse(buildPortalsFeed([]), {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }

  // 3. Load this company's properties with their relations (agent, type, owner, area).
  const { data: properties, error: propsError } = await supabase
    .from("properties")
    .select(PROPERTIES_SELECT)
    .eq("company_id", cred.company_id)
    .in("id", propertyIds);

  if (propsError) {
    return new NextResponse("Feed error", { status: 500 });
  }

  const items: FeedItem[] = (properties as PropertyWithRelations[] | null ?? []).map(
    (property) => ({
      property,
      livePortals: [...(live.get(property.id) ?? [])],
      removedPortals: [...(removed.get(property.id) ?? [])],
    }),
  );

  return new NextResponse(buildPortalsFeed(items), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
