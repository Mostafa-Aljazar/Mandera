# PropertyFinder Enterprise API — Integration Notes

> This is a curated, human-readable summary of PropertyFinder's Enterprise API. For the full
> endpoint/schema reference, use [`propertyfinder-openapi.json`](propertyfinder-openapi.json) (a
> proper OpenAPI spec) or [`propertyfinder-api-reference.md`](propertyfinder-api-reference.md) (the
> fuller raw reference text). This document exists specifically to surface the business rules,
> compliance requirements, and operational gotchas — like the CMYK image restriction and the
> image-download egress IPs — that are easy to miss when skimming the raw reference.

## 1. Introduction

Property Finder's Enterprise API is a collection of JSON/REST APIs for integrating with Property
Finder's products and services (listings, users, leads, compliance, statistics, webhooks, etc.).
It uses standard HTTP response codes and JSON request/response bodies.

**Usage restrictions — read before wiring anything up:**

- The API is intended **strictly for server-to-server communication**.
- Do **not** call it directly from frontend applications (browsers, mobile apps).
- Do **not** use it as a Backend-for-Frontend (BFF) for public or semi-public client apps.
- Requests must originate from secure, server-side environments only.

Support/integration questions: `integration.support@propertyfinder.ae`.

## 2. Authentication

All requests must carry an access token in the `Authorization` header as a Bearer token:
`Authorization: Bearer <ACCESS_TOKEN>`.

### Obtaining credentials

1. Log into **PF Expert**.
2. Go to **Developer Resources → API Credentials** in the left sidebar.
3. Generate a new API key/secret pair, using type **API Integration**.

This gives you an **API Key** (client ID) and **API Secret** (client secret).

### Exchanging credentials for a token

Exchange the key/secret for a JWT bearer token via the token endpoint. No scope is required for
this call.

```
POST /v1/auth/token
```

**Request**

```bash
curl --location 'https://atlas.propertyfinder.com/v1/auth/token' \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/json' \
  --data '{
    "apiKey": "<API_KEY>",
    "apiSecret": "<API_SECRET>"
  }'
```

**Response**

```json
{
  "accessToken": "<ACCESS_TOKEN>",
  "expiresIn": 1800,
  "tokenType": "Bearer"
}
```

### Token lifetime — no refresh flow

- Tokens are valid for `expiresIn` seconds — currently **30 minutes (1800s)**.
- **There is no refresh token flow.** When a token expires, request a brand-new one from
  `/v1/auth/token` using the same apiKey/apiSecret.
- Design the integration to re-authenticate proactively (e.g. re-issue a few minutes before
  expiry, or on receiving a 401) rather than relying on a refresh grant that doesn't exist.

### Unauthorized requests

A request without a valid token gets `401 Unauthorized`:

```json
{
  "type": "https://problems.atlas.propertyfinder.com/common-http-401-unauthorized/",
  "code": "common_http_401-unauthorized",
  "title": "Unauthorized",
  "detail": "The request requires user authentication.",
  "status": 401,
  "attributes": { "trace_id": "5ed6cf5e682562685928b0a227af039d" }
}
```

## 3. Authorization — Scopes

Enterprise API keys (generated in PF Expert → Developer Resources) are scope-based. Each key is
created with explicit scopes; **scopes and key configuration cannot be changed after creation** —
a new key must be generated to change them.

### Default scopes (always enabled, cannot be disabled)

| Area | Scope |
|---|---|
| Compliance | `compliances:read` |
| Listing Verification | `listing_verification:full_access` |
| Location | `locations:read` |
| Project | `projects:read` |
| Webhooks | `webhooks:full_access` |

### Optional scopes (enable/disable per integration)

| Area | Scopes |
|---|---|
| Users | `users:read`, `users:full_access` |
| Listings | `listings:read`, `listings:full_access` |
| Leads | `leads:read` |
| Credits | `credits:read` |
| Statistics | `statistics:read` |
| Roles | `roles:read` |

### Endpoint → minimum required scope

| Endpoint | Method | Scope Required |
|---|---|---|
| `/v1/auth/token` | POST | None |
| `/v1/users` | POST | `users:full_access` |
| `/v1/users` | GET | `users:read` |
| `/v1/users/{id}` | PATCH | `users:full_access` |
| `/v1/public-profiles/{id}` | PATCH | `users:full_access` |
| `/v1/public-profiles/{id}/submit-verification` | POST | `users:full_access` |
| `/v1/roles` | GET | `roles:read` |
| `/v1/listings` | POST | `listings:full_access` |
| `/v1/listings` | GET | `listings:read` |
| `/v1/listings/{id}` | PUT | `listings:full_access` |
| `/v1/listings/{id}` | DELETE | `listings:full_access` |
| `/v1/listings/{id}/publish` | POST | `listings:full_access` |
| `/v1/listings/{id}/unpublish` | POST | `listings:full_access` |
| `/v1/listings/{id}/publish/prices` | GET | `listings:read` |
| `/v1/listings/{id}/upgrades` | POST | `listings:full_access` |
| `/v1/listings/{id}/upgrades` | GET | `listings:read` |
| `/v1/floor-plans` | GET | `listings:read` |
| `/v1/floor-plans/{id}` | GET | `listings:read` |
| `/v1/leads` | GET | `leads:read` |
| `/v1/credits/balance` | GET | `credits:read` |
| `/v1/credits/transactions` | GET | `credits:read` |
| `/v1/credits/spent` | GET | `credits:read` |
| `/v1/compliances/{permitNumber}/{licenseNumber}` | GET | `compliances:read` |
| `/v1/listing-verifications` | GET | `listing_verification:full_access` |
| `/v1/listing-verifications` | POST | `listing_verification:full_access` |
| `/v1/listing-verifications/{submissionId}/resubmit` | POST | `listing_verification:full_access` |
| `/v1/listing-verifications/eligibility-check` | POST | `listing_verification:full_access` |
| `/v1/locations` | GET | `locations:read` |
| `/v1/projects/{id}` | GET | `projects:read` |
| `/v1/stats/public-profiles` | GET | `statistics:read` |
| `/v1/webhooks` | GET | `webhooks:full_access` |
| `/v1/webhooks` | POST | `webhooks:full_access` |
| `/v1/webhooks/{eventId}` | DELETE | `webhooks:full_access` |

### Webhook event scope requirements

Subscribing to a webhook event additionally requires the scope tied to that event's domain:

| Event Category | Event Types | Required Scope |
|---|---|---|
| Listings | `listing.published`, `listing.unpublished`, `listing.action`, `listing.publishFailed` | `listings:read` |
| Leads | `lead.created`, `lead.updated`, `lead.assigned` | `leads:read` |
| Users | `user.created`, `user.updated`, `user.deleted`, `user.activated`, `user.deactivated` | `users:read` |
| Public Profile | `publicProfile.verification.approved`, `publicProfile.verification.rejected` | `users:read` |

### Unauthorized scope access

Calling an endpoint or subscribing to an event type outside the key's granted scopes returns
`403 Forbidden`:

```json
{
  "type": "https://problems.atlas.propertyfinder.com/common-http-403-forbidden/",
  "code": "common_http_403-forbidden",
  "title": "Forbidden",
  "detail": "The server understood the request, but is refusing to fulfill it.",
  "status": 403,
  "attributes": { "trace_id": "5ed6cf5e682562685928b0a227af039d" }
}
```

### Key expiration

- Expiry is **mandatory** when generating a key; max validity is **365 days**.
- After expiry, the key is invalidated automatically and cannot be reused — a new key must be
  generated. Plan a key-rotation strategy ahead of the 365-day limit.

### Best practices (per PropertyFinder's own docs)

- Principle of least privilege — only request scopes the integration actually needs.
- Rotate keys before the 365-day expiry hits.
- Document clearly which scopes an integration requires when onboarding.

## 4. Rate Limiting

| Request Type | Limit | Example Operations |
|---|---|---|
| `POST /v1/auth/token` | 60 requests/minute | Issue JWT token |
| All other endpoints | 650 requests/minute | Create user, Search Listings, etc. |

Limits are applied **per IP address and per client** (other factors may also apply). Exceeding the
limit returns `429 Too Many Requests`, and the request can be safely retried after a delay.

**Best practices:** retry with incremental backoff + jitter; cache frequently-accessed data to
avoid duplicate calls.

## 5. Error Handling

Every error carries a stable, machine-readable code and a link to a catalog entry explaining it.

### Two response formats

- **Legacy format (current default).**
- **Structured `problem+json` format (RFC 9457-inspired)** — opt in by sending the header
  `X-PF-Error-Format: problem-json-v2`. Responses then include `type`, `code`, `status`, `title`,
  `detail`, an `attributes` object, and — for validation errors — a per-field `errors` array with
  JSON Pointers to the offending fields.

**This matters for the codebase:** the header is explicitly described as a *temporary, transitional
opt-in*. PropertyFinder's docs state the legacy shape is deprecated and the header "will be removed
in a future release, after which the new structured error format becomes the only error format."
**Recommendation: send `X-PF-Error-Format: problem-json-v2` on all requests now** and build error
parsing against the structured shape, rather than depending on the legacy format that's slated for
removal.

### Error catalog

Each error's `type` is a URI that resolves to a human-readable page describing when the error
occurs and how to resolve it, at `problems.atlas.propertyfinder.com`. Example:
`https://problems.atlas.propertyfinder.com/common-http-422-unprocessable-entity/` documents the
422 validation error. Don't try to hardcode every error code from the reference doc — look them up
in the catalog as needed.

## 6. Image Requirements

Operationally important — get these wrong and uploads silently fail or render incorrectly on the
PF site.

### Accepted file types

- JPEG/JPG (`image/jpeg`)
- PNG (`image/png`)
- WebP (`image/webp`)

### File size

- **Minimum:** 5 KB per image
- **Maximum:** 15 MB per image
- Images outside this range may fail to upload or process.

### Color space — the CMYK gotcha

| Supported | Not supported |
|---|---|
| sRGB (recommended), Adobe RGB, RGB | **CMYK** |

**CMYK is explicitly NOT supported.** CMYK images may appear oversaturated or show incorrect
colors on the Property Finder website. Convert CMYK images to sRGB before uploading.

### Aspect ratio and resolution

- Recommended orientation: **landscape** (e.g. 16:9, 4:3).
- Maximum resolution: **1920 × 1080 px**. Larger images are auto-resized to fit, preserving
  aspect ratio.

### Image URL requirements

- Must be publicly accessible or **signed URLs** — HTTPS only.
- Must remain valid and reachable for **at least 7 days** so PropertyFinder can reliably download
  and process them.
- Signed URLs with a limited expiry are supported and recommended for security.

### Egress IP addresses — required for firewall/WAF allowlisting

PropertyFinder downloads listing images from the following IP addresses. **Allowlist these** in
any firewall/WAF sitting in front of wherever listing images are served from, or downloads will be
blocked:

```
18.142.143.195/32
52.77.45.108/32
3.0.123.23/32
```

PropertyFinder notes these addresses **may change in the future** — worth periodically re-checking
against their docs rather than treating this as a permanent, unchanging list.

### Best practices (per PropertyFinder's own docs)

- Use sRGB color space.
- Maintain a 16:9 aspect ratio, landscape orientation.
- Prefer JPEG.
- Serve images through a managed CDN backed by durable object storage rather than directly from a
  web server or thin proxy — better caching, HTTP byte-range support, retries, and connection
  handling under concurrent downloads.
- Ensure URLs are reachable from PF's servers (not behind auth or IP-restricted firewalls, aside
  from the allowlisting above).
- Test image URLs before submitting listings, to catch failures early.

### Related schema history

As of a 2025-07-23 change, `media.images.items.original` and `.original.url` became **required**
on listing create/update, while `large`, `medium`, `thumbnail`, and `watermarked` request fields
were deprecated — then **removed entirely** on 2026-02-03 (breaking change, see §10). Only
`original` (and PF-generated `watermarked` in the *response*) should be used going forward.

## 7. Publishing a Listing — High-Level Flow

### General considerations

- Every listing must be associated with a **Public Profile** — the identity of the PF Expert user
  publicly shown as the listing's agent. Public profiles are linked to PF Expert users and can be
  retrieved via `GET /v1/users`.
- Every listing must reference a valid **Location** from PropertyFinder's location tree.
- Every listing must include **at least one image** meeting the Image Requirements above.
- Allowed **amenities** depend on both the listing's Property Type and Category (see the
  OpenAPI spec / raw reference for the full per-country enum tables — not duplicated here).
- Listing creation is a **two-step process**: create in draft (`POST /v1/listings`), then publish
  (`POST /v1/listings/{id}/publish`).

### Step-by-step

1. **Obtain Public Profile ID** — `GET /v1/users`, pick the desired `publicProfile.id`.
2. **Obtain Location ID** — `GET /v1/locations?search=<term>`. **Recommended:** let the end user
   pick the location manually (e.g. via an autocomplete), rather than auto-matching
   programmatically — manual selection avoids mis-assigning the listing to the wrong location.
3. **Create Listing (draft)** — `POST /v1/listings` with `publicProfileId`, `locationId`, and the
   rest of the required fields. Returns the new `listingId`.
4. *(Optional)* **Get Publishing Price** — `GET /v1/listings/{id}/publish/prices`.
5. **Publish Listing** — `POST /v1/listings/{id}/publish`.

### Listing publish is asynchronous — don't trust the 200 alone

A `200 OK` from the publish endpoint only confirms the **request was received**, not that the
listing actually went live. PropertyFinder's recommended flow:

1. **Subscribe to the publish webhook** (`listing.published`) *before* publishing.
2. **Publish** — `POST /v1/listings/{id}/publish` → immediate `200 OK` (accepted, not confirmed).
3. **Wait for the webhook.** If a success notification arrives within ~30 seconds, the listing is
   confirmed published.
4. **Fall back to polling if needed.** If no webhook arrives within 30–60 seconds, call
   `GET /v1/listings/{id}` (or search) to check the current state directly.

**Common pitfall called out explicitly in the docs:** do not mark a listing as "created"/"live" in
your CRM immediately upon receiving the `200 OK`. Publishing can still fail asynchronously, which
leads to state drift between the CRM and PF Expert if you don't reconcile via the webhook or a
follow-up GET.

### Country-specific required fields on listing create/update

**UAE (`AE`) listings** — required fields on `POST /v1/listings` / `PUT /v1/listings/{id}`:

| Field | Required if |
|---|---|
| `compliance` | `uaeEmirate` is `dubai` or `abu_dhabi` |
| `compliance.listingAdvertisementNumber` | `uaeEmirate` is `dubai` or `abu_dhabi` |
| `compliance.type` | `uaeEmirate` is `dubai` or `abu_dhabi` |
| `category`, `type`, `furnishingType`, `media.images.original`, `price`, `price.type`, `location`, `uaeEmirate`, `reference`, `title.en`, `description.en`, `size` | Always |
| `price.amounts` | Must include the amount matching `price.type` (e.g. `amounts.daily` for daily). For rental types, other `amounts.*` values are optional. |
| `downPayment` | `price.type = sale` |
| `bathrooms` | Listing type is not Land or Farm |
| `hasParkingSpace` | Listing type = `co-working-space` |

**Saudi Arabia (`KSA`) listings** — required fields, with REGA integration:

| Field | Required if |
|---|---|
| `compliance.listingAdvertisementNumber`, `compliance.userConfirmedDataIsCorrect`, `category`, `type`, `furnishingType`, `media.images.original`, `price.type`, `location`, `reference`, `title.en`, `description.en`, `size` | Always |
| `price.amounts` | Must include the amount matching `price.type`; other `amounts.*` optional for rentals |
| `price.downpayment` | `price.type = sale` |
| `bathrooms` | Listing type is not Land or Farm |
| `hasParkingSpace` | Listing type = `co-working-space` |

For KSA, **REGA (Real Estate General Authority) data silently overrides submitted values** on a
long list of fields (category, type, size, age, street direction/width, full location
tree/coordinates, price type/amounts, price obligation/value-affected flags, plot/land number).
See §8 below for the full override table — this is important because your app should not assume
its own submitted values for these fields survive round-trip unchanged for KSA listings.

**Optional `enhancements` field** (both AE and other listings): flags — `upgraded`, `extended`,
`landscaped`. All property types accept `upgraded`; `extended`/`landscaped` are only valid for
`villa`/`townhouse`. An invalid enum value is rejected with `400`; for other property types,
submitting `extended`/`landscaped` is silently dropped on write (not rejected) — only `upgraded`
is stored.

### Listing Verification workflow

Related to (but distinct from) the DLD/ADREC permit compliance flow — this covers PropertyFinder's
own agent/listing verification process:

- **`GET /v1/listing-verifications`** — paginated list of verification submissions; supports
  filtering by submission ID, listing ID/reference, agent broker ID, status, and date ranges, plus
  `include=document,history` to embed related documents/status-history without extra round trips.
- **`POST /v1/listing-verifications`** — submits a new verification with `listingId`,
  `publicProfileId`, and optional categorized supporting documents: `authorization`, `ownership`,
  `identification`, `representationPao`, `representationId`, `others`.
- **`POST /v1/listing-verifications/{submissionId}/resubmit`** — resubmits a previously
  **rejected auto submission only** (auto submissions are system-generated, requiring no manual
  documents). Moves the most recent rejected auto submission for that listing back to `pending`.
  Useful when the rejection reason was transient (e.g. a backend data mismatch since resolved).
- **`POST /v1/listing-verifications/eligibility-check`** — call this *before* creating/resubmitting
  a verification. Evaluates technical + business rules (location exclusions, quality score
  thresholds, agent/broker eligibility, duplicate-submission prevention) and returns:
  - `eligible` — whether the listing qualifies for verification at all.
  - `autoSubmit` — whether it qualifies for the no-documents-needed auto path.
  - `helpDetails` — present when `eligible` is `false`, explaining why and how to resolve it.

## 8. Region-Specific Compliance Rules

### PF Expert ⇄ API field name mapping

The UI labels in PF Expert don't match the API field names — this trips people up when reading
support tickets or PF Expert screenshots against API payloads:

| PF Expert Label | API Field Name | Context |
|---|---|---|
| Real Estate Company License Number | `issuingClientLicenseNumber` | Dubai |
| RERA Permit Number | `listingAdvertisementNumber` | Dubai |
| Broker License Number | `issuingClientLicenseNumber` | ADREC (Abu Dhabi) |
| ADREC Permit Number | `listingAdvertisementNumber` | ADREC (Abu Dhabi) |

### Dubai (DLD)

Under the Dubai Land Department's **DLD Strict Adherence** initiative, listings must accurately
reflect what's registered with the DLD (price, property type, location). The Enterprise API
mandates retrieving official permit details **before** creating or updating a Dubai listing.

**Special business rules:**

- DLD compliance is **mandatory** for Dubai listings.
- Permit ID and License Number must be obtained (via the compliance endpoint) before
  creating/updating listings.
- **Listing verification is triggered automatically** after publishing.
- Listings inside **DIFC and JAFZA are exempt** from DLD compliance and permit validation.
- Only **developer clients** may use project-level permits; **brokers must use unit-level
  permits**.

**High-level Dubai flow:**

1. `GET /v1/users` → Public Profile ID
2. `GET /v1/locations` → Location ID
3. `GET /v1/compliances/{permitNumber}/{licenseNumber}` → official permit details (requires
   `permitType`, `permitNumber`, `licenseNumber` — the company license number)
4. `POST /v1/listings` with the permit/license details populated from step 3
5. `POST /v1/listings/{id}/publish`
6. Listing Verification is triggered automatically

Retrieving permit details prevents discrepancies between the listing and official DLD records in
critical fields (price, location, property type) — mismatches there can cause listing rejection or
legal complications.

**DLD Listing Type enforcement.** Extract `data[].property.listingType` from the compliance
response; it constrains which `type` values are valid on the listing:

| DLD `listingType` | Allowed listing `type` values |
|---|---|
| Unit | Apartment, Duplex, Full Floor, Half Floor, Penthouse, Hotel Apartment, Office space, Business Center, Shop, Warehouse, Retail |
| Villa | Villa, Townhouse, Bungalow |
| Building | Compound, Whole Building, Bulk Units, Labor Camp, Office space, Retail, Shop, Showroom, Warehouse, Factory, Business Center, Coworking spaces, Staff Accommodation, Villa, Townhouse |
| Land | Land, Farm, Villa, Townhouse, Bungalow, Whole Building, Office space, Apartment, Warehouse, Retail |

**DLD Sale Type enforcement.** Extract `data[].property.saleType`; it determines the allowed
`projectStatus` on the listing:

| DLD `saleType` | Allowed `projectStatus` values | Meaning |
|---|---|---|
| Primary | `off_plan_primary`, `completed_primary` | First sale from developer (primary market) |
| Secondary | `off_plan`, `completed` | Resale property (secondary market) |
| `""` (empty) | Any of the four | Sale type not specified by DLD |

Example: `saleType = "Primary"` + under construction → `projectStatus = off_plan_primary`.
`saleType = "Secondary"` + ready → `projectStatus = completed`.

**Best practices / ongoing maintenance (Dubai):**

- Always populate listings from the *most recent* compliance-endpoint data.
- Update the DLD record first for any price/property-type change, then re-pull permit details via
  `GET /v1/compliances/...` before updating the listing via the API — never edit those fields
  API-side without the DLD being updated first.
- Periodically re-verify listings stay consistent with DLD records as regulations/details change.

### Abu Dhabi (ADREC)

Compliance is handled by the **Abu Dhabi Real Estate Center (ADREC)**, which enforces a valid
ADREC permit before a listing can go live.

**Special business rules:**

- ADREC compliance is **mandatory** for Abu Dhabi listings.
- Client type must be one of: `broker`, `property_management`, `developer`.
- **Sub-permit rules:** if a permit has sub-permits, the correct sub-permit must be supplied.
  **Only one (sub)permit can be used per live listing.**
- Unlike Dubai, **listing verification must be applied manually** after creation, with supporting
  documents.

**ADREC Offering Type enforcement.** The permit's `Permit Type` must align with the listing's
category/price type:

| ADREC Permit Type | Listing `category` | Listing `price.type` |
|---|---|---|
| Sale | `sale` | `sale` |
| Rent | `rent` | Rental type (`yearly`, `monthly`, `weekly`, `daily`) |

If they don't align, validation fails with an error like: *"Offering type check failed. Expected
sale, got rent"*. Always derive `category` from the ADREC permit's Permit Type and keep it in sync
across updates.

### Saudi Arabia (KSA) — REGA integration

The same category of gotcha as Dubai/ADREC above, and easy to miss: for KSA listings, **REGA (Real
Estate General Authority) data silently overrides submitted request values** on the following
fields when creating/updating a listing:

| Field | Override source |
|---|---|
| `category` | `regaData.category` |
| `type` | mapped from `regaData.type` |
| `size` | `regaData.property_size` |
| `age` | `regaData.property_age` |
| `street.direction` / `street.width` | `regaData.street_direction` / `regaData.street_width` |
| `location.id`, `location.full_name.{en,ar}`, `location.lat`, `location.lon`, `location.path` | derived from `regaData.location.*` |
| `price.type` | `regaData.offering_type === 'rent' ? 'yearly' : 'sale'` |
| `price.amounts` | auto-calculated from REGA data |
| `price.obligation.enabled` / `.comment` | from `regaData.price.obligation.*` if available, else must be provided in the request |
| `price.value_affected.enabled` / `.comment` | from `regaData.price.value_affected.*` if available, else must be provided |
| `plot_number` / `land_number` | `regaData.plot_number` / `regaData.land_number` |

**Important:** even if the request body sets these fields, REGA data replaces them on write to
ensure regulatory compliance. Fields REGA doesn't provide (e.g. `price.obligation`,
`price.value_affected`) must still be included in the request body — they're only optional when
REGA supplies them.

### Allowed categories / property types / amenities per country

The raw reference includes large per-country enum tables (UAE, Egypt, Bahrain, Saudi Arabia,
Qatar) mapping `category` → allowed `type` → allowed `amenities`. These are raw enum dumps with no
additional business logic beyond "this combination is valid/invalid" — refer directly to
`docs/portals/propertyfinder-openapi.json` (or the raw reference) for those tables rather than
duplicating them here, since they're purely enumerable and best consumed as data, not prose.

## 9. Webhook Events

Webhooks are HTTP callbacks (POST requests) fired when specific events occur — e.g. lead creation,
listing publish, user changes — so you don't have to poll.

### Delivery behavior

- **Response timeout:** your endpoint must respond within **5 seconds**, or the delivery is
  treated as failed and scheduled for retry.
- **Expected response:** any 2xx acknowledges receipt. Non-2xx, connection errors, or timeouts
  mark the delivery failed.
- **Concurrent delivery:** if one event matches multiple of your subscriptions, deliveries fire in
  parallel — don't assume any ordering between them.
- **At-least-once delivery:** failed deliveries are retried, so your endpoint **may receive the
  same event more than once**. Make handlers idempotent by de-duplicating on the event's `id`
  field.
- **Fast acknowledgement:** persist the payload and return quickly; do heavy processing
  asynchronously afterward to avoid tripping the 5-second timeout and triggering needless retries.
- **Subscription multiplicity:** you can create multiple subscriptions for the same event type;
  each is independent and receives its own delivery.

### Security — HMAC signature

If a `secret` was provided at subscription time, each delivery includes an HMAC-SHA256 signature
of the full event payload, computed with that secret, sent as a hex string in the `X-Signature`
header. No secret configured → no signature header is sent. Use this to verify payload authenticity
and integrity.

### Event reference

All webhook payloads share an envelope: `id` (uuid), `type`, `timestamp`, `entity` (id + type), and
`payload` (event-specific).

| Event | Required scope | Fires when | Notes |
|---|---|---|---|
| `user.created` | `users:read` | A new user is created | |
| `user.updated` | `users:read` | A user is updated | payload includes a `changes` array |
| `user.deleted` | `users:read` | A user is deleted | |
| `user.activated` | `users:read` | A user is activated | |
| `user.deactivated` | `users:read` | A user is deactivated | |
| `lead.created` | `leads:read` | A new lead is created | **Does not fire for new project leads** — those only emit `lead.assigned`/`lead.updated` |
| `lead.updated` | `leads:read` | A lead is updated | |
| `lead.assigned` | `leads:read` | A lead is assigned | Mainly used for project (Primary Plus) leads |
| `publicProfile.verification.approved` | `users:read` | Public profile verification approved | |
| `publicProfile.verification.rejected` | `users:read` | Public profile verification rejected | payload includes a `reason` |
| `listing.published` | `listings:read` | A listing is published | Empty payload — use this as the "publish succeeded" signal in the publish flow (§7) |
| `listing.unpublished` | `listings:read` | A listing is unpublished | Empty payload |
| `listing.action` | `listings:read` | A compliance/quality action is created, updated, or expires on a listing | See below — covers the full action lifecycle in one event type |
| `listing.publishFailed` | `listings:read` | A listing fails to publish (validation or platform failure) | Use alongside `listing.published` to close the loop on the async publish flow |

#### `listing.action` — compliance/quality action notifications

Fired for compliance or quality issues that violate business/regulatory rules; each action has a
grace period before automatic enforcement (e.g. unpublishing, permit revalidation) kicks in.

- **Status lifecycle** (`payload.status`): `pending` (newly created) → `dispute_created` (client
  disputed it) → `expired` (see `reason`).
- **Expiration reasons** (`payload.reason`, only when `status = expired`): `RESOLVED`,
  `ACTION_TIMEOUT`, `DISPUTE_ACCEPTED`, `DISPUTE_REJECTED`, `DANGLING_PARENT` (parent action
  expired because all child actions expired with none left pending).
- **`actionType`** by country:
  - KSA: `rega_invalid_permit`, `rega_expired_permit`
  - UAE/DLD: `incorrect_permit_type`, `unique_permit_type`, `invalid_permit_type`,
    `listing_trakheesi_invalid`, `listing_trakheesi_checks`, `project_permit_violation`
  - ADREC: `listing_adrec_expire_soon`, `listing_adrec_invalid`, `adrec_sub_permit_already_used`,
    `adrec_sub_permit_expired`, `adrec_sub_permit_required`, `adrec_sub_permits_exhausted`
  - Verification: `listing_unable_to_verify`
  - Agent license: `listing_invalid_brn`, `listing_invalid_bln`
  - Transactions: `claimed_transaction`, `listing_delist_transacted`
  - Common: `unavailable_property`, `listing_duplicate`, `listing_price_issue`,
    `listing_location_update_required`
- **`expireAction`** (optional) — what happens if unresolved by the deadline: `listing_unpublish`
  or `revalidate_permit`. Not every action defines one.
- **`remarks`** (optional) — free-text context from PF Support.

Examples from the docs: a DLD permit mismatch raises `listing_trakheesi_checks` (fix the permit
info or risk auto-unpublish); an incomplete location path (e.g. "Southwest Apartments" instead of
"Southwest Apartments 1") raises `listing_location_update_required` (fix it to protect the Quality
Score).

#### `listing.publishFailed`

Fires when a listing fails to publish due to validation failures or platform failures. Payload
includes a `failureType` enum (`validation.failed` or `feature.fulfillment.failed`) and an optional
`reasons` array of bilingual (en/ar) human-readable failure details. This is the negative-path
counterpart to `listing.published` in the async publish flow described in §7.

## 10. Notable Changelog Items

Only breaking changes / deprecations a future maintainer needs to know about — routine additive
changes (new optional fields, new filters) are omitted.

- **2026-07-08 — structured error format introduced.** Opt in per-request via
  `X-PF-Error-Format: problem-json-v2` (see §5). Legacy format is deprecated and will eventually
  be removed entirely — the header will stop being needed because it'll be the only format.
- **2026-07-08 — stricter phone validation.** `PATCH /v1/public-profiles/{id}`,
  `POST /v1/users`, and `PATCH /v1/users/{id}` now enforce the pattern
  `^\+?[0-9][0-9\s().-]{6,17}$` on `mobile`/`phone`/`phoneSecondary`/`whatsappPhone`. Existing
  malformed phone numbers in outgoing requests will now be rejected where they weren't before.
- **2026-02-03 — breaking removal of legacy image fields.** `media.images.items.large`,
  `.medium`, `.original.height`, `.original.width`, `.thumbnail`, and `.watermarked` were
  **removed** from the request schema on `POST /v1/listings` and `PUT /v1/listings/{id}` (they'd
  been deprecated since 2025-07-23, when `.original`/`.original.url` became required in their
  place). If any older integration code still sends these fields, it needs to be updated.
- **2025-12-18 — `callTracking` field on `GET /v1/users` deprecated, now always `null`.** It used
  to return call-tracking phone numbers. It stays in the schema for backwards compatibility but
  will be removed later — **stop relying on it and remove any logic depending on call-tracking
  data from this field.**
- **2025-05-18 — `plotSize` deprecated** on listing create/update/search, in favor of `size` (the
  general/plot area) and `builtUpArea` (UAE villa/townhouse/bungalow interior area specifically).
  Will be removed in a future version.
- **2025-11-10 — `listing.action` webhook documentation overhaul.** Went from a stub to full
  documentation of all 24 action types, status lifecycle, and expiration reasons (captured in §9
  above) — worth knowing this event existed before with much thinner docs, in case older
  integration code only partially handles it.
- **2025-06-29 / 2025-07-25 — new listing webhook events added:** `listing.publishFailed`
  (2025-06-29) and `listing.published` / `listing.unpublished` (2025-07-25). These are the events
  the recommended async publish flow (§7) depends on — any integration built before these dates
  would have had to poll instead.
- **2025-07-21 — `POST /v1/listings/{id}/unpublish` endpoint added.**
- **2025-07-16 — `GET /v1/listings/{id}/publish/prices` endpoint added.**
