# PropertyFinder Enterprise API — Full Reference

> The complete PropertyFinder Enterprise API reference, reformatted into clean Markdown from the
> vendor's documentation site. For the structured, machine-readable version of the same API, use
> [`propertyfinder-openapi.json`](propertyfinder-openapi.json). For a curated summary of just the
> business rules and operational gotchas, read
> [`propertyfinder-integration-notes.md`](propertyfinder-integration-notes.md) first — it's shorter
> and covers what you actually need day-to-day; come here only when you need full endpoint/schema
> detail.

---

## Table of Contents

- [Introduction](#introduction)
- [Authentication](#authentication)
- [Authorization — Enterprise API Keys](#authorization--enterprise-api-keys)
- [Rate Limiting](#rate-limiting)
- [Errors](#errors)
- [Image Requirements](#image-requirements)
- [Publishing a Listing](#publishing-a-listing)
- [Changelog](#changelog)
- [Auth](#auth)
- [Users](#users)
- [Roles](#roles)
- [Listings](#listings)
- [Floor Plans](#floor-plans)
- [Compliances](#compliances)
- [Listing Verifications](#listing-verifications)
- [Locations](#locations)
- [Leads](#leads)
- [Projects](#projects)
- [Statistics](#statistics)
- [Credits](#credits)
- [Webhooks](#webhooks)

---

## Introduction

**Enterprise API (1.0.1)**

Property Finder Enterprise API Gateway.

Property Finder provides a collection of APIs that enable you to integrate with our various products and services. Our APIs use JSON for request and response bodies and employ standard HTTP response codes. You can consume the APIs directly using any HTTP or REST library.

For any additional support or questions related to the integration, please contact us at integration.support@propertyfinder.ae.

**Usage Restrictions**

This API is intended strictly for server-to-server communication.

- Do not use this API directly from frontend applications (e.g., browsers, mobile apps).
- Do not use this API as a Backend-for-Frontend (BFF) for public or semi-public client apps.
- Requests should originate from secure, server-side environments only.

The following sections cover the topics below:

- Authentication
- Authorization - Enterprise API Keys
- Rate Limiting

## Authentication

When working with the API, you need to pass an access token in the `Authorization` header of all your requests. This will be in the form of a Bearer token, for example: `Bearer <ACCESS_TOKEN>`

### Obtaining the token

To obtain the token, you will need OAuth 2.0 credentials. Your OAuth 2.0 credentials consist of an API Key and an API Secret (corresponding to OAuth 2.0 client ID and client secret).

### Getting OAuth 2.0 credentials

To get your OAuth 2.0 credentials, open the PF Expert application, and log in. Once you are logged in, navigate to the API Credentials section under the Developer Resources tab in the left sidebar. From here, you can generate a new API key and API secret. Be sure to use the type as API Integration.

You can exchange these for an access token by calling the Issue JWT Token Endpoint. You can pass the API key and API secret in the request body.

- **API Key**: Your unique client identifier on PF Expert.
- **API Secret**: Your client secret, used for authentication when requesting an access token.

**Example request**

```bash
curl --location 'https://atlas.propertyfinder.com/v1/auth/token' \
--header 'Content-Type: application/json' \
--header 'Accept: application/json' \
--data '
{
"apiKey":"<API_KEY>",
"apiSecret":"<API_SECRET>"
}
'
```

The token server will return a Bearer `accessToken` in JSON Web Token (JWT) format which you should use in the `Authorization` header of your API requests.

**Example response**

```json
{
  "accessToken": "<ACCESS_TOKEN>",
  "expiresIn": 1800,
  "tokenType": "Bearer"
}
```

**Example request**

```bash
curl --location 'https://atlas.propertyfinder.com/v1/users?page=1&perPage=15' \
--header 'Accept: application/json' \
--header 'Authorization: Bearer <ACCESS_TOKEN>'
```

Your access token will be valid for the duration (in seconds) indicated by the `expiresIn` field in the response. When it expires, you'll need to request a new one. Currently, an issued access token will expire in 30 minutes. Once a token expires, you must request a new one. No refresh token flow is supported in this integration.

### Unauthorized Requests

If you attempt to access a protected resource without valid authorization you will receive a `401 Unauthorized` or `403 Forbidden` HTTP error.

```
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json
```

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

## Authorization — Enterprise API Keys

Enterprise API keys are generated in PF Expert > Developer Resources and provide authenticated access to the PF API. API keys support scope-based authorization and enforced expiration to control access and manage key lifecycle.

### Authorization

- Each API key is created with explicitly assigned scopes.
- Scopes define which API endpoints and operations the key is authorized to access.
- Requests made to endpoints outside the assigned scopes are rejected.
- Once API keys are created, their scopes and configuration cannot be modified.

### Default Scopes

The following scopes are enabled by default and cannot be disabled:

- Compliance: `compliances:read`
- Listing Verification: `listing_verification:full_access`
- Location: `locations:read`
- Project: `projects:read`
- Webhooks: `webhooks:full_access`

### Optional Scopes

The following scopes can be enabled or disabled based on integration requirements:

- Users: `users:read`, `users:full_access`
- Listings: `listings:read`, `listings:full_access`
- Leads: `leads:read`
- Credits: `credits:read`
- Statistics: `statistics:read`
- Roles: `roles:read`

### Endpoint Scope Requirements

- Each API endpoint requires a minimum scope.
- Required scopes are documented at both:
  - The endpoint level
  - The Endpoint-to-Scope Mapping section
- Possession of a valid API key alone does not grant access unless the required scope is enabled.

### Expiration

- Expiry is required when generating a new API key.
- The maximum validity period for an API key is 365 days.
- After expiry, the API key is automatically invalidated and cannot be reused.
- A new API key must be generated to restore API access.

### Endpoint-to-Scope Mapping

The minimum scope access required to access each endpoint is listed below. Scope requirements are also documented at the individual endpoint level.

| Name | Method | Endpoint | Scope Required |
|---|---|---|---|
| Issue JWT Token | POST | `/v1/auth/token` | No scope required |
| Create User | POST | `/v1/users` | `users:full_access` |
| Search Users | GET | `/v1/users` | `users:read` |
| Update Private Profile | PATCH | `/v1/users/{id}` | `users:full_access` |
| Update Public Profile | PATCH | `/v1/public-profiles/{id}` | `users:full_access` |
| Submit Verification Request | POST | `/v1/public-profiles/{id}/submit-verification` | `users:full_access` |
| Fetch Roles | GET | `/v1/roles` | `roles:read` |
| Creates a New Listing | POST | `/v1/listings` | `listings:full_access` |
| Search Listings | GET | `/v1/listings` | `listings:read` |
| Updates an Existing Listing | PUT | `/v1/listings/{id}` | `listings:full_access` |
| Deletes a Listing | DELETE | `/v1/listings/{id}` | `listings:full_access` |
| Publish Listing | POST | `/v1/listings/{id}/publish` | `listings:full_access` |
| Unpublish Listing | POST | `/v1/listings/{id}/unpublish` | `listings:full_access` |
| Get Listing Publish Price | GET | `/v1/listings/{id}/publish/prices` | `listings:read` |
| Upgrade Listing | POST | `/v1/listings/{id}/upgrades` | `listings:full_access` |
| Available Upgrades | GET | `/v1/listings/{id}/upgrades` | `listings:read` |
| List Floor Plans | GET | `/v1/floor-plans` | `listings:read` |
| Get Floor Plan | GET | `/v1/floor-plans/{id}` | `listings:read` |
| Fetch Leads | GET | `/v1/leads` | `leads:read` |
| Get Credit Balance | GET | `/v1/credits/balance` | `credits:read` |
| Get Transaction History | GET | `/v1/credits/transactions` | `credits:read` |
| Get Credits Spent | GET | `/v1/credits/spent` | `credits:read` |
| Get Permit by Number & License | GET | `/v1/compliances/{permitNumber}/{licenseNumber}` | `compliances:read` |
| Listing Verification Submissions | GET | `/v1/listing-verifications` | `listing_verification:full_access` |
| Submit Listing Verification | POST | `/v1/listing-verifications` | `listing_verification:full_access` |
| Resubmit Listing Submission | POST | `/v1/listing-verifications/{submissionId}/resubmit` | `listing_verification:full_access` |
| Listing Eligibility Check | POST | `/v1/listing-verifications/eligibility-check` | `listing_verification:full_access` |
| Locations List | GET | `/v1/locations` | `locations:read` |
| Get Project Details | GET | `/v1/projects/{id}` | `projects:read` |
| Get Public Profile Statistics | GET | `/v1/stats/public-profiles` | `statistics:read` |
| List Events | GET | `/v1/webhooks` | `webhooks:full_access` |
| Subscribe to Event | POST | `/v1/webhooks` | `webhooks:full_access` |
| Delete Event Subscription | DELETE | `/v1/webhooks/{eventId}` | `webhooks:full_access` |

### Webhook Event-Based Permissions

When subscribing to webhook events, additional scope requirements apply based on the event type.

**Required Scope by Event Type:**

| Event Category | Event Types | Required Scope |
|---|---|---|
| Listings events | `listing.published`, `listing.unpublished`, `listing.action`, `listing.publishFailed` | `listings:read` |
| Leads events | `lead.created`, `lead.updated`, `lead.assigned` | `leads:read` |
| Users events | `user.created`, `user.updated`, `user.deleted`, `user.activated`, `user.deactivated` | `users:read` |
| Public Profile events | `publicProfile.verification.approved`, `publicProfile.verification.rejected` | `users:read` |

### Unauthorised Scope Access

If you attempt to access an endpoint or event type without the required scope, you will receive a `403 Forbidden` HTTP error:

```
HTTP/1.1 403 Forbidden
Content-Type: application/problem+json
```

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

### Best Practices

- **Principle of Least Privilege**: Only request scopes that your integration actually needs.
- **Key Rotation**: Plan for key expiration by implementing a key rotation strategy before the 365-day limit.
- **Scope Documentation**: When onboarding clients, clearly communicate which scopes your integration requires.

## Rate Limiting

To ensure fair use and maintain high availability of our APIs, we enforce rate limiting on all requests made to our endpoints.

### Default Rate Limits

Unless otherwise specified, all clients are subject to the following default limits:

| Request Type | Limit | Example Operations |
|---|---|---|
| Issue JWT Token endpoint | 60 requests per minute | Issue JWT token |
| All other endpoints | 650 requests per minute | Create user, Search Listings, etc. |

Note: The rate limits are applied per IP address and per client. Other factors may also be considered.

If you exceed your allotted rate limit, you will receive a `429 Too Many Requests` HTTP response. The request can then be safely retried after some time. Example:

```
HTTP/1.1 429 Too Many Requests
```

### Best Practices

- To avoid frequently hitting the rate limit, retry requests using an incremental backoff with jitter.
- Cache responses for frequently accessed data to reduce duplicate API calls.

## Errors

Every error carries a stable, machine-readable code and links to a catalog entry that explains it.

### Formats

By default the API returns Property Finder's legacy error shape. To opt in to a clearer, structured error format (inspired by RFC 9457, served as `application/problem+json`), send the header `X-PF-Error-Format: problem-json-v2`. A response includes a `code`, a `type` URI, the HTTP `status`, and optionally, a per-field `errors` array with JSON Pointers to the offending fields.

The header is a temporary, transitional option. It exists only to let you migrate at your own pace. It will be removed in a future release, after which the new structured error format becomes the only error format. Adopt it now and treat the legacy shape as deprecated.

### Error catalog

Each type URI resolves to a human-readable catalog page describing the error, when it occurs, and how to resolve it. Browse the full catalog at problems.atlas.propertyfinder.com.

For example, https://problems.atlas.propertyfinder.com/common-http-422-unprocessable-entity/ documents the 422 validation error.

## Image Requirements

When uploading images for listings or other resources, please ensure your images meet the following technical requirements to ensure optimal display quality and prevent processing issues.

### Accepted File Types

The following image formats are supported:

- JPEG/JPG (`image/jpeg`)
- PNG (`image/png`)
- WebP (`image/webp`)

### File Size

- Minimum: 5 KB per image
- Maximum: 15 MB per image

Images outside this range may fail to upload or process correctly.

### Color Space Requirements

Supported color spaces:

- sRGB (recommended)
- Adobe RGB
- RGB

Not supported:

- CMYK

Important: CMYK color space is NOT supported. Images using CMYK may appear oversaturated or display incorrect colors when shown on the Property Finder website. Please convert CMYK images to sRGB before uploading to ensure accurate color representation.

### Aspect Ratio and Resolution

Recommended aspect ratio:

- Landscape orientation (e.g., 16:9, 4:3)

Maximum resolution:

- 1920 x 1080 pixels

Images with higher resolutions will be automatically resized to fit within these dimensions while maintaining aspect ratio.

### Image URL Requirements

- Images must be accessible via publicly accessible URLs or signed URLs
- URLs must use HTTPS protocol
- URLs must remain valid and accessible for at least 7 days to allow our system to reliably download and process the images
- Signed URLs with limited expiry are supported and recommended for security

Property Finder downloads images from the following egress IP addresses. Please add them to your firewall / WAF allowlist so image downloads are not blocked:

- 18.142.143.195/32
- 52.77.45.108/32
- 3.0.123.23/32

These addresses may change in the future.

### Best Practices

- Use sRGB color space for best results across all devices and browsers
- Maintain 16:9 aspect ratio
- Use JPEG image format
- Use landscape orientation for property images to ensure proper display
- Ensure URLs are accessible from our servers (not behind firewalls or requiring authentication)
- Test your image URLs before submitting to avoid upload failures
- Serve assets through a managed CDN backed by durable object storage, rather than directly from a web server (e.g. Apache) or a thin proxy — this improves delivery reliability under high concurrency, with better caching, HTTP byte-range support, retries, and connection handling

## Publishing a Listing

### General Considerations

Every listing must be associated with a Public Profile representing the identity of a PF Expert user responsible for the listing, as displayed publicly on the Property Finder website. Public profiles are associated with PF Expert users, and can be retrieved using the `[GET] /v1/users` endpoint.

Every listing must be associated with a valid Location from Property Finder's location tree.

Every listing must include at least one image that meets our Image Requirements.

The list of accepted amenities depends on both the Property Type and Category of the listing.

- See country-specific rules below for allowed combinations.

The listing creation process is split into two steps:

1. Creating the listing in draft mode (`[POST] /v1/listings`)
2. Publishing the listing (`[POST] /v1/listings/{id}/publish`)

### High-Level Flow

**1. Obtain Public Profile Id**

Call `[GET] /v1/users` to retrieve available users and their public profiles. Select the appropriate `publicProfile.id`.

```json
{
  "publicProfile": {
    "id": 216582
  }
}
```

**2. Obtain Location ID**

Call `[GET] /v1/locations?search=Marina` to retrieve the valid location and obtain the correct id.

Recommended: The location should be selected manually by the user from the returned results (for example, through an autocomplete component) rather than auto-matched programmatically. Manual selection ensures 100% accuracy and avoids assigning the listing to the wrong location.

```json
{
  "data": [
    {
      "coordinates": {
        "lat": 25.078367,
        "lng": 55.14041
      },
      "id": 50,
      "name": "Dubai Marina"
    }
  ]
}
```

**3. Create Listing (Draft Mode)**

Call (`[POST] /v1/listings`) to create a new listing in draft state, providing the required data including `publicProfileId` and `locationId`. The response will return the newly created `listingId`.

**4. (Optional) Get Publishing Price**

Call `[GET] /v1/listings/{id}/publish/prices` to retrieve the price to publish the listing.

**5. Publish Listing**

Call `[POST] /v1/listings/{id}/publish` to publish the listing and make it publicly available on the Property Finder website.

**Listing Publish Flow**

Note: Listing publishing is an asynchronous process. A `200 OK` response only confirms that the request was received, not that the listing was successfully published.

Recommended Flow:

1. **Subscribe to the Publish Webhook** — Subscribe to the Publish Webhook. This webhook notifies you when a listing has been successfully published.
2. **Publish the listing** — Send a POST request to publish the listing by calling the Publish Listing Endpoint. You will receive an immediate `200 OK` response (request accepted).
3. **Wait for Webhook Notification** — If you receive a success notification within 30 seconds, the listing is confirmed as published.
4. **Verify Listing API if Needed** — If no webhook notification is received within 30–60 seconds, call the GET Listing API to verify the current listing status.

Common Pitfall:

- Do not mark listings as created immediately after receiving a `200 OK` response.
- In some cases, the listing may fail to publish, leading to inconsistencies between CRM system and PF Expert.
- Implementing the above flow helps ensure accurate status tracking and resolves missing listings issues.

### Compliance: PF Expert ⇄ API Field Name Mapping

The following table shows how field names differ between the UI and the API for Dubai and ADREC (Abu Dhabi) contexts:

| PF Expert Label | API Field Name | Context |
|---|---|---|
| Real Estate Company License Number | `issuingClientLicenseNumber` | Dubai |
| RERA Permit Number | `listingAdvertisementNumber` | Dubai |
| Broker License Number | `issuingClientLicenseNumber` | ADREC (Abu Dhabi) |
| ADREC Permit Number | `listingAdvertisementNumber` | ADREC (Abu Dhabi) |

### Region-Specific Flows

#### UAE — Dubai

To ensure compliance with the Dubai Land Department's (DLD) regulations, particularly under the DLD Strict Adherence initiative, it's imperative that all property listings on Property Finder accurately reflect the details registered with the DLD. This includes critical information such as price, property type, and location.

To facilitate this, our Enterprise API provides a structured workflow that mandates the retrieval of official permit details before creating or updating any listing.

**Special Business Rules**

- Dubai Land Department (DLD) compliance is mandatory for listings in Dubai.
- Permit ID and License Number must be obtained before creating or updating listings.
- Listing verification is automatically triggered after publishing.
- Listings located within DIFC and JAFZA are exempt from DLD compliance and permit validation.
- Only developer clients may use project-level permits to publish listings; brokers must obtain unit-level permits.

**High-Level UAE Flow (Dubai-specific)**

1. Retrieve Public Profile ID (`[GET] /v1/users`)
2. Retrieve Location ID (`[GET] /v1/locations`)
3. Retrieve Permit Details (`[GET] /v1/compliances/{permitNumber}/{licenseNumber}`)
4. Create Listing (`[POST] /v1/listings`) with permit and license details
5. Publish Listing (`[POST] /v1/listings/{id}/publish`)
6. Listing Verification is triggered automatically

**Step 3 — Retrieve Official Permit Details**

- Endpoint: `[GET] /v1/compliances/{permitNumber}/{licenseNumber}`
- Required Parameters:
  - `permitType`
  - `permitNumber`
  - `licenseNumber` (company license number)
- Purpose: Retrieve latest official DLD permit data to ensure that the listing aligns with official records.
- Why: Prevent discrepancies in critical fields like price, location, and property type. Any discrepancies between your listing and the DLD data can lead to listing rejection or legal complications.

**DLD Listing Type Enforcement**

From the compliance response, extract `data[].property.listingType`.

This value defines the official property classification and must be mapped to a valid type when creating a listing.

Mapping: `listingType` → allowed listing type values

| DLD Listing Type | Allowed Listing Type Values |
|---|---|
| Unit | Apartment, Duplex, Full Floor, Half Floor, Penthouse, Hotel Apartment, Office space, Business Center, Shop, Warehouse, Retail |
| Villa | Villa, Townhouse, Bungalow |
| Building | Compound, Whole Building, Bulk Units, Labor Camp, Office space, Retail, Shop, Showroom, Warehouse, Factory, Business Center, Coworking spaces, Staff Accommodation, Villa, Townhouse |
| Land | Land, Farm, Villa, Townhouse, Bungalow, Whole Building, Office space, Apartment, Warehouse, Retail |

Example: If DLD `listingType` = "Unit", valid listing type values include: "Apartment", "Duplex", "Penthouse", etc.

**DLD Sale Type Enforcement**

From the `[GET] /v1/compliances/{permitNumber}/{licenseNumber}` response, extract `data[].property.saleType`.

This value indicates the market type of the property (primary or secondary market) and should be used to determine the listing's `projectStatus` field.

- **Primary**: First sale from developer (primary market)
- **Secondary**: Resale property (secondary market)
- **Empty string**: Sale type not specified by DLD - any `projectStatus` can be selected

Mapping: `saleType` → `projectStatus` values

| DLD `saleType` | `projectStatus` values |
|---|---|
| Primary | `off_plan_primary`, `completed_primary` |
| Secondary | `off_plan`, `completed` |
| `""` (empty) | Any (`off_plan`, `off_plan_primary`, `completed`, `completed_primary`) |

Example: If DLD `saleType` = "Primary" and property is under construction, set `projectStatus` to `off_plan_primary`. If DLD `saleType` = "Secondary" and property is ready, set `projectStatus` to `completed`. If DLD `saleType` = "" (empty), you may select any appropriate `projectStatus` based on the property's actual state.

**Step 4 — Create Listing**

- Use retrieved permit data to populate all regulated fields.
- Ensure that the listing type matches the value allowed by the DLD `listingType`.

**Best Practices**

- Always use the most recent data obtained from the compliance endpoint to populate your listing.
- Avoid manual alterations to critical fields like price or property type without first updating them with the DLD and retrieving the new permit details.
- Ensure that all mandatory fields are accurately filled to prevent listing rejections.

**Ongoing Maintenance and Updates**

- **Price or Detail Changes**: Before making any changes to listing details via the API, ensure the information is first updated with the DLD. Once updated, use the `GET /v1/compliances/` endpoint to retrieve the latest permit details and then update your listing accordingly.
- **Regular Verification**: Periodically verify that your listings remain consistent with DLD records, especially if there are changes in regulations or property details.

#### UAE — Abu Dhabi

In Abu Dhabi, compliance is handled under the Abu Dhabi Real Estate Center (ADREC). ADREC enforces the presence and validity of the ADREC permit before listings can go live.

**Special Business Rules**

- ADREC compliance is mandatory for listings in Abu Dhabi.
- Client type must be one of: `broker`, `property_management`, or `developer`.
- Sub-permit rules apply: if the given permit has sub-permits, the correct sub-permit must be provided in the request. Only one (sub)permit can be used per live listing.
- Listing verification must be applied manually after creation, with supporting documents provided.

**ADREC Offering Type Enforcement**

This indicates the offering type and must align with ADREC Permit Type.

Mapping: Permit Type → listing data

| ADREC Permit Type | listing `category` | listing `price.type` |
|---|---|---|
| Sale | `sale` | `sale` |
| Rent | `rent` | Rental type (e.g., `rent`, `yearly`, `monthly`, `weekly`, `daily`) |

Example: If ADREC Permit Type = "Sale", the listing offering type must be `sale`.

**Validation**

- Error message/action: example error detail: "Offering type check failed. Expected sale, got rent"
- How to avoid failure: Always derive `category` from the ADREC permit Permit Type, and keep them in sync when creating or updating the listing.

### Region-Specific Rules — Allowed Categories, Property Types & Amenities

#### UAE

| Category | Allowed Property Types | Allowed Amenities |
|---|---|---|
| commercial | farm, land | No amenities allowed |
| commercial | bulk-rent-unit, bulk-sale-unit, business-center, co-working-space, factory, full-floor, half-floor, labor-camp, office-space, retail, shop, show-room, staff-accommodation, villa, warehouse, whole-building | shared-gym, covered-parking, networked, shared-pool, dining-in-building, conference-room, lobby-in-building, vastu-compliant |
| residential | land | No amenities allowed |
| residential | apartment, bulk-rent-unit, bulk-sale-unit, bungalow, compound, duplex, full-floor, half-floor, hotel-apartment, penthouse, townhouse, villa, whole-building | central-ac, built-in-wardrobes, kitchen-appliances, security, concierge, maid-service, balcony, private-gym, shared-gym, private-jacuzzi, shared-spa, covered-parking, maids-room, study, childrens-play-area, pets-allowed, barbecue-area, shared-pool, childrens-pool, private-garden, private-pool, view-of-water, view-of-landmark, walk-in-closet, lobby-in-building, vastu-compliant |

#### Egypt

| Category | Allowed Property Types | Allowed Amenities |
|---|---|---|
| commercial | farm, land | No amenities allowed |
| commercial | bulk-rent-unit, bulk-sale-unit, cafeteria, clinic, co-working-space, factory, full-floor, half-floor, hotel-apartment, villa, medical-facility, office-space, restaurant, retail, shop, show-room, staff-accommodation, villa, warehouse, whole-building | shared-gym, covered-parking, networked, dining-in-building, conference-room, lobby-in-building |
| residential | land | No amenities allowed |
| residential | apartment, bulk-rent-unit, bulk-sale-unit, bungalow, cabin, chalet, duplex, full-floor, half-floor, hotel-apartment, villa, palace, penthouse, roof, townhouse, twin-house, villa, whole-building | central-ac, built-in-wardrobes, kitchen-appliances, security, balcony, shared-gym, shared-spa, covered-parking, maids-room, study, shared-pool, childrens-pool, private-garden, private-pool, view-of-water, view-of-landmark, walk-in-closet, lobby-in-building |

#### Bahrain

| Category | Allowed Property Types | Allowed Amenities |
|---|---|---|
| commercial | land | No amenities allowed |
| commercial | bulk-rent-unit, bulk-sale-unit, hotel-apartment, labor-camp, medical-facility, office-space, retail, shop, show-room, staff-accommodation, warehouse, whole-building | central-ac, security, balcony, shared-gym, covered-parking, networked, shared-pool, private-garden, private-pool, view-of-water, dining-in-building, conference-room, lobby-in-building |
| residential | land | No amenities allowed |
| residential | apartment, bulk-rent-unit, bulk-sale-unit, bungalow, chalet, compound, duplex, hotel-apartment, penthouse, townhouse, villa, whole-building | central-ac, built-in-wardrobes, kitchen-appliances, security, concierge, maid-service, balcony, private-gym, shared-gym, private-jacuzzi, shared-spa, covered-parking, maids-room, study, childrens-play-area, pets-allowed, barbecue-area, shared-pool, childrens-pool, private-garden, private-pool, view-of-water, view-of-landmark, walk-in-closet, lobby-in-building |

#### Saudi Arabia

| Category | Allowed Property Types | Allowed Amenities |
|---|---|---|
| commercial | factory, office-space, shop, show-room, warehouse, whole-building | central-ac, security, balcony, shared-gym, covered-parking, networked, view-of-water, view-of-landmark, dining-in-building, conference-room, lobby-in-building, electricity, waters, sanitation, no-services, fixed-phone, fibre-optics, flood-drainage |
| commercial | farm, land | electricity, waters, sanitation, no-services, fixed-phone, fibre-optics, flood-drainage |
| residential | apartment, chalet, compound, full-floor, rest-house, villa, whole-building | central-ac, built-in-wardrobes, kitchen-appliances, security, concierge, private-gym, shared-gym, private-jacuzzi, shared-spa, covered-parking, maids-room, barbecue-area, shared-pool, childrens-pool, private-garden, private-pool, view-of-water, walk-in-closet, lobby-in-building, electricity, waters, sanitation, no-services, fixed-phone, fibre-optics, flood-drainage |
| residential | farm, land | electricity, waters, sanitation, no-services, fixed-phone, fibre-optics, flood-drainage |

#### Qatar

| Category | Allowed Property Types | Allowed Amenities |
|---|---|---|
| commercial | land | No amenities allowed |
| commercial | bulk-rent-unit, bulk-sale-unit, labor-camp, office-space, retail, shop, show-room, staff-accommodation, villa, warehouse, whole-building | central-ac, security, balcony, shared-gym, covered-parking, networked, shared-pool, private-garden, private-pool, view-of-water, dining-in-building, conference-room, lobby-in-building |
| residential | land | No amenities allowed |
| residential | apartment, bulk-rent-unit, bulk-sale-unit, compound, duplex, hotel-apartment, penthouse, townhouse, villa, whole-building | central-ac, built-in-wardrobes, kitchen-appliances, security, concierge, maid-service, balcony, private-gym, shared-gym, private-jacuzzi, shared-spa, covered-parking, maids-room, study, childrens-play-area, pets-allowed, barbecue-area, shared-pool, childrens-pool, private-garden, private-pool, view-of-water, view-of-landmark, walk-in-closet, lobby-in-building |

## Changelog

### 2026-07-23

**GET /v1/credits/spent**
- endpoint added

### 2026-07-22

**DELETE /v1/listings/{id}**
- added the non-success response with the status '409'

**PUT /v1/listings/{id}**
- added the non-success response with the status '409'

### 2026-07-20

**GET /v1/credits/transactions**
- added the new optional 'query' request parameter 'listingSearch'

### 2026-07-08

**All endpoints — error responses**
- Introduced a clearer, structured error format (inspired by RFC 9457, served as `application/problem+json`) across all endpoints. Opt in per request with the header `X-PF-Error-Format: problem-json-v2`; a response then carries `type`, `title`, `code`, `status`, `detail`, an optional per-field `errors` array with JSON Pointers to the offending fields, and an `attributes` object. Each type URI resolves to a page in the error catalog at https://problems.atlas.propertyfinder.com. The header is a temporary opt-in to ease the transition and will be removed later, after which this structured format becomes the only error format.

**GET /v1/leads**
- added the non-success response with the status '422'

**PATCH /v1/public-profiles/{id}**
- !WARNING! added the pattern `^+?[0-9][0-9\s().-]{6,17}$` to the request property `/allOf[#/components/schemas/public_profile]/phone`
- !WARNING! added the pattern `^+?[0-9][0-9\s().-]{6,17}$` to the request property `/allOf[#/components/schemas/public_profile]/phoneSecondary`
- !WARNING! added the pattern `^+?[0-9][0-9\s().-]{6,17}$` to the request property `/allOf[#/components/schemas/public_profile]/whatsappPhone`

**POST /v1/users**
- !WARNING! added the pattern `^+?[0-9][0-9\s().-]{6,17}$` to the request property `mobile`
- !WARNING! added the pattern `^+?[0-9][0-9\s().-]{6,17}$` to the request property `publicProfile/allOf[#/components/schemas/public_profile]/phone`
- !WARNING! added the pattern `^+?[0-9][0-9\s().-]{6,17}$` to the request property `publicProfile/allOf[#/components/schemas/public_profile]/phoneSecondary`
- !WARNING! added the pattern `^+?[0-9][0-9\s().-]{6,17}$` to the request property `publicProfile/allOf[#/components/schemas/public_profile]/whatsappPhone`

**PATCH /v1/users/{id}**
- !WARNING! added the pattern `^+?[0-9][0-9\s().-]{6,17}$` to the request property `mobile`

### 2026-07-01

**POST /v1/webhooks**
- added the non-success response with the status '409'
- added the non-success response with the status '422'

### 2026-06-30

**GET /v1/leads**
- !WARNING! added the new 'whatsappUsername' enum value to the 'data/items/sender/contacts/items/type' response property for the response status '200'
- added the new optional 'query' request parameter 'senderWhatsappUsername'

**Webhook Events (lead.\*)**
- added the new `whatsappUsername` value to the `sender.contacts[].type` enum; WhatsApp leads that have a username now include a `{ "type": "whatsappUsername", "value": "..." }` contact in the delivered webhook payload

### 2026-06-29

**Webhook Events**
- added new webhook event `listing.publishFailed`: triggered when a listing fails to publish to the Property Finder platform; the payload includes a `failureType` enum (`validation.failed` or `feature.fulfillment.failed`) and an optional `reasons` array with bilingual (en/ar) human-readable failure details

**POST /v1/webhooks**
- added the new 'listing.publishFailed' enum value to the request property 'eventId'

### 2026-06-17

**POST /v1/listings**
- added the new optional request property 'enhancements'
- added the optional property 'enhancements' to the response with the '200' status

**PUT /v1/listings/{id}**
- added the new optional request property 'enhancements'
- added the optional property 'enhancements' to the response with the '200' status

**GET /v1/listings**
- added the optional property 'results/items/enhancements' to the response with the '200' status

### 2026-06-09

**GET /v1/credits/transactions**
- the `createdAtFrom` and `createdAtTo` query parameters now default to the last 90 days when both are omitted
- when only one of `createdAtFrom` / `createdAtTo` is provided, the other bound is derived to form a 90-day window
- the interval between `createdAtFrom` and `createdAtTo` must not exceed 90 days; wider ranges now return a 400
- `createdAtFrom` later than `createdAtTo` now returns a 400

### 2026-06-04

**GET /v1/compliances/{permitNumber}/{licenseNumber}**
- added the optional property 'data/items/property/builtUpArea' to the response with the '200' status

### 2026-05-18

**POST /v1/listings**
- the `plotSize` request property has been deprecated and will be removed in a future version. Use `size` for the general/plot area and `builtUpArea` for the UAE villa/townhouse/bungalow interior area.

**PUT /v1/listings/{id}**
- the `plotSize` request property has been deprecated and will be removed in a future version. Use `size` for the general/plot area and `builtUpArea` for the UAE villa/townhouse/bungalow interior area.

**GET /v1/listings**
- the `results/items/plotSize` response property has been deprecated and will be removed in a future version. Use `results/items/size` for the general/plot area and `results/items/builtUpArea` for the UAE villa/townhouse/bungalow interior area.

### 2026-05-13

**GET /v1/listing-verifications**
- !WARNING! the response property 'submissions/items/documents/items/contentLength' has been deprecated and will be removed in a future release
- !WARNING! the response property 'submissions/items/documents/items/contentType' has been deprecated and will be removed in a future release
- !WARNING! the response property 'submissions/items/documents/items/expiresAt' has been deprecated and will be removed in a future release
- !WARNING! the response property 'submissions/items/documents/items/presignedUrl' has been deprecated and will be removed in a future release

### 2026-04-15

**GET /v1/floor-plans**
- endpoint added

**GET /v1/floor-plans/{id}**
- endpoint added

### 2026-04-03

**GET /v1/credits/transactions**
- added the new optional 'query' request parameter 'type'
- added the optional property 'data/items/transactionInfo/type' to the response with the '200' status

### 2026-03-31

**GET /v1/listings**
- added the optional property 'results/items/builtUpArea' to the response with the '200' status

**POST /v1/listings**
- added the new optional request property 'builtUpArea'
- added the optional property 'builtUpArea' to the response with the '200' status

**PUT /v1/listings/{id}**
- added the new optional request property 'builtUpArea'
- added the optional property 'builtUpArea' to the response with the '200' status

### 2026-03-24

**GET /v1/listings**
- added the optional property 'results/items/rnpm' to the response with the '200' status

**POST /v1/listings**
- added the optional property 'rnpm' to the response with the '200' status

**PUT /v1/listings/{id}**
- added the optional property 'rnpm' to the response with the '200' status

### 2026-03-17

**GET /v1/listings/{id}/upgrades**
- added the new optional 'query' request parameter 'includeBundles'

### 2026-03-11

**GET /v1/wallets/balance**
- endpoint added

### 2026-02-25

**GET /v1/stats/public-profiles-arena-ranking**
- endpoint added

**GET /v1/stats/top-public-profiles**
- endpoint added

**GET /v1/stats/superagent-stats**
- endpoint added

### 2026-02-13

**GET /v1/listings/{id}/publish/prices**
- removed the non-success response with the status '400'

### 2026-02-05

**POST /v1/listings**
- added the optional property 'media/images/items/original/error' to the response with the '200' status
- added the optional property 'media/images/items/watermarked/error' to the response with the '200' status

**PUT /v1/listings/{id}**
- added the optional property 'media/images/items/original/error' to the response with the '200' status
- added the optional property 'media/images/items/watermarked/error' to the response with the '200' status

**GET /v1/listings**
- added the optional property 'results/items/media/images/items/original/error' to the response with the '200' status
- added the optional property 'results/items/media/images/items/watermarked/error' to the response with the '200' status

### 2026-02-03

**POST /v1/listings**
- !WARNING! removed the request property 'media/images/items/large'
- !WARNING! removed the request property 'media/images/items/medium'
- !WARNING! removed the request property 'media/images/items/original/height'
- !WARNING! removed the request property 'media/images/items/original/width'
- !WARNING! removed the request property 'media/images/items/thumbnail'
- !WARNING! removed the request property 'media/images/items/watermarked'

**PUT /v1/listings/{id}**
- !WARNING! removed the request property 'media/images/items/large'
- !WARNING! removed the request property 'media/images/items/medium'
- !WARNING! removed the request property 'media/images/items/original/height'
- !WARNING! removed the request property 'media/images/items/original/width'
- !WARNING! removed the request property 'media/images/items/thumbnail'
- !WARNING! removed the request property 'media/images/items/watermarked'

### 2025-12-18

**GET /v1/users**
- DEPRECATED: The `callTracking` field in the User response is now deprecated and will always return null
- This field previously returned call tracking phone numbers for users
- The field remains in the response schema for backwards compatibility but will be removed in a future version
- Integrations should stop relying on this field and remove any logic that depends on call tracking data

### 2025-11-10

**POST /v1/webhooks**
- added the new 'listing.action' enum value to the request property 'eventId'

**Webhook Events**
- Enhanced documentation for `listing.action` webhook event
- Added comprehensive overview explaining compliance and quality action notifications
- Documented all 24 action types with categorization (DLD permits, ADREC permits, REGA permits, verification, agent licenses, quality, transactions)
- Detailed status lifecycle: `pending`, `dispute_created`, `expired`
- Documented expiration reasons: `RESOLVED`, `ACTION_TIMEOUT`, `DISPUTE_ACCEPTED`, `DISPUTE_REJECTED`, `DANGLING_PARENT`
- Added practical examples for DLD permit mismatch and incomplete location scenarios
- Documented expire actions: `listing_unpublish`, `revalidate_permit`
- Updated schema to specify `type` field must be `listing.action`
- Improved field descriptions with client-focused language
- Updated example values to be more realistic

### 2025-09-19

**GET /v1/listings**
- !WARNING! added the new '21' enum value to the `results/items/bedrooms` response property for the response status '200'
- !WARNING! added the new '21' enum value to the `results/items/compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '22' enum value to the `results/items/bedrooms` response property for the response status '200'
- !WARNING! added the new '22' enum value to the `results/items/compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '23' enum value to the `results/items/bedrooms` response property for the response status '200'
- !WARNING! added the new '23' enum value to the `results/items/compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '24' enum value to the `results/items/bedrooms` response property for the response status '200'
- !WARNING! added the new '24' enum value to the `results/items/compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '25' enum value to the `results/items/bedrooms` response property for the response status '200'
- !WARNING! added the new '25' enum value to the `results/items/compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '26' enum value to the `results/items/bedrooms` response property for the response status '200'
- !WARNING! added the new '26' enum value to the `results/items/compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '27' enum value to the `results/items/bedrooms` response property for the response status '200'
- !WARNING! added the new '27' enum value to the `results/items/compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '28' enum value to the `results/items/bedrooms` response property for the response status '200'
- !WARNING! added the new '28' enum value to the `results/items/compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '29' enum value to the `results/items/bedrooms` response property for the response status '200'
- !WARNING! added the new '29' enum value to the `results/items/compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '30' enum value to the `results/items/bedrooms` response property for the response status '200'
- !WARNING! added the new '30' enum value to the `results/items/compliance/regaResponse/bedrooms` response property for the response status '200'

**POST /v1/listings**
- !WARNING! added the new '21' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '21' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '22' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '22' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '23' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '23' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '24' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '24' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '25' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '25' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '26' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '26' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '27' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '27' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '28' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '28' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '29' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '29' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '30' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '30' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- added the new '21' enum value to the request property `bedrooms`
- added the new '22' enum value to the request property `bedrooms`
- added the new '23' enum value to the request property `bedrooms`
- added the new '24' enum value to the request property `bedrooms`
- added the new '25' enum value to the request property `bedrooms`
- added the new '26' enum value to the request property `bedrooms`
- added the new '27' enum value to the request property `bedrooms`
- added the new '28' enum value to the request property `bedrooms`
- added the new '29' enum value to the request property `bedrooms`
- added the new '30' enum value to the request property `bedrooms`

**PUT /v1/listings/{id}**
- !WARNING! added the new '21' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '21' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '22' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '22' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '23' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '23' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '24' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '24' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '25' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '25' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '26' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '26' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '27' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '27' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '28' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '28' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '29' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '29' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- !WARNING! added the new '30' enum value to the `bedrooms` response property for the response status '200'
- !WARNING! added the new '30' enum value to the `compliance/regaResponse/bedrooms` response property for the response status '200'
- added the new '21' enum value to the request property `bedrooms`
- added the new '22' enum value to the request property `bedrooms`
- added the new '23' enum value to the request property `bedrooms`
- added the new '24' enum value to the request property `bedrooms`
- added the new '25' enum value to the request property `bedrooms`
- added the new '26' enum value to the request property `bedrooms`
- added the new '27' enum value to the request property `bedrooms`
- added the new '28' enum value to the request property `bedrooms`
- added the new '29' enum value to the request property `bedrooms`
- added the new '30' enum value to the request property `bedrooms`

### 2025-09-16

**GET /v1/listings**
- added the optional property 'results/items/compliance/issuingClientLicenseNumber' to the response with the '200' status
- added the optional property 'results/items/compliance/regaResponse/compliance/issuingClientLicenseNumber' to the response with the '200' status

**POST /v1/listings**
- added the new optional request property 'compliance/issuingClientLicenseNumber'
- added the optional property 'compliance/issuingClientLicenseNumber' to the response with the '200' status
- added the optional property 'compliance/regaResponse/compliance/issuingClientLicenseNumber' to the response with the '200' status

**PUT /v1/listings/{id}**
- added the new optional request property 'compliance/issuingClientLicenseNumber'
- added the optional property 'compliance/issuingClientLicenseNumber' to the response with the '200' status
- added the optional property 'compliance/regaResponse/compliance/issuingClientLicenseNumber' to the response with the '200' status

### 2025-08-29

**GET /v1/locations**
- added the new optional 'query' request parameter 'filter[parent]'

### 2025-08-12

**GET /v1/leads**
- !WARNING! for the 'query' request parameter 'perPage', the max was decreased from '100.00' to '50.00'
- added the required property 'data/items/listing/reference' to the response with the '200' status

### 2025-08-07

**GET /v1/users/**
- added the new optional 'query' request parameter 'email'
- added the new optional 'query' request parameter 'id'

### 2025-08-05

**GET /v1/credits/transactions**
- endpoint added

### 2025-07-30

**GET /v1/credits/balance**
- endpoint added

### 2025-07-29

**WHPayloadLead**
- added `reference` field to listing object

### 2025-07-25

**GET /v1/leads**
- added the new optional 'query' request parameter 'projectId'

**POST /v1/webhooks**
- added the new 'listing.published' enum value to the request property 'eventId'
- added the new 'listing.unpublished' enum value to the request property 'eventId'

**Webhooks**
- added the new 'listing.published' event
- added the new 'listing.unpublished' event

### 2025-07-23

**POST /v1/listings**
- the request property 'media/images/items/large' was deprecated
- the request property 'media/images/items/medium' was deprecated
- the request property 'media/images/items/thumbnail' was deprecated
- the request property 'media/images/items/watermarked' was deprecated
- !WARNING! the request property 'media/images/items/original' became required
- !WARNING! the request property 'media/images/items/original/url' became required

**PUT /v1/listings/{id}**
- the request property 'media/images/items/large' was deprecated
- the request property 'media/images/items/medium' was deprecated
- the request property 'media/images/items/thumbnail' was deprecated
- the request property 'media/images/items/watermarked' was deprecated
- !WARNING! the request property 'media/images/items/original' became required
- !WARNING! the request property 'media/images/items/original/url' became required

**POST /v1/webhooks**
- added the new 'publicProfile.verification.approved' enum value to the request property 'eventId'
- added the new 'publicProfile.verification.rejected' enum value to the request property 'eventId'

**PATCH /v1/users/{id}**
- the request property 'password' was deprecated

### 2025-07-21

**POST /v1/listings/{id}/unpublish**
- endpoint added

### 2025-07-18

**GET /v1/leads**
- added the optional property 'data/items/responseLink' to the response with the '200' status

### 2025-07-16

**GET /v1/listings/{id}/publish/prices**
- endpoint added
- This new endpoint allows to retrieve the publishing price for listings.

### 2025-07-09

**POST /v1/public-profiles/{id}/submit-verification**
- endpoint added

**GET /v1/stats/public-profiles**
- endpoint added

### 2025-06-25

**GET /v1/listings**
- Added: `filter[advertisementNumber]` in query - This allows filtering of listings by advertisement number (DTCM/RERA)

## Auth

Authorization API endpoints.

### Issue JWT Token

Issue JWT token based on API key and secret.

Required scope: No scope required

**Request Body** — `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `apiKey` | string = 40 characters | required | |
| `apiSecret` | string = 32 characters | required | |

**Responses**

| Status | Description |
|---|---|
| 200 | Auth Token |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |

`POST /v1/auth/token`

**Request sample** (Payload, `application/json`)

```json
{
  "apiKey": "abcde.abcdefghijklmnopqrstuvwxyz01234567",
  "apiSecret": "abcdefghijklmnopqrstuvwxyz012345"
}
```

**Response sample** (`application/json`)

```json
{
  "accessToken": "eyJhbGciOiJIUz......Qssw5c",
  "tokenType": "Bearer",
  "expiresIn": 1800
}
```

## Users

User API endpoints.

### Create User

Creates a new user in the system. The user will be created with an associated public profile.

Required scope: `users:full_access`

Authorizations: jwt

**Request Body** — `application/json`, required

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string `<email>` | required | Email address of the user. Used mainly for authentication. |
| `firstName` | string (>= 2 characters) | required | |
| `lastName` | string (>= 2 characters) | required | |
| `mobile` | string `^\+?[0-9][0-9\s().-]{6,17}$` | required | Mobile phone number of the user. Used mainly for authentication (e.g. 2FA). |
| `roleId` | integer | required | Access control role id (e.g. 6 for Decision maker). Refer to Fetch Roles API. |
| `publicProfile` | object | required | |

**Responses**

| Status | Description |
|---|---|
| 201 | User Created |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |

`POST /v1/users`

**Request sample** (Payload, `application/json`)

```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "mobile": "^\\+?0000000$",
  "roleId": 0,
  "publicProfile": {
    "name": "string",
    "email": "user@example.com",
    "phone": "^\\+?0000000$",
    "phoneSecondary": "^\\+?0000000$",
    "whatsappPhone": "^\\+?0000000$",
    "imageUrl": "http://example.com",
    "bio": {},
    "position": {},
    "linkedinAddress": "http://example.com",
    "experienceSince": 2015,
    "nationality": "AD",
    "spokenLanguages": [],
    "compliances": []
  }
}
```

**Response sample** (`application/json`)

```json
{
  "id": 1234,
  "firstName": "John",
  "lastName": "Doe",
  "email": "abcd@example.com",
  "mobile": "+9710123456789",
  "status": "active",
  "roleId": 3,
  "publicProfile": {
    "id": 1234,
    "name": "John Doe",
    "email": "john@propertyfinder.ae",
    "phone": "+9715823456789",
    "phoneSecondary": "+9715823456789",
    "whatsappPhone": "+9715823456789",
    "bio": {},
    "position": {},
    "linkedinAddress": "https://www.linkedin.com/in/johndoe",
    "imageVariants": {},
    "verification": {},
    "compliances": [],
    "isSuperAgent": true
  }
}
```

### Search Users

Retrieves a list of users associated with a specific client or organisation.

Required scope: `users:read`

Authorizations: jwt

**Query Parameters**

| Field | Type | Description |
|---|---|---|
| `page` | integer `<int32>` >= 1, default: 1 | Example: `page=1`. Page number, starts with 1. |
| `perPage` | integer `<int32>` [1..100], default: 50 | Example: `perPage=10`. Number of items per page (max 100 allowed). |
| `search` | string | Example: `search=entity_name`. Search term to filter entity. |
| `status` | string, enum: `active`, `inactive` | Example: `status=active`. User's status. |
| `roleId` | string | Example: `roleId=3`. The user's role ID. |
| `publicProfileId` | string | Comma separated list of public profile IDs to filter the response. |
| `id` | string | Comma separated list of user IDs to filter the response. |
| `email` | string | Comma separated list of user emails to filter the response. |

**Responses**

| Status | Description |
|---|---|
| 200 | List client's users |
| 400 | Bad Request Schema |
| 401 | Unauthorized |
| 403 | Forbidden |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |

`GET /v1/users`

**Response sample** (`application/json`)

```json
{
  "data": [
    {}
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "perPage": 10,
    "totalPages": 10,
    "nextPage": 2,
    "prevPage": 1
  }
}
```

### Update Private Profile

Update a user's private profile details. Request body should contain only the fields that need to be updated.

Required scope: `users:full_access`

Authorizations: jwt

**Path Parameters**

| Field | Type | Required |
|---|---|---|
| `id` | string | required |

**Request Body** — `application/json`, required

| Field | Type | Description |
|---|---|---|
| `firstName` | string | |
| `lastName` | string | |
| `email` | string `<email>` | |
| `password` | string | Deprecated. This field is deprecated and will be removed in future versions. This field DOES NOT update the password of the user. |
| `phone` | string | Deprecated. This field is deprecated and will be removed in future versions. Please use `mobile` instead. |
| `mobile` | string `^\+?[0-9][0-9\s().-]{6,17}$` | |
| `roleId` | string | |
| `isActive` | boolean | |

**Responses**

| Status | Description |
|---|---|
| 204 | User profile updated successfully, no content to return |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |

`PATCH /v1/users/{id}`

**Request sample** (Payload, `application/json`)

```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "user@example.com",
  "password": "string",
  "phone": "string",
  "mobile": "^\\+?0000000$",
  "roleId": "string",
  "isActive": true
}
```

**Response sample** (`application/problem+json`)

```json
{
  "type": "https://problems.atlas.propertyfinder.com/common-http-400-bad-request/",
  "code": "common_http_400-bad-request",
  "title": "Bad Request",
  "detail": "The request could not be understood by the server.",
  "status": 400,
  "attributes": {
    "trace_id": "5ed6cf5e682562685928b0a227af039d"
  },
  "errors": [
    {}
  ]
}
```

### Update Public Profile

Update a user's public profile details. Request body should contain only the fields that need to be updated.

Required scope: `users:full_access`

Authorizations: jwt

**Path Parameters**

| Field | Type | Required |
|---|---|---|
| `id` | string | required |

**Request Body** — `application/json`, required

| Field | Type | Description |
|---|---|---|
| `name` | string | Full name of the user, that will be exposed on the PF Website. |
| `email` | string `<email>` | Email of the user, that will be exposed on the PF Website. |
| `phone` | string `^\+?[0-9][0-9\s().-]{6,17}$` | Phone number of the user, that will be exposed on the PF Website. |
| `phoneSecondary` | string `^\+?[0-9][0-9\s().-]{6,17}$` | Secondary phone number of the user, that will be used when the phone number is not reachable. |
| `whatsappPhone` | string `^\+?[0-9][0-9\s().-]{6,17}$` | WhatsApp phone number of the user, that will be exposed on the PF Website. |
| `imageUrl` | string `<uri>` | URL of the profile image. |
| `bio` | object | Localized brief biography of the user, displayed on the PF Website. Can include professional background, expertise, or achievements. |
| `position` | object | Localized current job title or position of the user within the company. |
| `linkedinAddress` | string `<uri>` | LinkedIn URL of the user. |
| `experienceSince` | integer | Year when the user started their professional career. Represented as a four-digit year (e.g., 2015). |
| `nationality` | string, enum (see table below) | Nationality of the user (2 letter country code). |
| `spokenLanguages` | Array of integers or null, unique, enum (see table below) | Array of the spoken languages. Can be empty array. |
| `compliances` | Array of objects or null | An array of compliances. Can be an empty array. |

**`nationality` enum values**

| Code | Country |
|---|---|
| AF | Afghanistan |
| AX | Aland Islands |
| AL | Albania |
| DZ | Algeria |
| AS | American Samoa |
| AD | Andorra |
| AO | Angola |
| AI | Anguilla |
| AQ | Antarctica |
| AG | Antigua and Barbuda |
| AR | Argentina |
| AM | Armenia |
| AW | Aruba |
| AU | Australia |
| AT | Austria |
| AZ | Azerbaijan |
| BS | Bahamas |
| BH | Bahrain |
| BD | Bangladesh |
| BB | Barbados |
| BY | Belarus |
| BE | Belgium |
| BZ | Belize |
| BJ | Benin |
| BM | Bermuda |
| BT | Bhutan |
| BO | Bolivia |
| BA | Bosnia and Herzegovina |
| BW | Botswana |
| BV | Bouvet Island |
| BR | Brazil |
| IO | British Indian Ocean Territory |
| VG | British Virgin Islands |
| BN | Brunei Darussalam |
| BG | Bulgaria |
| BF | Burkina Faso |
| BI | Burundi |
| KH | Cambodia |
| CM | Cameroon |
| CA | Canada |
| CV | Cape Verde |
| KY | Cayman Islands |
| CF | Central African Republic |
| TD | Chad |
| CL | Chile |
| CN | China |
| CX | Christmas Island |
| CC | Cocos (Keeling) Islands |
| CO | Colombia |
| KM | Comoros |
| CG | Congo (Brazzaville) |
| CD | Congo, Democratic Republic of the |
| CK | Cook Islands |
| CR | Costa Rica |
| HR | Croatia |
| CU | Cuba |
| CY | Cyprus |
| CZ | Czech Republic |
| CI | Côte d'Ivoire |
| DK | Denmark |
| DJ | Djibouti |
| DM | Dominica |
| DO | Dominican Republic |
| EC | Ecuador |
| EG | Egypt |
| SV | El Salvador |
| GQ | Equatorial Guinea |
| ER | Eritrea |
| EE | Estonia |
| ET | Ethiopia |
| FK | Falkland Islands (Malvinas) |
| FO | Faroe Islands |
| FJ | Fiji |
| FI | Finland |
| FR | France |
| GF | French Guiana |
| PF | French Polynesia |
| TF | French Southern Territories |
| GA | Gabon |
| GM | Gambia |
| GE | Georgia |
| DE | Germany |
| GH | Ghana |
| GI | Gibraltar |
| GR | Greece |
| GL | Greenland |
| GD | Grenada |
| GP | Guadeloupe |
| GU | Guam |
| GT | Guatemala |
| GG | Guernsey |
| GN | Guinea |
| GW | Guinea-Bissau |
| GY | Guyana |
| HT | Haiti |
| HM | Heard Island and Mcdonald Islands |
| VA | Holy See (Vatican City State) |
| HN | Honduras |
| HK | Hong Kong, Special Administrative Region of China |
| HU | Hungary |
| IS | Iceland |
| IN | India |
| ID | Indonesia |
| IR | Iran |
| IQ | Iraq |
| IE | Ireland |
| IM | Isle of Man |
| IL | Israel |
| IT | Italy |
| JM | Jamaica |
| JP | Japan |
| JE | Jersey |
| JO | Jordan |
| KZ | Kazakhstan |
| KE | Kenya |
| KI | Kiribati |
| KP | Korea, Democratic People's Republic of |
| KR | South Korea |
| XK | Kosovo |
| KW | Kuwait |
| KG | Kyrgyzstan |
| LA | Lao PDR |
| LV | Latvia |
| LB | Lebanon |
| LS | Lesotho |
| LR | Liberia |
| LY | Libya |
| LI | Liechtenstein |
| LT | Lithuania |
| LU | Luxembourg |
| MO | Macao, Special Administrative Region of China |
| MK | Macedonia, Republic of |
| MG | Madagascar |
| MW | Malawi |
| MY | Malaysia |
| MV | Maldives |
| ML | Mali |
| MT | Malta |
| MH | Marshall Islands |
| MQ | Martinique |
| MR | Mauritania |
| MU | Mauritius |
| YT | Mayotte |
| MX | Mexico |
| FM | Micronesia, Federated States of |
| MD | Moldova |
| MC | Monaco |
| MN | Mongolia |
| ME | Montenegro |
| MS | Montserrat |
| MA | Morocco |
| MZ | Mozambique |
| MM | Myanmar |
| NA | Namibia |
| NR | Nauru |
| NP | Nepal |
| NL | Netherlands |
| AN | Netherlands Antilles |
| NC | New Caledonia |
| NZ | New Zealand |
| NI | Nicaragua |
| NE | Niger |
| NG | Nigeria |
| NU | Niue |
| NF | Norfolk Island |
| MP | Northern Mariana Islands |
| NO | Norway |
| OM | Oman |
| PK | Pakistan |
| PW | Palau |
| PS | Palestine |
| PA | Panama |
| PG | Papua New Guinea |
| PY | Paraguay |
| PE | Peru |
| PH | Philippines |
| PN | Pitcairn |
| PL | Poland |
| PT | Portugal |
| PR | Puerto Rico |
| QA | Qatar |
| RO | Romania |
| RU | Russian Federation |
| RW | Rwanda |
| RE | Réunion |
| SH | Saint Helena |
| KN | Saint Kitts and Nevis |
| LC | Saint Lucia |
| PM | Saint Pierre and Miquelon |
| VC | Saint Vincent and Grenadines |
| BL | Saint-Barthélemy |
| MF | Saint-Martin (French part) |
| WS | Samoa |
| SM | San Marino |
| ST | Sao Tome and Principe |
| SA | Saudi Arabia |
| SN | Senegal |
| RS | Serbia |
| SC | Seychelles |
| SL | Sierra Leone |
| SG | Singapore |
| SK | Slovakia |
| SI | Slovenia |
| SB | Solomon Islands |
| SO | Somalia |
| ZA | South Africa |
| GS | South Georgia and the South Sandwich Islands |
| SS | South Sudan |
| ES | Spain |
| LK | Sri Lanka |
| SD | Sudan |
| SR | Suriname \* |
| SJ | Svalbard and Jan Mayen Islands |
| SZ | Swaziland |
| SE | Sweden |
| CH | Switzerland |
| SY | Syria |
| TW | Taiwan, Republic of China |
| TJ | Tajikistan |
| TZ | Tanzania |
| TH | Thailand |
| TL | Timor-Leste |
| TG | Togo |
| TK | Tokelau |
| TO | Tonga |
| TT | Trinidad and Tobago |
| TN | Tunisia |
| TR | Turkey |
| TM | Turkmenistan |
| TC | Turks and Caicos Islands |
| TV | Tuvalu |
| UG | Uganda |
| UA | Ukraine |
| AE | United Arab Emirates |
| GB | United Kingdom |
| UM | United States Minor Outlying Islands |
| US | United States of America |
| UY | Uruguay |
| UZ | Uzbekistan |
| VU | Vanuatu |
| VE | Venezuela |
| VN | Vietnam |
| VI | Virgin Islands, US |
| WF | Wallis and Futuna Islands |
| EH | Western Sahara |
| YE | Yemen |
| ZM | Zambia |
| ZW | Zimbabwe |

**`spokenLanguages` enum values**

| ID | Language |
|---|---|
| 1 | English |
| 2 | Arabic |
| 3 | French |
| 4 | Polish |
| 5 | German |
| 6 | Russian |
| 7 | Hindi |
| 8 | Urdu |
| 9 | Croatian |
| 10 | Spanish |
| 11 | Persian/Farsi |
| 12 | Greek |
| 13 | Tagalog |
| 14 | Bengali |
| 15 | Tamil |
| 16 | Malayalam |
| 17 | Other |
| 18 | Kyrgyz |
| 19 | Uzbek |
| 20 | Kazakh |
| 21 | Mandarin |
| 22 | Italian |
| 23 | Portuguese |
| 24 | Dutch |
| 25 | Hungarian |
| 26 | Azerbaijani |
| 27 | Turkish |
| 28 | Memon |
| 29 | Gujarati |
| 30 | Ukrainian |
| 32 | Bulgarian |
| 33 | Swedish |
| 34 | Romanian |
| 35 | Afrikaans |
| 36 | Punjabi |
| 37 | Danish |
| 38 | Serbian |
| 39 | Norwegian |
| 40 | Cantonese |
| 41 | Bahasa Melayu |
| 42 | Shona |
| 43 | Pashto |
| 44 | Albanian |
| 45 | Amharic |
| 46 | Baluchi |
| 47 | Belarusian |
| 48 | Berber |
| 49 | Catalan |
| 50 | Czech |
| 51 | Finnish |
| 52 | Japanese |
| 53 | Javanese |
| 54 | Kannada |
| 55 | Korean |
| 56 | Kurdi |
| 57 | Latvian |
| 58 | Malay |
| 59 | Sinhalese |
| 60 | Slovak |
| 61 | Slovene |
| 62 | Somali |
| 63 | Sudanese |
| 64 | Swahili |
| 65 | Telugu |
| 66 | Thai |
| 67 | Macedonian |
| 68 | Lithuanian |
| 69 | Armenian |
| 70 | Sindhi |

**Responses**

| Status | Description |
|---|---|
| 204 | Public profile updated successfully, no content to return |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |

`PATCH /v1/public-profiles/{id}`

**Request sample** (Payload, `application/json`)

```json
{
  "name": "string",
  "email": "user@example.com",
  "phone": "^\\+?0000000$",
  "phoneSecondary": "^\\+?0000000$",
  "whatsappPhone": "^\\+?0000000$",
  "imageUrl": "http://example.com",
  "bio": {
    "primary": "string",
    "secondary": "string"
  },
  "position": {
    "primary": "string",
    "secondary": "string"
  },
  "linkedinAddress": "http://example.com",
  "experienceSince": 2015,
  "nationality": "AD",
  "spokenLanguages": [
    1
  ],
  "compliances": [
    {}
  ]
}
```

**Response sample** (`application/problem+json`)

```json
{
  "type": "https://problems.atlas.propertyfinder.com/common-http-400-bad-request/",
  "code": "common_http_400-bad-request",
  "title": "Bad Request",
  "detail": "The request could not be understood by the server.",
  "status": 400,
  "attributes": {
    "trace_id": "5ed6cf5e682562685928b0a227af039d"
  },
  "errors": [
    {}
  ]
}
```

### Submit Verification Request

Submit Public Profile Verification request.

Required scope: `users:full_access`

Authorizations: jwt

**Path Parameters**

| Field | Type | Required |
|---|---|---|
| `id` | string | required |

**Request Body** — `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `phone` | string | required | Private Profile Phone number of the public profile to be used for verification |
| `documentUrl` | string `<uri>` | required | URL to the verification document - license |

**Responses**

| Status | Description |
|---|---|
| 200 | Public Profile Verification Post response |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |

`POST /v1/public-profiles/{id}/submit-verification`

**Request sample** (Payload, `application/json`)

```json
{
  "phone": "string",
  "documentUrl": "http://example.com"
}
```

**Response sample** (`application/json`)

```json
{
  "status": "unverified"
}
```

## Roles

Roles API endpoints.

### Fetch Roles

Returns the list of user roles available in the account. This includes both base roles (such as agent, admin, decision maker, etc), as well as any custom roles that have been created in the account.

Required scope: `roles:read`

Authorizations: jwt

**Responses**

| Status | Description |
|---|---|
| 200 | List of roles |
| 400 | Bad Request Schema |
| 401 | Unauthorized |
| 403 | Forbidden |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |

`GET /v1/roles`

**Response sample** (`application/json`)

```json
{
  "data": [
    {}
  ]
}
```

## Listings

Listing API endpoints.

### Creates a New Listing

Creates a new listing. The request body should contain all the required fields for the listing creation. The response will include the details of the created listing.

Required scope: `listings:full_access`

For image upload specifications, see Image Requirements.

**Optional listing attributes**

`enhancements` — optional flags indicating property enhancements (upgraded, extended, landscaped). All property types may use `upgraded`; `extended` and `landscaped` apply only to villa and townhouse listings. Invalid enum values are rejected with 400. For other property types, `extended` and `landscaped` are removed on write rather than rejected; only `upgraded` is stored.

**Country specific required fields**

For each country, there are specific required fields that need to be included in the request body. In order for a created listing to get published afterwards, below are the required fields and their conditions.

**AE-Specific Listing — Required Fields**

| Field | Required if |
|---|---|
| `compliance` | When `uaeEmirate = dubai` or `uaeEmirate = abu_dhabi` |
| `compliance.listingAdvertisementNumber` | When `uaeEmirate = dubai` or `uaeEmirate = abu_dhabi` |
| `compliance.type` | When `uaeEmirate = dubai` or `uaeEmirate = abu_dhabi` |
| `category` | Always |
| `type` | Always |
| `furnishingType` | Always |
| `media.images.original` | Always |
| `price` | Always |
| `price.type` | Always |
| `price.amounts` | Include the amount matching `price.type` (e.g., `amounts.daily` for daily, `amounts.sale` for sale). For rental types (yearly, monthly, weekly, daily), other `amounts.*` values are optional. |
| `downPayment` | When `price.type = sale` |
| `location` | Always |
| `uaeEmirate` | Always |
| `reference` | Always (must be unique) |
| `bathrooms` | Required if listing type is not Land or Farm |
| `title.en` | Always |
| `description.en` | Always |
| `size` | Always |
| `hasParkingSpace` | When listing type = `co-working-space` |

**KSA-Specific Listing — Required Fields & REGA Integration**

For Saudi Arabia (KSA) listings, the fields have special handling due to REGA (Real Estate General Authority) integration:

| Field | Required if |
|---|---|
| `compliance.listingAdvertisementNumber` | Always |
| `compliance.userConfirmedDataIsCorrect` | Always |
| `category` | Always |
| `type` | Always |
| `furnishingType` | Always |
| `media.images.original` | Always |
| `price.type` | Always |
| `price.amounts` | Include the amount matching `price.type` (e.g., `amounts.daily` for daily, `amounts.sale` for sale). For rental types (yearly, monthly, weekly, daily), other `amounts.*` values are optional. |
| `price.downpayment` | When `price.type = sale` |
| `location` | Always |
| `reference` | Always (must be unique) |
| `bathrooms` | Required if listing type is not Land or Farm |
| `title.en` | Always |
| `description.en` | Always |
| `size` | Always |
| `hasParkingSpace` | When listing type = `co-working-space` |

**Fields That Will Be Overridden**

The following fields in your request body will be overridden with REGA data to ensure regulatory compliance:

| Field | Override Source | Description |
|---|---|---|
| `category` | `regaData.category` | Property category from REGA |
| `type` | `mapPropertyType(regaData.type)` | Mapped property type from REGA |
| `size` | `regaData.property_size` | Property size from REGA |
| `age` | `regaData.property_age` | Property age from REGA |
| `street.direction` | `regaData.street_direction` | Street direction from REGA |
| `street.width` | `regaData.street_width` | Street width from REGA |
| `location.id` | `regaData.location.id` | Location ID from REGA |
| `location.full_name.en` | `buildLocationFullName(regaData.location.location_tree, 'en')` | Full location name in English from REGA |
| `location.full_name.ar` | `buildLocationFullName(regaData.location.location_tree, 'ar')` | Full location name in Arabic from REGA |
| `location.lat` | `regaData.location.lat` | Latitude from REGA |
| `location.lon` | `regaData.location.lon` | Longitude from REGA |
| `location.path` | `regaData.location.path` | Location path from REGA |
| `price.type` | `regaData.offering_type === 'rent' ? 'yearly' : 'sale'` | Price type based on REGA offering type (sale, yearly, monthly, daily) |
| `price.amounts` | `{}` (auto-calculated based on REGA data) | Price amounts object with optional fields: daily, monthly, weekly, yearly, sale (all int32) |
| `price.obligation.enabled` | `regaData.price.obligation.enabled` (if available) | Boolean indicating if price has obligations. Auto-populated from REGA if available, otherwise must be provided. |
| `price.obligation.comment` | `regaData.price.obligation.comment` (if available) | Comment about price obligation. Required if `price.obligation.enabled` is true. Auto-populated from REGA if available, otherwise must be provided. |
| `price.value_affected.enabled` | `regaData.price.value_affected.enabled` (if available) | Boolean indicating if price value is affected. Auto-populated from REGA if available, otherwise must be provided. |
| `price.value_affected.comment` | `regaData.price.value_affected.comment` (if available) | Comment about value affected. Required if `price.value_affected.enabled` is true. Auto-populated from REGA if available, otherwise must be provided. |
| `plot_number` | `regaData.plot_number` | Plot number from REGA |
| `land_number` | `regaData.land_number` | Land number from REGA |

Important: For KSA listings, even if you provide values for the override fields above, they will be replaced with REGA data to ensure regulatory compliance. Fields marked as "optional" can be omitted from your request if REGA provides them; however, if REGA does not provide these fields (e.g., `price.obligation`, `price.value_affected`), you must include them in your request body.

Authorizations: jwt

**Request Body** — `application/json`, required

| Field | Type | Description |
|---|---|---|
| `age` | integer | Number of years since the property was handed over |
| `amenities` | Array of strings, items enum: `central-ac`, `built-in-wardrobes`, `kitchen-appliances`, `security`, `concierge`, `private-gym`, `shared-gym`, `private-jacuzzi`, `shared-spa`, `covered-parking`, `maids-room`, `barbecue-area`, `shared-pool`, `childrens-pool`, `private-garden`, `private-pool`, `view-of-water`, `walk-in-closet`, `lobby-in-building`, `electricity`, `waters`, `sanitation`, `no-services`, `fixed-phone`, `fibre-optics`, `flood-drainage`, `balcony`, `networked`, `view-of-landmark`, `dining-in-building`, `conference-room`, `study`, `maid-service`, `childrens-play-area`, `pets-allowed`, `vastu-compliant` | |
| `assignedTo` | object | |
| `availableFrom` | string `<date>` | |
| `bathrooms` | string, enum: `none`, `1`–`20` | |
| `bedrooms` | string, enum: `studio`, `1`–`30` | |
| `builtUpArea` | number | The built-up (interior) area of the property in sqft, expressed as a whole number (round to the nearest integer if needed). UAE villas, townhouses, and bungalows only. Ignored for all other property types and countries. |
| `category` | string, enum: `residential`, `commercial` | |
| `compliance` | object | |
| `createdBy` | object | This is the public profile id of the user. Refer to Search Users API response for more details - look at the `id` field, under `publicProfile` |
| `description` | object | If provided, one of `en` or `ar` should be set. Non-ASCII characters (emojis, symbols, HTML tags, etc.) are NOT yet supported. |
| `developer` | string | |
| `enhancements` | Array of strings, items enum: `upgraded`, `extended`, `landscaped` | Optional flags indicating property enhancements (upgraded, extended, landscaped). Extended and landscaped apply only to villa and townhouse property types; other property types may only use `upgraded`. |
| `finishingType` | string, enum: `fully-finished`, `semi-finished`, `unfinished` | |
| `floorNumber` | string | |
| `furnishingType` | string, enum: `unfurnished`, `semi-furnished`, `furnished` | |
| `hasGarden` | boolean | |
| `hasKitchen` | boolean | |
| `hasParkingOnSite` | boolean | |
| `landNumber` | string | |
| `location` | object | |
| `media` | object | |
| `mojDeedLocationDescription` | string | |
| `numberOfFloors` | integer | |
| `ownerName` | string | |
| `parkingSlots` | integer | |
| `plotNumber` | string | |
| `plotSize` | number | Deprecated. Deprecated and will be removed in a future version. Use `size` for the general/plot area and `builtUpArea` for the UAE villa/townhouse/bungalow interior area. |
| `price` | object | |
| `projectStatus` | string, enum: `completed`, `off_plan`, `completed_primary`, `off_plan_primary` | |
| `reference` | string | |
| `size` | number | The area of the property. For UAE villas, townhouses, and bungalows, this represents the plot (land) size — use `builtUpArea` for the interior area. For all other property types and countries, this represents the general property size. |
| `street` | object | |
| `title` | object | If provided, one of `en` or `ar` should be set. Non-ASCII characters (emojis, symbols, HTML tags, etc.) are NOT yet supported. |
| `type` | string, enum: `compound`, `whole-building`, `factory`, `land`, `rest-house`, `apartment`, `shop`, `warehouse`, `chalet`, `office-space`, `full-floor`, `villa`, `farm`, `show-room`, `bulk-sale-unit`, `restaurant`, `roof`, `half-floor`, `twin-house`, `cabin`, `bulk-rent-unit`, `ivilla`, `co-working-space`, `hotel-apartment`, `retail`, `duplex`, `townhouse`, `staff-accommodation`, `medical-facility`, `palace`, `penthouse`, `clinic`, `cafeteria`, `bungalow`, `labor-camp`, `business-center` | |
| `uaeEmirate` | string, enum: `dubai`, `abu_dhabi`, `northern_emirates` | |
| `unitNumber` | string | |

**Responses**

| Status | Description |
|---|---|
| 200 | Listing response |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 409 | Conflict |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |

`POST /v1/listings`

**Request sample** (Payload, `application/json`)

```json
{
  "age": 0,
  "amenities": [
    "central-ac"
  ],
  "assignedTo": {
    "id": 0
  },
  "availableFrom": "2019-08-24",
  "bathrooms": "none",
  "bedrooms": "studio",
  "builtUpArea": 0,
  "category": "residential",
  "compliance": {
    "advertisementLicenseIssuanceDate": "2019-08-24T14:15:22Z",
    "listingAdvertisementNumber": "string",
    "type": "rera",
    "issuingClientLicenseNumber": "string",
    "userConfirmedDataIsCorrect": true
  },
  "createdBy": {
    "id": 0
  },
  "description": {
    "ar": "string",
    "en": "string"
  },
  "developer": "string",
  "enhancements": [
    "upgraded"
  ],
  "finishingType": "fully-finished",
  "floorNumber": "string",
  "furnishingType": "unfurnished",
  "hasGarden": true,
  "hasKitchen": true,
  "hasParkingOnSite": true,
  "landNumber": "string",
  "location": {
    "id": 0
  },
  "media": {
    "images": [],
    "videos": {}
  },
  "mojDeedLocationDescription": "string",
  "numberOfFloors": 0,
  "ownerName": "string",
  "parkingSlots": 0,
  "plotNumber": "string",
  "plotSize": 0,
  "price": {
    "amounts": {},
    "downpayment": 0,
    "minimalRentalPeriod": 0,
    "mortgage": {},
    "numberOfCheques": 0,
    "numberOfMortgageYears": 0,
    "obligation": {},
    "onRequest": true,
    "paymentMethods": [],
    "type": "yearly",
    "utilitiesInclusive": true,
    "valueAffected": {}
  },
  "projectStatus": "completed",
  "reference": "string",
  "size": 0,
  "street": {
    "direction": "North",
    "width": 0
  },
  "title": {
    "ar": "string",
    "en": "string"
  },
  "type": "compound",
  "uaeEmirate": "dubai",
  "unitNumber": "string"
}
```

**Response sample** (`application/json`)

```json
{
  "age": 0,
  "aiContentUsed": true,
  "amenities": [
    "central-ac"
  ],
  "assignedTo": {
    "id": 0,
    "name": "string",
    "photos": {}
  },
  "availableFrom": "2019-08-24",
  "bathrooms": "none",
  "bedrooms": "studio",
  "builtUpArea": 0,
  "category": "residential",
  "compliance": {
    "advertisementLicenseIssuanceDate": "2019-08-24T14:15:22Z",
    "listingAdvertisementNumber": "string",
    "issuingClientLicenseNumber": "string",
    "regaResponse": {},
    "type": "rera",
    "userConfirmedDataIsCorrect": true
  },
  "createdAt": "2019-08-24T14:15:22Z",
  "createdBy": {
    "id": 0,
    "name": "string",
    "photos": {}
  },
  "ctsPriority": 0,
  "description": {
    "ar": "string",
    "en": "string"
  },
  "developer": "string",
  "enhancements": [
    "upgraded"
  ],
  "finishingType": "fully-finished",
  "floorNumber": "string",
  "furnishingType": "unfurnished",
  "hasGarden": true,
  "hasKitchen": true,
  "hasParkingOnSite": true,
  "id": "string",
  "landNumber": "string",
  "location": {
    "id": 0
  },
  "media": {
    "images": [],
    "videos": {}
  },
  "mojDeedLocationDescription": "string",
  "numberOfFloors": 0,
  "ownerName": "string",
  "parkingSlots": 0,
  "pfCategoryId": 0,
  "pfTypeId": 0,
  "plotNumber": "string",
  "plotSize": 0,
  "portals": {
    "propertyfinder": {}
  },
  "price": {
    "amounts": {},
    "downpayment": 0,
    "minimalRentalPeriod": 0,
    "mortgage": {},
    "numberOfCheques": 0,
    "numberOfMortgageYears": 0,
    "obligation": {},
    "onRequest": true,
    "paymentMethods": [],
    "type": "sale",
    "utilitiesInclusive": true,
    "valueAffected": {}
  },
  "products": {
    "featured": {},
    "premium": {},
    "standard": {}
  },
  "projectStatus": "completed",
  "qualityScore": {
    "color": "red",
    "details": {},
    "value": 0
  },
  "reference": "string",
  "size": 0,
  "state": {
    "reasons": [],
    "stage": "draft",
    "type": "draft"
  },
  "street": {
    "direction": "North",
    "width": 0
  },
  "title": {
    "ar": "string",
    "en": "string"
  },
  "type": "bulk-sale-unit",
  "uaeEmirate": "dubai",
  "unitNumber": "string",
  "updatedAt": "2019-08-24T14:15:22Z",
  "updatedBy": {
    "id": 0,
    "name": "string",
    "photos": {}
  },
  "verificationStatus": "string",
  "rnpm": {
    "state": "enabled",
    "enabledAt": "2019-08-24T14:15:22Z",
    "revokedAt": "2019-08-24T14:15:22Z",
    "reasons": []
  }
}
```

### Search Listings

Retrieves a list of listings based on various filters and parameters. The response will include the details of the listings that match the specified criteria.

Required scope: `listings:read`

Authorizations: jwt

**Query Parameters**

| Field | Type | Description |
|---|---|---|
| `draft` | boolean | Example: `draft=true`. Get published or non-published listings (default will return published listings) |
| `archived` | boolean | Example: `archived=true`. Get archived listings |
| `isCtsEligible` | boolean, default: true | Example: `isCtsEligible=false`. Get listings that are eligible for CTS |
| `filter[state]` | string, enum: `draft`, `live`, `takendown`, `archived`, `unpublished`, `pending_approval`, `rejected`, `approved`, `failed` | Filter by listing state. States are different based on the `draft` parameter |
| `filter[ids]` | string | Example: `filter[ids]=XXXXX,YYYYY,ZZZZZ`. Comma separated list of listing ids |
| `filter[reference]` | string | |
| `filter[listingLevel]` | string, enum: `featured`, `premium`, `standard` | Filter by listing level |
| `filter[completionStatus]` | string, enum: `completed`, `completed_primary`, `off_plan`, `off_plan_primary` | Filter by completion status |
| `filter[furnishingType]` | string, enum: `furnished`, `unfurnished`, `semi-furnished` | Filter by furnished type |
| `filter[locationId]` | string | Example: `filter[locationId]=123,456,789`. Comma separated list of location ids |
| `filter[assignedToId]` | string | Example: `filter[assignedToId]=123,456,789`. Comma separated list of public profile ids, assigned to the listing |
| `filter[type]` | string | Filter listing by type (apartment, villa, etc) |
| `filter[category]` | string, enum: `commercial`, `residential` | Filter by listing category |
| `filter[offeringType]` | string, enum: `rent`, `sale` | Filter by offering type |
| `filter[bedrooms]` | string | Example: `filter[bedrooms]=studio,2,3`. Filter listings by number of bedrooms. |
| `filter[bathrooms]` | string | Example: `filter[bathrooms]=1,2,3`. Filter listings by number of bathrooms. |
| `filter[unitNumber]` | string | Example: `filter[unitNumber]=123,B-923`. Filter listings by unit number. |
| `filter[advertisementNumber]` | string | Example: `filter[advertisementNumber]=1234,5678`. Filter by listing advertisement number (filter by RERA and DTCM number) |
| `filter[size][from]` | number | Example: `filter[size][from]=1000`. Filter listings by size starting from |
| `filter[size][to]` | number | Example: `filter[size][to]=2000`. Filter listings by size ending at |
| `filter[price][from]` | number | Example: `filter[price][from]=1000`. Filter listings by price starting from |
| `filter[price][to]` | number | Example: `filter[price][to]=2000`. Filter listings by price ending at |
| `filter[listingLevelExpiresAt][from]` | string `<date-time>` | Example: `filter[listingLevelExpiresAt][from]=2025-04-30T09:54:18+04:00`. Filter by listing level expiration date (from). From and to should be used together. |
| `filter[listingLevelExpiresAt][to]` | string `<date-time>` | Example: `filter[listingLevelExpiresAt][to]=2025-04-30T09:54:18+04:00`. Filter by listing level expiration date (to). From and to should be used together. |
| `filter[projectStatus]` | string, enum: `completed`, `completed_primary`, `off_plan`, `off_plan_primary` | Filter by `projectStatus` |
| `filter[spotlightStatus]` | string, enum: `eligible`, `outcompeted`, `spotlight`, `winning_offer`, `expired`, `not_eligible` | Filter by listing spotlight status |
| `filter[ctsPriority]` | integer, enum: 100, 0 | Filter by listing cts priority |
| `filter[verificationStatus]` | string, enum: `pending`, `approved`, `rejected`, `expired`, `deleted` | Filter by listing verification status |
| `perPage` | integer `<int32>` [1..100], default: 50 | Example: `perPage=10`. Number of items per page (max 100 allowed) |
| `page` | integer `<int32>` >= 1, default: 1 | Example: `page=1`. Page number, starts with 1. |
| `orderBy` | string, enum: `createdAt`, `price`, `publishedAt` | Example: `orderBy=price`. Field to order by |
| `sort[createdAt]` | string, enum: `asc`, `desc` | Sort by `createdAt` |
| `sort[price]` | string, enum: `asc`, `desc` | Sort by `price` |
| `sort[publishedAt]` | string, enum: `asc`, `desc` | Sort by `publishedAt` |

**Responses**

| Status | Description |
|---|---|
| 200 | Listings search response |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |

`GET /v1/listings`

**Response sample** (`application/json`)

```json
{
  "results": [
    {}
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "perPage": 10,
    "totalPages": 10,
    "nextPage": 2,
    "prevPage": 1
  },
  "activeCts": {
    "locations": [],
    "categories": [],
    "offeringTypes": []
  }
}
```

### Updates an Existing Listing

Updates an existing listing. The response will include the details of the updated listing.

Required scope: `listings:full_access`

For image upload specifications, see Image Requirements.

**Optional listing attributes**

`enhancements` — optional flags indicating property enhancements (upgraded, extended, landscaped). All property types may use `upgraded`; `extended` and `landscaped` apply only to villa and townhouse listings. Invalid enum values are rejected with 400. For other property types, `extended` and `landscaped` are removed on write rather than rejected; only `upgraded` is stored.

Authorizations: jwt

**Path Parameters**

| Field | Type | Required |
|---|---|---|
| `id` | string | required |

**Request Body** — `application/json`, required

| Field | Type | Description |
|---|---|---|
| `age` | integer | Number of years since the property was handed over |
| `amenities` | Array of strings, items enum: `central-ac`, `built-in-wardrobes`, `kitchen-appliances`, `security`, `concierge`, `private-gym`, `shared-gym`, `private-jacuzzi`, `shared-spa`, `covered-parking`, `maids-room`, `barbecue-area`, `shared-pool`, `childrens-pool`, `private-garden`, `private-pool`, `view-of-water`, `walk-in-closet`, `lobby-in-building`, `electricity`, `waters`, `sanitation`, `no-services`, `fixed-phone`, `fibre-optics`, `flood-drainage`, `balcony`, `networked`, `view-of-landmark`, `dining-in-building`, `conference-room`, `study`, `maid-service`, `childrens-play-area`, `pets-allowed`, `vastu-compliant` | |
| `assignedTo` | object | |
| `availableFrom` | string `<date>` | |
| `bathrooms` | string, enum: `none`, `1`–`20` | |
| `bedrooms` | string, enum: `studio`, `1`–`30` | |
| `builtUpArea` | number | The built-up (interior) area of the property in sqft, expressed as a whole number (round to the nearest integer if needed). UAE villas, townhouses, and bungalows only. Ignored for all other property types and countries. |
| `category` | string, enum: `residential`, `commercial` | |
| `compliance` | object | |
| `createdBy` | object | This is the public profile id of the user. Refer to Search Users API response for more details - look at the `id` field, under `publicProfile` |
| `description` | object | If provided, one of `en` or `ar` should be set. Non-ASCII characters (emojis, symbols, HTML tags, etc.) are NOT yet supported. |
| `developer` | string | |
| `enhancements` | Array of strings, items enum: `upgraded`, `extended`, `landscaped` | Optional flags indicating property enhancements (upgraded, extended, landscaped). Extended and landscaped apply only to villa and townhouse property types; other property types may only use `upgraded`. |
| `finishingType` | string, enum: `fully-finished`, `semi-finished`, `unfinished` | |
| `floorNumber` | string | |
| `furnishingType` | string, enum: `unfurnished`, `semi-furnished`, `furnished` | |
| `hasGarden` | boolean | |
| `hasKitchen` | boolean | |
| `hasParkingOnSite` | boolean | |
| `landNumber` | string | |
| `location` | object | |
| `media` | object | |
| `mojDeedLocationDescription` | string | |
| `numberOfFloors` | integer | |
| `ownerName` | string | |
| `parkingSlots` | integer | |
| `plotNumber` | string | |
| `plotSize` | number | Deprecated. Deprecated and will be removed in a future version. Use `size` for the general/plot area and `builtUpArea` for the UAE villa/townhouse/bungalow interior area. |
| `price` | object | |
| `projectStatus` | string, enum: `completed`, `off_plan`, `completed_primary`, `off_plan_primary` | |
| `reference` | string | |
| `size` | number | The area of the property. For UAE villas, townhouses, and bungalows, this represents the plot (land) size — use `builtUpArea` for the interior area. For all other property types and countries, this represents the general property size. |
| `street` | object | |
| `title` | object | If provided, one of `en` or `ar` should be set. Non-ASCII characters (emojis, symbols, HTML tags, etc.) are NOT yet supported. |
| `type` | string, enum: `compound`, `whole-building`, `factory`, `land`, `rest-house`, `apartment`, `shop`, `warehouse`, `chalet`, `office-space`, `full-floor`, `villa`, `farm`, `show-room`, `bulk-sale-unit`, `restaurant`, `roof`, `half-floor`, `twin-house`, `cabin`, `bulk-rent-unit`, `ivilla`, `co-working-space`, `hotel-apartment`, `retail`, `duplex`, `townhouse`, `staff-accommodation`, `medical-facility`, `palace`, `penthouse`, `clinic`, `cafeteria`, `bungalow`, `labor-camp`, `business-center` | |
| `uaeEmirate` | string, enum: `dubai`, `abu_dhabi`, `northern_emirates` | |
| `unitNumber` | string | |

**Responses**

| Status | Description |
|---|---|
| 200 | Listing response |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Listing Conflict |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |

`PUT /v1/listings/{id}`

**Request sample** (Payload, `application/json`)

```json
{
  "age": 0,
  "amenities": [
    "central-ac"
  ],
  "assignedTo": {
    "id": 0
  },
  "availableFrom": "2019-08-24",
  "bathrooms": "none",
  "bedrooms": "studio",
  "builtUpArea": 0,
  "category": "residential",
  "compliance": {
    "advertisementLicenseIssuanceDate": "2019-08-24T14:15:22Z",
    "listingAdvertisementNumber": "string",
    "type": "rera",
    "issuingClientLicenseNumber": "string",
    "userConfirmedDataIsCorrect": true
  },
  "createdBy": {
    "id": 0
  },
  "description": {
    "ar": "string",
    "en": "string"
  },
  "developer": "string",
  "enhancements": [
    "upgraded"
  ],
  "finishingType": "fully-finished",
  "floorNumber": "string",
  "furnishingType": "unfurnished",
  "hasGarden": true,
  "hasKitchen": true,
  "hasParkingOnSite": true,
  "landNumber": "string",
  "location": {
    "id": 0
  },
  "media": {
    "images": [],
    "videos": {}
  },
  "mojDeedLocationDescription": "string",
  "numberOfFloors": 0,
  "ownerName": "string",
  "parkingSlots": 0,
  "plotNumber": "string",
  "plotSize": 0,
  "price": {
    "amounts": {},
    "downpayment": 0,
    "minimalRentalPeriod": 0,
    "mortgage": {},
    "numberOfCheques": 0,
    "numberOfMortgageYears": 0,
    "obligation": {},
    "onRequest": true,
    "paymentMethods": [],
    "type": "yearly",
    "utilitiesInclusive": true,
    "valueAffected": {}
  },
  "projectStatus": "completed",
  "reference": "string",
  "size": 0,
  "street": {
    "direction": "North",
    "width": 0
  },
  "title": {
    "ar": "string",
    "en": "string"
  },
  "type": "compound",
  "uaeEmirate": "dubai",
  "unitNumber": "string"
}
```

**Response sample** (`application/json`)

```json
{
  "age": 0,
  "aiContentUsed": true,
  "amenities": [
    "central-ac"
  ],
  "assignedTo": {
    "id": 0,
    "name": "string",
    "photos": {}
  },
  "availableFrom": "2019-08-24",
  "bathrooms": "none",
  "bedrooms": "studio",
  "builtUpArea": 0,
  "category": "residential",
  "compliance": {
    "advertisementLicenseIssuanceDate": "2019-08-24T14:15:22Z",
    "listingAdvertisementNumber": "string",
    "issuingClientLicenseNumber": "string",
    "regaResponse": {},
    "type": "rera",
    "userConfirmedDataIsCorrect": true
  },
  "createdAt": "2019-08-24T14:15:22Z",
  "createdBy": {
    "id": 0,
    "name": "string",
    "photos": {}
  },
  "ctsPriority": 0,
  "description": {
    "ar": "string",
    "en": "string"
  },
  "developer": "string",
  "enhancements": [
    "upgraded"
  ],
  "finishingType": "fully-finished",
  "floorNumber": "string",
  "furnishingType": "unfurnished",
  "hasGarden": true,
  "hasKitchen": true,
  "hasParkingOnSite": true,
  "id": "string",
  "landNumber": "string",
  "location": {
    "id": 0
  },
  "media": {
    "images": [],
    "videos": {}
  },
  "mojDeedLocationDescription": "string",
  "numberOfFloors": 0,
  "ownerName": "string",
  "parkingSlots": 0,
  "pfCategoryId": 0,
  "pfTypeId": 0,
  "plotNumber": "string",
  "plotSize": 0,
  "portals": {
    "propertyfinder": {}
  },
  "price": {
    "amounts": {},
    "downpayment": 0,
    "minimalRentalPeriod": 0,
    "mortgage": {},
    "numberOfCheques": 0,
    "numberOfMortgageYears": 0,
    "obligation": {},
    "onRequest": true,
    "paymentMethods": [],
    "type": "sale",
    "utilitiesInclusive": true,
    "valueAffected": {}
  },
  "products": {
    "featured": {},
    "premium": {},
    "standard": {}
  },
  "projectStatus": "completed",
  "qualityScore": {
    "color": "red",
    "details": {},
    "value": 0
  },
  "reference": "string",
  "size": 0,
  "state": {
    "reasons": [],
    "stage": "draft",
    "type": "draft"
  },
  "street": {
    "direction": "North",
    "width": 0
  },
  "title": {
    "ar": "string",
    "en": "string"
  },
  "type": "bulk-sale-unit",
  "uaeEmirate": "dubai",
  "unitNumber": "string",
  "updatedAt": "2019-08-24T14:15:22Z",
  "updatedBy": {
    "id": 0,
    "name": "string",
    "photos": {}
  },
  "verificationStatus": "string",
  "rnpm": {
    "state": "enabled",
    "enabledAt": "2019-08-24T14:15:22Z",
    "revokedAt": "2019-08-24T14:15:22Z",
    "reasons": []
  }
}
```

### Deletes a Listing

Deletes a listing by its ID.

Required scope: `listings:full_access`

Authorizations: jwt

**Path Parameters**

| Field | Type | Required |
|---|---|---|
| `id` | string | required |

**Responses**

| Status | Description |
|---|---|
| 200 | Pending deletion |
| 204 | Deleted |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Listing Conflict |
| 429 | Rate Limited |
| 500 | Internal Server Error |

`DELETE /v1/listings/{id}`

**Response sample** (`application/json`)

```json
{
  "id": "string",
  "state": {
    "type": "live_pending_deletion",
    "stage": "live",
    "reasons": []
  }
}
```

### Get Listing Publish Price

Calculates the publish price of a draft listing based on its parameters. This endpoint will return 404 for listings that do not exist or are not in the draft state.

Required scope: `listings:read`

Authorizations: jwt

**Path Parameters**

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | required | The listing ID for which to calculate the publish price. |

**Responses**

| Status | Description |
|---|---|
| 200 | Listing Publish Prices response |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |

`GET /v1/listings/{id}/publish/prices`

**Response sample** (`application/json`)

```json
[
  {
    "feature": "publish",
    "purchasableProducts": []
  }
]
```

### Publish Listing

Publishes a listing to the PropertyFinder website. The listing must meet all the requirements for publication.

Required scope: `listings:full_access`

Authorizations: jwt

**Path Parameters**

| Field | Type | Required |
|---|---|---|
| `id` | string | required |

**Responses**

| Status | Description |
|---|---|
| 200 | Listing state response |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |

`POST /v1/listings/{id}/publish`

**Response sample** (`application/json`)

```json
{
  "state": {
    "type": "draft",
    "stage": "draft",
    "reasons": []
  },
  "id": "string"
}
```

### Unpublish Listing

Unpublishes a listing from the PropertyFinder website. The listing will no longer be visible to users.

Required scope: `listings:full_access`

Authorizations: jwt

**Path Parameters**

| Field | Type | Required |
|---|---|---|
| `id` | string | required |

**Responses**

| Status | Description |
|---|---|
| 200 | Listing state response |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |

`POST /v1/listings/{id}/unpublish`

**Response sample** (`application/json`)

```json
{
  "state": {
    "type": "draft",
    "stage": "draft",
    "reasons": []
  },
  "id": "string"
}
```

### Upgrade Listing

Upgrade a listing to premium or featured.

Required scope: `listings:full_access`

Authorizations: jwt

**Path Parameters**

| Field | Type | Required |
|---|---|---|
| `id` | string | required |

**Request Body** — `application/json`, required — Listing upgrades request

| Field | Type | Required | Description |
|---|---|---|---|
| `featureId` | string, enum: `featured`, `premium` | required | The feature to apply to the listing |
| `productId` | string | required | Product ID to purchase. Obtained from `GET /upgrades` response under `purchasableProducts[].id`. Use this to buy a new boost. |
| `renewalEnabled` | boolean, default: true | | Whether to enable automatic renewal when the upgrade expires |

**Responses**

| Status | Description |
|---|---|
| 200 | Listing state response |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |

`POST /v1/listings/{id}/upgrades`

**Request sample** (Payload, `application/json`)

```json
{
  "featureId": "featured",
  "productId": "string",
  "renewalEnabled": true
}
```

**Response sample** (`application/json`)

```json
{
  "state": {
    "type": "draft",
    "stage": "draft",
    "reasons": []
  },
  "id": "string"
}
```

### Available Upgrades

Retrieve a list of available upgrade options for a specific listing.

Use `includeBundles=true` query parameter to include bundle products in addition to credit-based products. Bundle products can be used when the client has bundle wallets available.

**Product Types:**

- `credits`: Standard products purchasable with credits
- `bundle`: Bundle products (Feature Bundle, Super Bundle) that use bundle wallet units

**Bundle Products:**

- Feature Bundle: Available for "featured" upgrades (15 days)
- Super Bundle: Available for "premium" upgrades (15 days)

Required scope: `listings:read`

Authorizations: jwt

**Path Parameters**

| Field | Type | Required |
|---|---|---|
| `id` | string | required |

**Query Parameters**

| Field | Type | Description |
|---|---|---|
| `includeBundles` | boolean, default: false | When set to true, includes bundle products in the response in addition to credit-based products |

**Responses**

| Status | Description |
|---|---|
| 200 | Listing upgrades response |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |

`GET /v1/listings/{id}/upgrades`

**Response sample** (`application/json`)

```json
{
  "options": [
    {}
  ]
}
```

## Floor Plans

### List Floor Plans

Retrieves a paginated list of floor plans matching the provided filters. Use this endpoint to find floor plans by location and number of bedrooms, and optionally narrow the results by minimum and maximum area. When both `minArea` and `maxArea` are provided, `minArea` must be less than or equal to `maxArea`.

Required scope: `listings:read`

Authorizations: jwt

**Query Parameters**

| Field | Type | Required | Description |
|---|---|---|---|
| `page` | integer `<int32>` >= 1, default: 1 | | Example: `page=1`. Page number, starts with 1. |
| `perPage` | integer `<int32>` [1..100], default: 50 | | Example: `perPage=10`. Number of items per page (max 100 allowed) |
| `locationId` | integer >= 1 | required | Example: `locationId=15225`. Location ID used to search for floor plans. |
| `bedrooms` | integer >= 0 | required | Example: `bedrooms=1`. Number of bedrooms to match. |
| `minArea` | integer >= 0 | | Example: `minArea=1038`. Minimum area to include in the results. |
| `maxArea` | integer >= 0 | | Example: `maxArea=1038`. Maximum area to include in the results. |

**Responses**

| Status | Description |
|---|---|
| 200 | List of floor plans |
| 400 | Bad Request Schema |
| 401 | Unauthorized |
| 403 | Forbidden |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |

`GET /v1/floor-plans`

**Response sample** (`application/json`)

```json
{
  "data": [
    {}
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "perPage": 10,
    "totalPages": 10,
    "nextPage": 2,
    "prevPage": 1
  }
}
```

### Get Floor Plan

Retrieves detailed information about a specific floor plan.

Required scope: `listings:read`

Authorizations: jwt

**Path Parameters**

| Field | Type | Required |
|---|---|---|
| `id` | string | required |

**Responses**

| Status | Description |
|---|---|
| 200 | Floor plan retrieved successfully |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |

`GET /v1/floor-plans/{id}`

**Response sample** (`application/json`)

```json
{
  "id": "DUBAI_AL_BARARI_D1_1BD_10_1010_964",
  "bedrooms": 1,
  "locationId": 15225,
  "area": {
    "value": 1038,
    "unit": "sqft"
  },
  "imageUrl": "https://static.shared.staging.propertyfinder.ae/media/images/floorplan/example/watermarked.png",
  "floorPlan3dUrl": "https://propertyfinder.floorplan.aixsolutions.ai/gltf/?id=6a84d2f0-ec7f-49d9-85bc-19734caa1444"
}
```

## Compliances

Compliance API endpoints.

### Get Permit by Number & License

Returns either the property permit data or, if a project permit exists, the corresponding project details.

Required scope: `compliances:read`

Authorizations: jwt

**Path Parameters**

| Field | Type | Required | Description |
|---|---|---|---|
| `permitNumber` | string | required | The DLD listing (permit) number to validate |
| `licenseNumber` | string | required | The company license number |

**Query Parameters**

| Field | Type | Required | Description |
|---|---|---|---|
| `permitType` | string | required | The listing (permit) type to validate. |

**Header Parameters**

| Field | Type | Description |
|---|---|---|
| `Accept-Language` | string, default: `en`, enum: `en`, `ar` | Example: `en`. Language code |

**Responses**

| Status | Description |
|---|---|
| 200 | Successful response with either property or project data |
| 400 | Bad Request Schema |
| 401 | Unauthorized |
| 403 | Forbidden |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |

`GET /v1/compliances/{permitNumber}/{licenseNumber}`

**Response sample** (`application/json`)

```json
{
  "status": "success",
  "data": [
    {}
  ]
}
```

## Listing Verifications

### Listing Verification Submissions

This endpoint allows clients to retrieve a comprehensive and paginated list of listing verification submissions within the system. It supports advanced filtering through various query parameters such as submission ID, listing ID, listing reference, agent broker ID, status, and time ranges (`createdAt`, `updatedAt`, `expiresAt`). Clients can use these filters to narrow down the results to only the relevant submissions they are interested in.

Required scope: `listing_verification:full_access`

To provide more flexibility and context in the response, the API supports `include` parameters for embedding related resources such as submitted documents and historical status transitions. This avoids the need for additional round trips to fetch related data.

In addition, the endpoint supports customizable sorting (e.g., by creation date, status, expiration) and pagination controls to efficiently handle large data sets.

Authorizations: jwt

**Query Parameters**

| Field | Type | Description |
|---|---|---|
| `filter[id]` | string | Comma-separated list of submission IDs. |
| `filter[listingId]` | string | Comma-separated list of listing IDs. |
| `filter[listingReference]` | string | Comma-separated list of listing references. |
| `filter[publicProfileId]` | string | Comma-separated list of publicProfile IDs. |
| `filter[status]` | string | Example: `filter[status]=pending,approved,rejected,expired`. Comma-separated list of statuses. |
| `filter[createdAt][from]` | string `<date-time>` | Example: `filter[createdAt][from]=2025-04-30T09:54:18+04:00`. Date and time in RFC 3339 format: `YYYY-MM-DDTHH:MM:SSZ` |
| `filter[createdAt][to]` | string `<date-time>` | Example: `filter[createdAt][to]=2025-04-30T09:54:18+04:00`. Date and time in RFC 3339 format: `YYYY-MM-DDTHH:MM:SSZ` |
| `filter[updatedAt][from]` | string `<date-time>` | Example: `filter[updatedAt][from]=2025-04-30T09:54:18+04:00`. Date and time in RFC 3339 format: `YYYY-MM-DDTHH:MM:SSZ` |
| `filter[updatedAt][to]` | string `<date-time>` | Example: `filter[updatedAt][to]=2025-04-30T09:54:18+04:00`. Date and time in RFC 3339 format: `YYYY-MM-DDTHH:MM:SSZ` |
| `filter[expiresAt][from]` | string `<date-time>` | Example: `filter[expiresAt][from]=2025-04-30T09:54:18+04:00`. Date and time in RFC 3339 format: `YYYY-MM-DDTHH:MM:SSZ` |
| `filter[expiresAt][to]` | string `<date-time>` | Example: `filter[expiresAt][to]=2025-04-30T09:54:18+04:00`. Date and time in RFC 3339 format: `YYYY-MM-DDTHH:MM:SSZ` |
| `include` | string | Example: `include=document,history`. Comma-separated list of related entities to include in the response. |
| `page` | integer `<int32>` >= 1, default: 1 | Example: `page=1`. Page number, starts with 1. |
| `perPage` | integer `<int32>` [1..100], default: 50 | Example: `perPage=10`. Number of items per page (max 100 allowed) |
| `orderBy` | string | Example: `orderBy=name`. Field to order by |

**Responses**

| Status | Description |
|---|---|
| 200 | Successful response containing submission data. |
| 400 | Bad Schema Request |
| 401 | Unauthorized |

`GET /v1/listing-verifications`

**Response sample** (`application/json`)

```json
{
  "submissions": [
    {}
  ],
  "pageMetadata": {
    "total": 100,
    "page": 1,
    "perPage": 10,
    "totalPages": 10,
    "nextPage": 2,
    "prevPage": 1
  }
}
```

### Submit Listing Verification

This endpoint allows clients to initiate a new listing verification submission by providing the listing details, agent/broker identity, and supporting documents grouped by category.

Required scope: `listing_verification:full_access`

The request must include the `listingId` and `agentBrokerId` fields, which associate the submission with a specific listing and the responsible agent or broker. Optionally, clients can attach categorized documents to support the verification process. Document categories include: `authorization`, `ownership`, `identification`, `representationPao`, `representationId`, and `others`.

**Request Body** — `application/json`

| Field | Type | Required |
|---|---|---|
| `listingId` | string | required |
| `publicProfileId` | integer | required |
| `documents` | object | |

**Responses**

| Status | Description |
|---|---|
| 201 | Successful response containing submission data. |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |

`POST /v1/listing-verifications`

**Request sample** (Payload, `application/json`)

```json
{
  "listingId": "string",
  "publicProfileId": 0,
  "documents": {
    "authorization": [],
    "ownership": [],
    "identification": [],
    "representationPao": [],
    "representationId": [],
    "others": []
  }
}
```

**Response sample** (`application/json`)

```json
{
  "submissionId": 0
}
```

### Resubmit Listing Submission

This endpoint allows clients to resubmit a previously rejected verification submission, but it is strictly limited to auto submissions — a type of submission that is automatically generated by the system without requiring supporting documents from the user.

Required scope: `listing_verification:full_access`

Auto submissions are typically created when a listing is eligible for automated verification, and they are often rejected due to issues that can be resolved without requiring the agent or broker to manually upload new documentation.

When using this endpoint, clients must provide the `listingId` of the listing whose auto submission needs to be resubmitted. The system will locate the most recent rejected auto submission for that listing and, if found and eligible, transition its status back to pending. This re-initiates the verification process without requiring the user to create a brand new submission or re-upload any documents.

This endpoint is useful in scenarios such as:

- The rejection reason was temporary (e.g., backend data mismatch that has since been resolved)
- The listing has been updated and now satisfies automated checks
- A manual override or external fix has made the listing verifiable again

Authorizations: jwt

**Path Parameters**

| Field | Type | Required | Description |
|---|---|---|---|
| `submissionId` | integer `<int64>` | required | The ID of the listing verification submission to be resubmitted. |

**Responses**

| Status | Description |
|---|---|
| 200 | Submission status changed to pending. |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 404 | Not Found |

`POST /v1/listing-verifications/{submissionId}/resubmit`

**Response sample** (`application/problem+json`)

```json
{
  "type": "https://problems.atlas.propertyfinder.com/common-http-400-bad-request/",
  "code": "common_http_400-bad-request",
  "title": "Bad Request",
  "detail": "The request could not be understood by the server.",
  "status": 400,
  "attributes": {
    "trace_id": "5ed6cf5e682562685928b0a227af039d"
  },
  "errors": [
    {}
  ]
}
```

### Listing Eligibility Check

This endpoint allows clients to check whether a specific listing qualifies to begin the verification process. Before a verification submission is created — especially for auto submissions that don't require documents — this check determines whether the listing meets all necessary criteria.

The evaluation includes both technical and business rules such as:

- Listing location (e.g., certain cities may be excluded)
- Listing quality metrics (like score thresholds)
- Agent or broker eligibility
- Duplicate submission prevention

The response includes two key flags:

- `eligible`: Indicates whether the listing qualifies for any kind of verification.
- `autoSubmit`: Indicates whether the listing is eligible for auto submission (which requires no documents or manual input).

If `eligible` is false, the response may also contain a `helpDetails` object to help the client understand why the listing is not eligible and how to resolve the issue.

This check should be performed before attempting to create or resubmit a verification.

Required scope: `listing_verification:full_access`

Authorizations: jwt

**Request Body** — `application/json`

| Field | Type | Required |
|---|---|---|
| `listingId` | string | required |

**Responses**

| Status | Description |
|---|---|
| 200 | Successful response containing eligibility check data. |
| 400 | Indicates the request is invalid due to missing or incorrect parameters. |
| 401 | Returned when the client is not authorized to access this endpoint. |
| 403 | Client or agent permissions do not meet the eligibility criteria. |
| 500 | Indicates an issue occurred on the server while processing the request. |

`POST /v1/listing-verifications/eligibility-check`

**Request sample** (Payload, `application/json`)

```json
{
  "listingId": "string"
}
```

**Response sample** (200, `application/json`)

```json
{
  "eligible": true,
  "autoSubmit": true,
  "helpDetails": {}
}
```

## Locations

Location API endpoints.

### Locations List

Retrieves a list of locations matching the search term. You can use the fields like `filter[id]`, `filter[type]` and `filter[parent]` to narrow down the search to the most relevant locations.

Required scope: `locations:read`

Authorizations: jwt

**Query Parameters**

| Field | Type | Required | Description |
|---|---|---|---|
| `page` | integer `<int32>` >= 1, default: 1 | | Example: `page=1`. Page number, starts with 1. |
| `perPage` | integer `<int32>` [1..100], default: 50 | | Example: `perPage=10`. Number of items per page (max 100 allowed) |
| `search` | string (>= 2 characters) | required | Example: `search=Maple 1`. Search term to filter entity |
| `filter[id]` | string | | Example: `filter[id]=1234`. Location ID to filter the response. |
| `filter[type]` | string, enum: `REGION`, `GOVERNORATE`, `CITY`, `TOWN`, `VILLAGE`, `DISTRICT`, `STREET`, `COMMUNITY`, `SUBCOMMUNITY`, `PROJECT`, `TOWER`, `COMPOUND`, `AREA`, `PROVINCE`, `SUBDISTRICT` | | Example: `filter[type]=AREA`. Location type to filter the response. |
| `filter[parent]` | string | | Example: `filter[parent]=Dubai, Dubai Hills Estate`. Comma-separated list of locations to narrow down search results by location hierarchy. This filter helps disambiguate locations with similar names across different areas. |

For example, when searching for "Maple 1", without this filter you might get results from multiple areas — Maple 1 in Dubai Hills Estate and Maple 1 in Jumeirah Village Circle. To get only the Dubai Hills Estate location, set `filter[parent]` as "Dubai, Dubai Hills Estate"; this specifies the complete location hierarchy from country/emirate down to the immediate area as comma-separated fields.

**Header Parameters**

| Field | Type | Description |
|---|---|---|
| `Accept-Language` | string, default: `en`, enum: `en`, `ar` | Example: `en`. Language code |

**Responses**

| Status | Description |
|---|---|
| 200 | List of locations |
| 400 | Bad Request Schema |
| 401 | Unauthorized |
| 403 | Forbidden |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |

`GET /v1/locations`

**Response sample** (`application/json`)

```json
{
  "data": [
    {}
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "perPage": 10,
    "totalPages": 10,
    "nextPage": 2,
    "prevPage": 1
  }
}
```

## Leads

Lead API endpoints.

### Fetch Leads

Fetch leads, filtering on type, status, date, assigned user/agent etc.

Required scope: `leads:read`

Note: Project leads do not generate a `lead.created` webhook. They only trigger `lead.assigned` or `lead.updated` notifications.

Authorizations: jwt

**Query Parameters**

| Field | Type | Description |
|---|---|---|
| `page` | integer `<int32>` >= 1, default: 1 | Example: `page=1`. Page number, starts with 1. |
| `perPage` | number [1..50], default: 50 | Example: `perPage=20`. Number of items per page (max 50 allowed) |
| `orderBy` | string | Example: `orderBy=name`. Field to order by |
| `orderDirection` | string, enum: `asc`, `desc` | Example: `orderDirection=asc`. Order direction |
| `search` | string | Example: `search=entity_name`. Search term to filter entity |
| `id` | Array of strings | |
| `status` | Array of strings, items enum: `sent`, `delivered`, `read`, `replied` | Filter leads by status. Status Mapping Notes: 'When Call is Answered' → 'Status is marked as replied'; 'When Call goes to Voicemail' → 'Status is marked as delivered' |
| `channel` | Array of strings, items enum: `whatsapp`, `email`, `call` | |
| `entityType` | Array of strings, items enum: `listing`, `project`, `developer`, `agent`, `company` | Project leads represent PRIMARY PLUS leads. |
| `publicProfileId` | Array of integers | |
| `listingId` | Array of strings | |
| `listingReference` | Array of strings | |
| `listingCategory` | Array of strings, items enum: `commercial`, `residential` | |
| `listingOffering` | Array of strings, items enum: `sale`, `rent` | |
| `developerId` | Array of strings | |
| `projectId` | Array of strings | Filter leads by project (Primary Plus) ID. This is the same identifier returned as `project.id` in the lead response. |
| `senderName` | Array of strings | |
| `senderPhone` | Array of strings | |
| `senderEmail` | Array of strings | |
| `senderWhatsappUsername` | Array of strings | |
| `tag` | Array of strings | |
| `excludeTag` | Array of strings | |
| `createdAtFrom` | string `<date-time>` | Example: `createdAtFrom=2025-04-30T09:54:18+04:00`. Date and time in RFC 3339 format: `YYYY-MM-DDTHH:MM:SSZ`. Optional filter to specify the earliest creation date. The date must not be older than 3 months from the current date. |
| `createdAtTo` | string `<date-time>` | Example: `createdAtTo=2025-04-30T09:54:18+04:00`. Date and time in RFC 3339 format: `YYYY-MM-DDTHH:MM:SSZ` |

**Responses**

| Status | Description |
|---|---|
| 200 | List of leads |
| 400 | Bad Request Schema |
| 401 | Unauthorized |
| 403 | Forbidden |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |

`GET /v1/leads`

**Response sample** (`application/json`)

```json
{
  "data": [
    {}
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "perPage": 10,
    "totalPages": 10,
    "nextPage": 2,
    "prevPage": 1
  }
}
```

## Projects

Projects API endpoints.

### Get Project Details

Retrieve detailed information about a specific project.

Required scope: `projects:read`

Authorizations: jwt

**Path Parameters**

| Field | Type | Required |
|---|---|---|
| `id` | string | required |

**Header Parameters**

| Field | Type | Description |
|---|---|---|
| `Accept-Language` | string, default: `en`, enum: `en`, `ar` | Example: `en`. Language code |

**Responses**

| Status | Description |
|---|---|
| 200 | Project details retrieved successfully |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |

`GET /v1/projects/{id}`

**Response sample** (`application/json`)

```json
{
  "id": "string",
  "title": {
    "en": "string",
    "ar": "string"
  },
  "developer": {
    "id": "string",
    "name": {}
  },
  "location": {
    "id": "string",
    "name": {}
  },
  "dldId": "string",
  "startingPrice": "string"
}
```

## Statistics

Statistics API endpoints.

### Get Public Profile Statistics

Retrieve Public Profile Statistics data (only available for countries where SuperAgent is launched, e.g. AE, QA, BH etc.)

Required scope: `statistics:read`

Authorizations: jwt

**Query Parameters**

| Field | Type | Description |
|---|---|---|
| `search` | string | Example: `search=entity_name`. Search term to filter entity |
| `page` | integer `<int32>` >= 1, default: 1 | Example: `page=1`. Page number, starts with 1. |
| `perPage` | integer `<int32>` [1..100], default: 50 | Example: `perPage=10`. Number of items per page (max 100 allowed) |
| `orderBy` | string | Example: `orderBy=name`. Field to order by |
| `orderDirection` | string, enum: `asc`, `desc` | Example: `orderDirection=asc`. Order direction |

**Responses**

| Status | Description |
|---|---|
| 200 | Get agent statistics response |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |

`GET /v1/stats/public-profiles`

**Response sample** (`application/json`)

```json
{
  "data": [
    {}
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "perPage": 10,
    "totalPages": 10,
    "nextPage": 2,
    "prevPage": 1
  },
  "sort": {
    "by": "string",
    "direction": "asc"
  }
}
```

### Get SuperAgent Performance Metrics

Retrieves detailed performance metrics for all public profiles of the client that are enrolled in the SuperAgent program. Returns individual performance data including response times, response rates, listing quality, transactions, and SuperAgent streak information. Supports pagination and search filtering.

The `search` parameter filters public profiles by name or email address.

Required scope: `statistics:read`

Authorizations: jwt

**Query Parameters**

| Field | Type | Description |
|---|---|---|
| `search` | string | Example: `search=entity_name`. Search term to filter entity |
| `page` | integer `<int32>` >= 1, default: 1 | Example: `page=1`. Page number, starts with 1. |
| `perPage` | integer `<int32>` [1..100], default: 50 | Example: `perPage=10`. Number of items per page (max 100 allowed) |

**Responses**

| Status | Description |
|---|---|
| 200 | Superagent statistics response |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 429 | Rate Limited |
| 500 | Internal Server Error |

`GET /v1/stats/superagent-stats`

**Response sample** (`application/json`)

```json
{
  "data": [
    {}
  ],
  "pagination": {
    "page": 1,
    "perPage": 1,
    "total": 0,
    "totalPages": 0,
    "nextPage": 1,
    "prevPage": 1
  }
}
```

### Get Public Profile Rankings

Retrieves public profile rankings for your client's public profiles within the arena. Supports optional filtering by category, location, and property type. Results are paginated and include public profile details with their ranking position. This endpoint returns only the public profiles belonging to your client.

Required scope: `statistics:read`

Authorizations: jwt

**Query Parameters**

| Field | Type | Description |
|---|---|---|
| `categoryId` | string, enum: `residential-sale`, `residential-rent`, `commercial-sale`, `commercial-rent` | Example: `categoryId=residential-sale`. Category type for filtering public profiles |
| `locationId` | integer | Example: `locationId=50`. Location ID to filter public profiles by. Use the `/v1/locations` endpoint to retrieve available location IDs. |
| `propertyTypeId` | string, enum: `apartment`, `townhouse`, `land`, `villa`, `retail`, `office-space`, `shop`, `full-floor`, `penthouse`, `showroom`, `farm`, `warehouse`, `duplex`, `hotel-apartment`, `half-floor`, `whole-building`, `bulk-rent-unit`, `business-centre`, `compound`, `bulk-sale-unit`, `labour-camp`, `coworking-space`, `staff-accommodation`, `bungalow`, `factory` | Example: `propertyTypeId=apartment`. Property type for filtering agents |
| `page` | integer `<int32>` >= 1, default: 1 | Example: `page=1`. Page number, starts with 1. |
| `perPage` | integer `<int32>` [1..100], default: 50 | Example: `perPage=10`. Number of items per page (max 100 allowed) |

**Responses**

| Status | Description |
|---|---|
| 200 | Arena ranking agents response |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 429 | Rate Limited |
| 500 | Internal Server Error |

`GET /v1/stats/public-profiles-arena-ranking`

**Response sample** (`application/json`)

```json
{
  "data": [
    {}
  ],
  "pagination": {
    "page": 1,
    "perPage": 1,
    "total": 0,
    "totalPages": 0,
    "nextPage": 1,
    "prevPage": 1
  }
}
```

### Get Top Public Profiles

Retrieves top-ranked public profiles from all clients for a specific location and category combination. This is a cross-client leaderboard showing the best-performing public profiles regardless of which client they belong to. Results are paginated (20 per page by default), sorted by rank in combination, and include public profile details along with their associated client/company name. Only available for countries where SuperAgent 2.0 is launched (currently only AE).

Required scope: `statistics:read`

Authorizations: jwt

**Query Parameters**

| Field | Type | Required | Description |
|---|---|---|---|
| `categoryId` | string, enum: `residential-sale`, `residential-rent`, `commercial-sale`, `commercial-rent` | required | Example: `categoryId=residential-sale`. Category type for filtering public profiles |
| `locationId` | integer | required | Example: `locationId=123`. Location ID to filter public profiles by. Use the `/v1/locations` endpoint to retrieve available location IDs. |
| `propertyTypeId` | string, enum: `apartment`, `townhouse`, `land`, `villa`, `retail`, `office-space`, `shop`, `full-floor`, `penthouse`, `showroom`, `farm`, `warehouse`, `duplex`, `hotel-apartment`, `half-floor`, `whole-building`, `bulk-rent-unit`, `business-centre`, `compound`, `bulk-sale-unit`, `labour-camp`, `coworking-space`, `staff-accommodation`, `bungalow`, `factory` | | Example: `propertyTypeId=apartment`. Property type for filtering agents |
| `page` | integer `<int32>` >= 1, default: 1 | | Example: `page=1`. Page number, starts with 1. |
| `perPage` | integer `<int32>` [1..100], default: 50 | | Example: `perPage=10`. Number of items per page (max 100 allowed) |

**Responses**

| Status | Description |
|---|---|
| 200 | Top agents by location response |
| 400 | Bad Schema Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 429 | Rate Limited |
| 500 | Internal Server Error |

`GET /v1/stats/top-public-profiles`

**Response sample** (`application/json`)

```json
{
  "data": [
    {}
  ],
  "pagination": {
    "page": 1,
    "perPage": 1,
    "total": 0,
    "totalPages": 0,
    "nextPage": 1,
    "prevPage": 1
  }
}
```

## Credits

Credits API endpoints.

### Get Credit Balance

Retrieves the credit balance information including the total, remaining, and used credits, as well as the billing cycle dates.

Required scope: `credits:read`

Authorizations: jwt

**Query Parameters**

| Field | Type | Description |
|---|---|---|
| `publicProfileId` | integer | The public profile ID of the user to retrieve the balance for. If left empty, the credit balance information for the company is returned. |

**Responses**

| Status | Description |
|---|---|
| 200 | Credit balance response |
| 400 | Bad Request Schema |
| 401 | Unauthorized |
| 403 | Forbidden |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |

`GET /v1/credits/balance`

**Response sample** (`application/json`)

```json
{
  "total": 138361,
  "remaining": 111278,
  "used": 27083,
  "cycle": {
    "startDate": "2019-08-24T14:15:22Z",
    "endDate": "2019-08-24T14:15:22Z"
  }
}
```

### Get Credits Spent

Retrieves the total credits spent to date on one or more listings, covering the listing's full lifetime regardless of publish/unpublish cycles.

A `listingId` that exists and belongs to your account is always included in the response, with `totalSpent: 0` if it never had credits spent on it (e.g. a draft). A `listingId` that does not exist, or does not belong to your account, is silently omitted from `listings` rather than returned with a zero total.

Required scope: `credits:read`

Authorizations: jwt

**Query Parameters**

| Field | Type | Required | Description |
|---|---|---|---|
| `listingId` | string | required | Example: `listingId=ZYV59FVTW42HJD60FXVDKB41W0,8N2QKD7HRA31JM90WXVBKC55T4`. Comma-separated list of listing identifiers to fetch credits-spent information for. At most 20 listingIds are supported per request. |

**Responses**

| Status | Description |
|---|---|
| 200 | Credits spent for the requested listings |
| 400 | Bad Request Schema |
| 401 | Unauthorized |
| 403 | Forbidden |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |

`GET /v1/credits/spent`

**Response sample** (`application/json`)

```json
{
  "listings": [
    {}
  ],
  "grandTotal": 4500
}
```

### Get Transaction History

Retrieves credits transaction history of the company. Contains details for the listing (if applicable) and transaction info with amount, action and type. Supports date-range, type and listing filtering.

Required scope: `credits:read`

Authorizations: jwt

**Query Parameters**

| Field | Type | Description |
|---|---|---|
| `createdAtFrom` | string `<date-time>` | Start of the date range filter (inclusive), in RFC3339 date-time format (e.g. `2026-06-01T00:00:00Z`). See defaulting and limits below. |
| `createdAtTo` | string `<date-time>` | End of the date range filter (inclusive), in RFC3339 date-time format (e.g. `2026-06-08T00:00:00Z`). See defaulting and limits below. |
| `type` | string, default: `credits`, enum: `credits`, `feature_bundle`, `premium_bundle` | Filter transactions by type. If not provided, defaults to `credits`. |
| `listingSearch` | string | Free-text search that filters transactions to those associated with a listing. Matches partially and case-insensitively against the listing's identifier and reference: transactions are returned for any listing whose ID or reference (or both) matches the search term (e.g. `listingSearch=12345`). When omitted, transactions for all listings are returned. |
| `page` | integer `<int32>` >= 1, default: 1 | Example: `page=1`. Page number, starts with 1. |
| `perPage` | integer `<int32>` [1..100], default: 50 | Example: `perPage=10`. Number of items per page (max 100 allowed) |

**Defaulting and limits for `createdAtFrom` / `createdAtTo`:**

- If both `createdAtFrom` and `createdAtTo` are omitted, the last 90 days are returned.
- If only one of the two is provided, the other bound is derived to form a 90-day window.
- The span between `createdAtFrom` and `createdAtTo` must not exceed 90 days, otherwise a 400 is returned.
- If `createdAtFrom` is after `createdAtTo`, a 400 is returned.

**`type` possible values:**

- `credits` — Credit transactions (default)
- `feature_bundle` — Feature bundle transactions
- `premium_bundle` — Premium bundle transactions

**Responses**

| Status | Description |
|---|---|
| 200 | List of transaction records |
| 400 | Bad Request Schema |
| 401 | Unauthorized |
| 403 | Forbidden |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |

`GET /v1/credits/transactions`

**Response sample** (`application/json`)

```json
{
  "data": [
    {}
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "perPage": 10,
    "totalPages": 10,
    "nextPage": 2,
    "prevPage": 1
  }
}
```

## Webhooks

### Overview

Webhooks are HTTP callbacks that are triggered by specific events in the system. They allow you to receive real-time notifications about changes or actions that occur within the system, such as lead creation, updates, or other relevant events.

Webhooks are typically used to integrate with external systems or services, enabling you to automate workflows and respond to events as they happen.

For example, when a new lead is created, a webhook can be triggered to send the lead data to an external CRM system or notify a third-party service.

Webhooks are configured to send HTTP POST requests to a specified URL, containing relevant data about the event that occurred. This allows you to process the data in real-time and take appropriate actions based on the received information.

**Subscription Multiplicity**

It is possible to create multiple subscriptions for the same event type. Each subscription operates independently and will receive a separate delivery when the corresponding event is emitted.

**Delivery Behavior**

- **Response timeout**: Your endpoint must respond within 5 seconds. If no response is received within this window, the delivery is treated as failed and scheduled for retry.
- **Expected response**: Return any 2xx status code to acknowledge receipt. Any non-2xx status, a connection error, or a timeout marks the delivery as failed.
- **Concurrent delivery**: When a single event matches multiple of your subscriptions, those deliveries are sent in parallel, not sequentially. Do not assume any ordering between them.
- **Retries & at-least-once delivery**: Failed deliveries are retried automatically. Because of retries, your endpoint may occasionally receive the same event more than once. Treat delivery as at-least-once and make your handler idempotent by de-duplicating on the event `id` field in the payload.
- **Fast acknowledgement**: Acknowledge the request as soon as you have persisted it, then process asynchronously. Doing heavy work before responding risks exceeding the 5-second timeout and triggering unnecessary retries.

**Security — HMAC Signature**

If a secret was defined during the event subscription setup, each event delivery will include an HMAC-SHA256 signature.

- The signature is computed using the full event payload as input and the provided secret as the key.
- The resulting signature is sent in the `X-Signature` HTTP header as a hexadecimal string.
- This allows subscribers to verify the authenticity and integrity of the event payload.
- If no secret is defined, the signature header will be omitted.

### List Events

List subscribed events.

Required scope: `webhooks:full_access`

Authorizations: jwt

**Query Parameters**

| Field | Type | Description |
|---|---|---|
| `eventType` | string | Example: `eventType=agent.created`. Event type to filter webhook events |

**Responses**

| Status | Description |
|---|---|
| 200 | List client's webhooks |
| 401 | Unauthorized |
| 403 | Forbidden |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |

`GET /v1/webhooks`

**Response sample** (`application/json`)

```json
{
  "data": [
    {}
  ]
}
```

### Subscribe to Event

Creates a new event subscription.

Required scope: `webhooks:full_access`

Authorizations: jwt

**Request Body** — `application/json`

| Field | Type | Required | Description |
|---|---|---|---|
| `eventId` | string, enum: `user.created`, `user.updated`, `user.deleted`, `user.activated`, `user.deactivated`, `lead.created`, `lead.updated`, `lead.assigned`, `publicProfile.verification.approved`, `publicProfile.verification.rejected`, `listing.published`, `listing.unpublished`, `listing.action`, `listing.publishFailed` | required | The event type that will trigger the webhook. This can be one of the predefined events. |
| `callbackUrl` | string `<uri>` | required | |
| `secret` | string (<= 32 characters) | | A secret key used to sign the webhook payload (HMAC). This is optional and can be used for additional security. |

**Responses**

| Status | Description |
|---|---|
| 201 | Created Webhook |
| 401 | Unauthorized |
| 403 | Forbidden |
| 409 | Conflict |
| 422 | Business Validation Error |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |

`POST /v1/webhooks`

**Request sample** (Payload, `application/json`)

```json
{
  "eventId": "user.created",
  "callbackUrl": "https://example.com/webhook",
  "secret": "pF3Z9km2L7xQhR8dBnAeTfYu"
}
```

**Response sample** (`application/json`)

```json
{
  "eventId": "users.created",
  "url": "https://example.com",
  "createdAt": "2021-01-01T00:00:00Z"
}
```

### Delete Event Subscription

Deletes an event subscription.

Required scope: `webhooks:full_access`

Authorizations: jwt

**Path Parameters**

| Field | Type | Required | Description |
|---|---|---|---|
| `eventId` | string | required | Example: `agent.created`. Event ID |

**Responses**

| Status | Description |
|---|---|
| 204 | Event subscription deleted successfully |
| 401 | Unauthorized |
| 403 | Forbidden |
| 429 | Rate Limited |
| 500 | Internal Server Error |
| 502 | Bad Gateway |

`DELETE /v1/webhooks/{eventId}`

**Response sample** (`application/problem+json`)

```json
{
  "type": "https://problems.atlas.propertyfinder.com/common-http-401-unauthorized/",
  "code": "common_http_401-unauthorized",
  "title": "Unauthorized",
  "detail": "The request requires user authentication.",
  "status": 401,
  "attributes": {
    "trace_id": "5ed6cf5e682562685928b0a227af039d"
  }
}
```

### Events

The following webhook event payloads are delivered to your `callbackUrl` when subscribed.

#### `user.created` Webhook

Triggered when a new user is created.

Required scope: `users:read`

Authorizations: jwt

**Request Body** — `application/json`, required

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string `<uuid>` | required | Unique identifier of the event |
| `type` | string, value: `user.created` | required | Event type indicating a new user was created |
| `timestamp` | string `<date-time>` | required | Timestamp of the event |
| `entity` | object | required | Details of the entity associated with the event |
| `payload` | object | required | Additional details for user events |

**Request sample** (Payload, `application/json`)

```json
{
  "id": "554f3eaf-814a-4068-80b8-7beaaedb7194",
  "type": "user.created",
  "timestamp": "2025-08-24T14:15:22Z",
  "entity": {
    "id": "string",
    "type": "user"
  },
  "payload": {
    "email": "example@propertyfinder.ae"
  }
}
```

#### `user.updated` Webhook

Triggered when a user is updated.

Required scope: `users:read`

Authorizations: jwt

**Request Body** — `application/json`, required

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string `<uuid>` | required | Unique identifier of the event |
| `type` | string, value: `user.updated` | required | Event type indicating a user was updated |
| `timestamp` | string `<date-time>` | required | Timestamp of the event |
| `entity` | object | required | Details of the entity associated with the event |
| `payload` | object | required | Additional user update details |

**Request sample** (Payload, `application/json`)

```json
{
  "id": "554f3eaf-814a-4068-80b8-7beaaedb7194",
  "type": "user.updated",
  "timestamp": "2025-08-24T14:15:22Z",
  "entity": {
    "id": "string",
    "type": "user"
  },
  "payload": {
    "email": "user@example.com",
    "changes": []
  }
}
```

#### `user.deleted` Webhook

Triggered when a user is deleted.

Required scope: `users:read`

Authorizations: jwt

**Request Body** — `application/json`, required

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string `<uuid>` | required | Unique identifier of the event |
| `type` | string, value: `user.deleted` | required | Event type indicating a user was deleted |
| `timestamp` | string `<date-time>` | required | Timestamp of the event |
| `entity` | object | required | Details of the entity associated with the event |
| `payload` | object | required | Additional details for user events |

**Request sample** (Payload, `application/json`)

```json
{
  "id": "554f3eaf-814a-4068-80b8-7beaaedb7194",
  "type": "user.deleted",
  "timestamp": "2025-08-24T14:15:22Z",
  "entity": {
    "id": "string",
    "type": "user"
  },
  "payload": {
    "email": "example@propertyfinder.ae"
  }
}
```

#### `user.activated` Webhook

Triggered when a user is activated.

Required scope: `users:read`

Authorizations: jwt

**Request Body** — `application/json`, required

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string `<uuid>` | required | Unique identifier of the event |
| `type` | string, value: `user.activated` | required | Event type indicating a user was activated |
| `timestamp` | string `<date-time>` | required | Timestamp of the event |
| `entity` | object | required | Details of the entity associated with the event |
| `payload` | object | required | Additional details for user events |

**Request sample** (Payload, `application/json`)

```json
{
  "id": "554f3eaf-814a-4068-80b8-7beaaedb7194",
  "type": "user.activated",
  "timestamp": "2025-08-24T14:15:22Z",
  "entity": {
    "id": "string",
    "type": "user"
  },
  "payload": {
    "email": "example@propertyfinder.ae"
  }
}
```

#### `user.deactivated` Webhook

Triggered when a user is deactivated.

Required scope: `users:read`

Authorizations: jwt

**Request Body** — `application/json`, required

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string `<uuid>` | required | Unique identifier of the event |
| `type` | string, value: `user.deactivated` | required | Event type indicating a user was deactivated |
| `timestamp` | string `<date-time>` | required | Timestamp of the event |
| `entity` | object | required | Details of the entity associated with the event |
| `payload` | object | required | Additional details for user events |

**Request sample** (Payload, `application/json`)

```json
{
  "id": "554f3eaf-814a-4068-80b8-7beaaedb7194",
  "type": "user.deactivated",
  "timestamp": "2025-08-24T14:15:22Z",
  "entity": {
    "id": "string",
    "type": "user"
  },
  "payload": {
    "email": "example@propertyfinder.ae"
  }
}
```

#### `lead.created` Webhook

Triggered when a new lead is created.

Required scope: `leads:read`

Important: Will not trigger for new project leads. Project leads only generate a `lead.assigned` or `lead.updated` webhook notification.

Authorizations: jwt

**Request Body** — `application/json`, required

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string `<uuid>` | required | Unique identifier of the event |
| `type` | string, value: `lead.created` | required | Event type indicating a lead was created |
| `timestamp` | string `<date-time>` | required | Timestamp of the event |
| `entity` | object | required | Details of the entity associated with the event |
| `payload` | object | required | Additional details for lead events |

**Request sample** (Payload, `application/json`)

```json
{
  "id": "lead-created-12345678",
  "type": "lead.created",
  "timestamp": "2025-08-24T14:15:22Z",
  "entity": {
    "id": "string",
    "type": "lead"
  },
  "payload": {
    "channel": "whatsapp",
    "status": "sent",
    "entityType": "listing",
    "publicProfile": {},
    "listing": {},
    "project": {},
    "developer": {},
    "responseLink": "https://example.com",
    "sender": {}
  }
}
```

#### `lead.updated` Webhook

Triggered when a new lead is updated.

Required scope: `leads:read`

Authorizations: jwt

**Request Body** — `application/json`, required

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string `<uuid>` | required | Unique identifier of the event |
| `type` | string, value: `lead.updated` | required | Event type indicating a lead was updated |
| `timestamp` | string `<date-time>` | required | Timestamp of the event |
| `entity` | object | required | Details of the entity associated with the event |
| `payload` | object | required | Additional details for lead events |

**Request sample** (Payload, `application/json`)

```json
{
  "id": "lead-updated-12345678",
  "type": "lead.updated",
  "timestamp": "2025-08-24T14:15:22Z",
  "entity": {
    "id": "string",
    "type": "lead"
  },
  "payload": {
    "channel": "whatsapp",
    "status": "sent",
    "entityType": "listing",
    "publicProfile": {},
    "listing": {},
    "project": {},
    "developer": {},
    "responseLink": "https://example.com",
    "sender": {}
  }
}
```

#### `lead.assigned` Webhook

Triggered when a new lead is assigned (it is used in new project leads mainly).

Required scope: `leads:read`

Authorizations: jwt

**Request Body** — `application/json`, required

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string `<uuid>` | required | Unique identifier of the event |
| `type` | string, value: `lead.assigned` | required | Event type indicating a lead was assigned |
| `timestamp` | string `<date-time>` | required | Timestamp of the event |
| `entity` | object | required | Details of the entity associated with the event |
| `payload` | object | required | Additional details for lead events |

**Request sample** (Payload, `application/json`)

```json
{
  "id": "lead-assigned-12345678",
  "type": "lead.assigned",
  "timestamp": "2025-08-24T14:15:22Z",
  "entity": {
    "id": "string",
    "type": "lead"
  },
  "payload": {
    "channel": "whatsapp",
    "status": "sent",
    "entityType": "listing",
    "publicProfile": {},
    "listing": {},
    "project": {},
    "developer": {},
    "responseLink": "https://example.com",
    "sender": {}
  }
}
```

#### `publicProfile.verification.approved` Webhook

Triggered when a public profile verification state is changed to 'approved'.

Required scope: `users:read`

Authorizations: jwt

**Request Body** — `application/json`, required

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string `<uuid>` | required | Unique identifier of the event |
| `type` | string, value: `publicProfile.verification.approved` | required | Event type indicating a public profile verification was approved |
| `timestamp` | string `<date-time>` | required | Timestamp of the event |
| `entity` | object | required | Details of the entity associated with the event |
| `payload` | object | required | Additional details for public profile verification approved event |

**Request sample** (Payload, `application/json`)

```json
{
  "id": "554f3eaf-814a-4068-80b8-7beaaedb7194",
  "type": "publicProfile.verification.approved",
  "timestamp": "2025-08-24T14:15:22Z",
  "entity": {
    "id": "string",
    "type": "publicProfile"
  },
  "payload": {
    "email": "example@propertyfinder.ae"
  }
}
```

#### `publicProfile.verification.rejected` Webhook

Triggered when a public profile verification state is changed to 'rejected'.

Required scope: `users:read`

Authorizations: jwt

**Request Body** — `application/json`, required

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string `<uuid>` | required | Unique identifier of the event |
| `type` | string, value: `publicProfile.verification.rejected` | required | Event type indicating a public profile verification was rejected |
| `timestamp` | string `<date-time>` | required | Timestamp of the event |
| `entity` | object | required | Details of the entity associated with the event |
| `payload` | object | required | Additional details for public profile verification rejected event |

**Request sample** (Payload, `application/json`)

```json
{
  "id": "554f3eaf-814a-4068-80b8-7beaaedb7194",
  "type": "publicProfile.verification.rejected",
  "timestamp": "2025-08-24T14:15:22Z",
  "entity": {
    "id": "string",
    "type": "publicProfile"
  },
  "payload": {
    "email": "example@propertyfinder.ae",
    "reason": "Invalid BRN"
  }
}
```

#### `listing.published` Webhook

Triggered when a listing is published.

Required scope: `listings:read`

Authorizations: jwt

**Request Body** — `application/json`, required

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string `<uuid>` | required | Unique identifier of the event |
| `type` | string, value: `listing.published` | required | Event type indicating a listing was published |
| `timestamp` | string `<date-time>` | required | Timestamp of the event |
| `entity` | object | required | Details of the entity associated with the event |
| `payload` | object | required | Empty payload as this event does not require additional data |

**Request sample** (Payload, `application/json`)

```json
{
  "id": "554f3eaf-814a-4068-80b8-7beaaedb7194",
  "type": "listing.published",
  "timestamp": "2025-08-24T14:15:22Z",
  "entity": {
    "id": "01K0YB4HEKM08V901DVJ5ATVYF",
    "type": "listing"
  },
  "payload": {}
}
```

#### `listing.unpublished` Webhook

Triggered when a listing is unpublished.

Required scope: `listings:read`

Authorizations: jwt

**Request Body** — `application/json`, required

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string `<uuid>` | required | Unique identifier of the event |
| `type` | string, value: `listing.unpublished` | required | Event type indicating a listing was unpublished |
| `timestamp` | string `<date-time>` | required | Timestamp of the event |
| `entity` | object | required | Details of the entity associated with the event |
| `payload` | object | required | Empty payload as this event does not require additional data |

**Request sample** (Payload, `application/json`)

```json
{
  "id": "554f3eaf-814a-4068-80b8-7beaaedb7194",
  "type": "listing.unpublished",
  "timestamp": "2025-08-24T14:15:22Z",
  "entity": {
    "id": "01K0YB4HEKM08V901DVJ5ATVYF",
    "type": "listing"
  },
  "payload": {}
}
```

#### `listing.action` Webhook

Triggered when an action is created, updated, or expires for a listing.

Required scope: `listings:read`

**Overview**

Actions are compliance and quality notifications created when a listing violates business or regulatory rules. Each action identifies a specific issue that requires resolution within a defined grace period.

If you don't resolve the issue before the deadline, enforcement actions may be automatically applied, such as unpublishing the listing or triggering permit revalidation.

**Examples:**

- **DLD Permit Mismatch**: If DLD permit data is mismatched, a `listing_trakheesi_checks` action is created. You must correct the permit information before the deadline, or the listing may be automatically unpublished.
- **Incomplete Location**: If your listing doesn't provide a complete location path (e.g., only "Southwest Apartments" instead of "Southwest Apartments 1" or "Southwest Apartments 2"), a `listing_location_update_required` action is created. Update to a more specific location to keep your Quality Score unaffected.

**Action Lifecycle**

This single webhook event type covers all action lifecycle changes (`pending`, `dispute_created`, `expired`). Use the `status` field to determine the specific state.

**Status Values**

- `pending`: Action has been newly created and is awaiting client response
- `dispute_created`: Client has disputed the action
- `expired`: Action has expired (see `reason` field for details)

**Expiration Reasons**

When status is `expired`, the `reason` field provides context:

- `RESOLVED`: Client successfully resolved the issue
- `ACTION_TIMEOUT`: Client did not take action before the deadline
- `DISPUTE_ACCEPTED`: Client's dispute was accepted by the PF Support team
- `DISPUTE_REJECTED`: Client's dispute was rejected by the PF Support team
- `DANGLING_PARENT`: Parent action expired because all child actions expired with no pending children remaining

**Key Fields**

**Action Type**

The `actionType` field indicates the specific compliance or quality issue. Actions are categorized by country:

| Country | Action Types |
|---|---|
| KSA | `rega_invalid_permit`, `rega_expired_permit` |
| UAE | DLD Permit issues: `incorrect_permit_type`, `unique_permit_type`, `invalid_permit_type`, `listing_trakheesi_invalid`, `listing_trakheesi_checks`, `project_permit_violation`. ADREC Permit issues: `listing_adrec_expire_soon`, `listing_adrec_invalid`, `adrec_sub_permit_already_used`, `adrec_sub_permit_expired`, `adrec_sub_permit_required`, `adrec_sub_permits_exhausted`. Verification issues: `listing_unable_to_verify`. Agent License issues: `listing_invalid_brn`, `listing_invalid_bln`. Transaction-related: `claimed_transaction`, `listing_delist_transacted` |
| Common for all countries | Property status: `unavailable_property`. Quality issues: `listing_duplicate`, `listing_price_issue`, `listing_location_update_required` |

**Expire Action**

The optional `expireAction` field specifies what happens if the client doesn't resolve the issue before expiration:

- `listing_unpublish`: The listing will be taken down from live state
- `revalidate_permit`: The permit will be revalidated

Not all actions have an expire action defined.

**Remarks**

The optional `remarks` field contains additional comments from the PF Support team to provide more context about the action. This is typically used when extra clarification or specific instructions are needed beyond the standard action message.

Authorizations: jwt

**Request Body** — `application/json`, required

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | required | Unique identifier of the event |
| `type` | string, value: `listing.action` | required | Event type indicating an action on a listing was created |
| `timestamp` | string `<date-time>` | required | Timestamp of the event |
| `entity` | object | required | Details of the entity associated with the event |
| `payload` | object | required | Additional details for listing action events |

**Request sample** (Payload, `application/json`)

```json
{
  "id": "action-created-15582193",
  "type": "listing.action",
  "timestamp": "2025-08-24T14:15:22Z",
  "entity": {
    "id": "01K0YB4HEKM08V901DVJ5ATVYF",
    "type": "listing"
  },
  "payload": {
    "actionType": "listing_location_update_required",
    "status": "pending",
    "reason": "RESOLVED",
    "entityType": "listing",
    "expiresAt": "2025-11-16T19:31:13Z",
    "expireAction": "listing_unpublish",
    "message": {},
    "remarks": "A discrepancy was found in the specified location. Please verify the correct address and update accordingly.",
    "agent": {},
    "listing": {}
  }
}
```

#### `listing.publishFailed` Webhook

Triggered when a listing fails to publish to the Property Finder platform due to any validation failures, or any platform failures. The `reasons` field in the payload contains human-readable details about the failure when available.

Required scope: `listings:read`

Authorizations: jwt

**Request Body** — `application/json`, required

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string `<uuid>` | required | Unique identifier of the event |
| `type` | string, value: `listing.publishFailed` | required | Event type indicating a listing failed to publish |
| `timestamp` | string `<date-time>` | required | Timestamp of the event |
| `entity` | object | required | Details of the entity associated with the event |
| `payload` | object | required | |
