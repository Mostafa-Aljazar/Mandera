// PropertyFinder Enterprise API client (server-only).
// Base: https://atlas.propertyfinder.com — see docs/portals/propertyfinder-api-reference.md.
//
// Auth: exchange the company's apiKey/apiSecret for a 30-min JWT (no refresh
// flow). We cache the token on the company's `company_portal_credentials` row
// so we do not re-auth on every call.
//
// IMPORTANT: uses `axios` (Node's core http/https modules), NOT the native
// `fetch()` (undici). Confirmed via side-by-side testing (curl, PowerShell's
// Invoke-RestMethod, and Node's `fetch()` — all with identical credentials,
// same machine, same network): PropertyFinder's gateway returns a bare 404 on
// `/v1/locations` specifically for requests made via Node's `fetch()`/undici,
// while curl and PowerShell succeed. This is almost certainly TLS/HTTP client
// fingerprinting on their WAF flagging undici's signature. axios's http/https
// stack does not trigger it.

import axios from "axios";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { PortalCredentials } from "@/types/supabase-entities.types";

const BASE_URL = "https://atlas.propertyfinder.com";
// Refresh a little before the real expiry to avoid edge-of-expiry 401s.
const TOKEN_SAFETY_WINDOW_MS = 60_000;

// `validateStatus: () => true` makes axios resolve (not throw) for every HTTP
// status, matching fetch()'s behavior — we branch on `res.status` ourselves.
const http = axios.create({ baseURL: BASE_URL, validateStatus: () => true });

export class PropertyFinderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "PropertyFinderError";
  }
}

function bodySnippet(data: unknown, max = 200): string {
  const text = typeof data === "string" ? data : JSON.stringify(data ?? "");
  return text.replace(/\s+/g, " ").trim().slice(0, max);
}

/** PF's JSON error envelope: `{type, title, detail, errors: [{detail, pointer}]}`. */
interface PfErrorEnvelope {
  type?: string;
  title?: string;
  detail?: string;
  errors?: Array<{ detail?: string; title?: string; pointer?: string }>;
}

function tryParseJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return undefined;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

/**
 * Turn a PF error body into the one line that actually says what's wrong.
 *
 * Two shapes show up in practice: a flat envelope whose `errors[]` carry a
 * JSON-pointer per offending field, and — on `POST /v1/listings` — an envelope
 * whose `detail` is the *stringified* inner envelope ("failed to create
 * listing: ... request failed: {...}"). Without unwrapping that, the caller
 * only ever sees the useless outer wrapper, so recurse into embedded JSON.
 */
function describePfError(data: unknown, depth = 0): string {
  if (data == null || depth > 5) return "";

  if (typeof data === "string") {
    const embedded = tryParseJson(data);
    const inner = embedded ? describePfError(embedded, depth + 1) : "";
    return inner || data.replace(/\s+/g, " ").trim();
  }

  if (typeof data !== "object") return String(data);

  const env = data as PfErrorEnvelope;
  const fieldErrors = (env.errors ?? [])
    .map((e) =>
      [e.pointer?.replace(/^\//, ""), e.detail || e.title].filter(Boolean).join(": "),
    )
    .filter(Boolean);
  if (fieldErrors.length) return fieldErrors.join(" | ");

  const fromDetail = env.detail ? describePfError(env.detail, depth + 1) : "";
  if (fromDetail) return fromDetail;

  return env.title ?? bodySnippet(data);
}

async function requestToken(apiKey: string, apiSecret: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const res = await http.post(
    "/v1/auth/token",
    { apiKey, apiSecret },
    { headers: { "Content-Type": "application/json", Accept: "application/json" } },
  );
  if (res.status < 200 || res.status >= 300) {
    throw new PropertyFinderError("Failed to obtain PropertyFinder token", res.status, res.data);
  }
  return res.data;
}

/** Return a valid access token for the company, refreshing + caching if needed. */
async function getAccessToken(cred: PortalCredentials): Promise<string> {
  if (!cred.api_key || !cred.api_secret) {
    throw new PropertyFinderError("PropertyFinder credentials not configured", 400);
  }

  const notExpired =
    cred.cached_access_token &&
    cred.cached_token_expires_at &&
    new Date(cred.cached_token_expires_at).getTime() - TOKEN_SAFETY_WINDOW_MS > Date.now();
  if (notExpired) return cred.cached_access_token as string;

  const { accessToken, expiresIn } = await requestToken(cred.api_key, cred.api_secret);
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const supabase = getSupabaseAdmin();
  await supabase
    .from("company_portal_credentials")
    .update({ cached_access_token: accessToken, cached_token_expires_at: expiresAt })
    .eq("id", cred.id);

  return accessToken;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Authenticated JSON request with one incremental-backoff retry on 429. */
async function apiFetch<T>(
  cred: PortalCredentials,
  path: string,
  init: { method?: string; body?: string } = {},
  attempt = 0,
): Promise<T> {
  const token = await getAccessToken(cred);
  const method = init.method ?? "GET";
  const res = await http.request({
    url: path,
    method,
    headers: {
      Accept: "application/json",
      // Content-Type only makes sense when we're actually sending a body —
      // some strict gateways route/validate on it, so omit for GET/DELETE.
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
    },
    data: init.body,
  });

  if (res.status === 429 && attempt < 3) {
    // Incremental backoff with jitter (guideline's recommendation).
    await sleep(500 * 2 ** attempt + Math.random() * 250);
    return apiFetch<T>(cred, path, init, attempt + 1);
  }

  if (res.status < 200 || res.status >= 300) {
    // Surface the real reason in the message itself — callers that just
    // log/display `err.message` (rather than `err.body`) still get the
    // offending field instead of a bare status code or a truncated envelope.
    const snippet = describePfError(res.data).slice(0, 600) || bodySnippet(res.data);
    const suffix = snippet ? `: ${snippet}` : "";
    throw new PropertyFinderError(
      `PropertyFinder ${method} ${path} failed (${res.status})${suffix}`,
      res.status,
      res.data,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.data as T;
}

// --- Endpoint wrappers ------------------------------------------------------

export interface PfLocation {
  id: number;
  name: string;
  coordinates?: { lat: number; lng: number };
}

/** GET /v1/locations?search= — for the manual location picker. */
export async function searchLocations(
  cred: PortalCredentials,
  search: string,
): Promise<PfLocation[]> {
  const res = await apiFetch<{ data: PfLocation[] }>(
    cred,
    `/v1/locations?search=${encodeURIComponent(search)}`,
  );
  return res?.data ?? [];
}

export interface PfUser {
  /** The user's public-profile id — this is what `createdBy`/`assignedTo` take,
   *  NOT the user id, and not the broker/client id shown in PF's own UI. */
  publicProfileId: number;
  name: string;
  email?: string;
  status?: string;
}

interface PfUserRow {
  id?: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
  publicProfile?: { id?: number; name?: string };
}

/** GET /v1/users — the agents this API key may assign listings to. */
export async function listUsers(cred: PortalCredentials): Promise<PfUser[]> {
  const res = await apiFetch<{ data: PfUserRow[] }>(cred, `/v1/users?perPage=100`);
  return (res?.data ?? [])
    .filter((u) => typeof u.publicProfile?.id === "number")
    .map((u) => ({
      publicProfileId: u.publicProfile?.id as number,
      name:
        u.publicProfile?.name ||
        u.name ||
        [u.firstName, u.lastName].filter(Boolean).join(" ") ||
        `Profile ${u.publicProfile?.id}`,
      email: u.email,
      status: u.status,
    }));
}

/** GET /v1/compliances/{permitNumber}/{licenseNumber} — DLD permit validation. */
export async function getCompliance(
  cred: PortalCredentials,
  permitNumber: string,
  licenseNumber: string,
): Promise<unknown> {
  return apiFetch(
    cred,
    `/v1/compliances/${encodeURIComponent(permitNumber)}/${encodeURIComponent(licenseNumber)}`,
  );
}

/** POST /v1/listings — create a draft listing; returns its id. */
export async function createListing(
  cred: PortalCredentials,
  body: Record<string, unknown>,
): Promise<{ id: number | string }> {
  return apiFetch(cred, `/v1/listings`, { method: "POST", body: JSON.stringify(body) });
}

export interface PfListingSummary {
  id: string;
  reference: string;
  /** `{stage, type, reasons[]}` — `type` is where publishing_failed shows up. */
  state?: {
    stage?: string;
    type?: string;
    reasons?: Array<{ en?: string; ar?: string }>;
  };
}

/**
 * GET /v1/listings?filter[reference]= — find a listing by our own reference.
 *
 * Two traps: the collection is returned under `results` (NOT `data`, which is
 * what /v1/users uses), and `draft` defaults to false, so a listing that never
 * went live is invisible unless it is passed explicitly. Search drafts first —
 * that is where a listing whose publish failed sits.
 */
export async function findListingByReference(
  cred: PortalCredentials,
  reference: string,
): Promise<PfListingSummary | null> {
  const path = `/v1/listings?filter[reference]=${encodeURIComponent(reference)}&perPage=5`;
  for (const draft of [true, false]) {
    const res = await apiFetch<{ results?: PfListingSummary[] }>(
      cred,
      `${path}&draft=${draft}`,
    );
    const match = (res?.results ?? []).find((l) => l.reference === reference);
    if (match) return match;
  }
  return null;
}

/** PUT /v1/listings/{id} — replace an existing listing (same body as create). */
export async function updateListing(
  cred: PortalCredentials,
  listingId: string,
  body: Record<string, unknown>,
): Promise<void> {
  await apiFetch(cred, `/v1/listings/${encodeURIComponent(listingId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/** POST /v1/listings/{id}/publish — request publication (async; confirmed via webhook). */
export async function publishListing(
  cred: PortalCredentials,
  listingId: string,
): Promise<void> {
  await apiFetch(cred, `/v1/listings/${encodeURIComponent(listingId)}/publish`, {
    method: "POST",
  });
}

/** POST /v1/listings/{id}/unpublish — remove from the PF website. */
export async function unpublishListing(
  cred: PortalCredentials,
  listingId: string,
): Promise<void> {
  await apiFetch(cred, `/v1/listings/${encodeURIComponent(listingId)}/unpublish`, {
    method: "POST",
  });
}

// --- Connection diagnostics -------------------------------------------------

export interface ConnectionDiagnosticStep {
  step: "token" | "locations";
  ok: boolean;
  status?: number;
  message: string;
}

/**
 * Server-support diagnostic: exercises auth + the Locations endpoint with a
 * fresh, uncached token and reports raw status/body per step. Deliberately
 * bypasses the cached-token machinery in `apiFetch`/`getAccessToken` (no DB
 * writes) so "Test Connection" always reflects the current keys, not a stale
 * cached JWT.
 */
export async function diagnosePfConnection(
  cred: PortalCredentials,
): Promise<ConnectionDiagnosticStep[]> {
  const steps: ConnectionDiagnosticStep[] = [];

  if (!cred.api_key || !cred.api_secret) {
    steps.push({ step: "token", ok: false, message: "API key/secret not set." });
    return steps;
  }

  let accessToken: string;
  try {
    const result = await requestToken(cred.api_key, cred.api_secret);
    accessToken = result.accessToken;
    steps.push({ step: "token", ok: true, status: 200, message: "Token obtained successfully." });
  } catch (err) {
    const status = err instanceof PropertyFinderError ? err.status : undefined;
    const message = err instanceof PropertyFinderError ? err.message : (err as Error).message;
    steps.push({ step: "token", ok: false, status, message });
    return steps; // no point testing locations without a token
  }

  try {
    const res = await http.get("/v1/locations", {
      params: { search: "Dubai" },
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    });
    const ok = res.status >= 200 && res.status < 300;
    const snippet = bodySnippet(res.data, 300);
    steps.push({
      step: "locations",
      ok,
      status: res.status,
      message: ok ? "Locations endpoint reachable." : snippet || `HTTP ${res.status}`,
    });
  } catch (err) {
    steps.push({ step: "locations", ok: false, message: (err as Error).message });
  }

  return steps;
}
