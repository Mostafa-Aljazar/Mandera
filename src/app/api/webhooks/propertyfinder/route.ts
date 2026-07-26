// PropertyFinder webhook receiver.
//
// Publishing is asynchronous: POST /publish only means "accepted". PF then calls
// this endpoint with listing.published / listing.publishFailed / listing.unpublished
// so we can flip the property_publications status from `pending` to its final state.
//
// Subscribe per company via POST /v1/webhooks pointing at
//   {APP_URL}/api/webhooks/propertyfinder

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Pull the event name + listing id out of PF's webhook body defensively —
 *  the payload shape varies slightly by event. */
function parseEvent(payload: Record<string, unknown>): {
  type: string | undefined;
  listingId: string | undefined;
  reason: string | undefined;
} {
  const type =
    (payload.type as string | undefined) ??
    (payload.eventId as string | undefined) ??
    (payload.event as string | undefined);

  const data = (payload.data ?? payload) as Record<string, unknown>;
  const listing = (data.listing ?? data) as Record<string, unknown>;
  const rawId =
    listing.id ?? data.listingId ?? data.id ?? (payload as Record<string, unknown>).listingId;
  const listingId = rawId != null ? String(rawId) : undefined;

  let reason: string | undefined;
  const reasons = (data.reasons ?? listing.reasons) as
    | Array<Record<string, unknown>>
    | undefined;
  if (Array.isArray(reasons) && reasons.length > 0) {
    reason = reasons
      .map((r) => (r.en as string) ?? (r.message as string) ?? JSON.stringify(r))
      .join("; ");
  }

  return { type, listingId, reason };
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, listingId, reason } = parseEvent(payload);
  if (!listingId || !type) {
    // Ack unknown shapes so PF does not retry indefinitely.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { last_synced_at: now };

  if (type.includes("publishFailed")) {
    update.status = "failed";
    update.last_error = reason ?? "Publish failed";
  } else if (type.includes("unpublished")) {
    update.status = "unpublished";
  } else if (type.includes("published")) {
    update.status = "published";
    update.published_at = now;
    update.last_error = null;
  } else {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("property_publications")
    .update(update)
    .eq("platform", "propertyfinder")
    .eq("external_id", listingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
