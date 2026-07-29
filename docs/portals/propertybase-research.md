# Research Notes: How Propertybase Integrates with These Portals

Propertybase is an unrelated Salesforce-based real-estate CRM that ships its own integration with
Dubizzle, Bayut, and PropertyFinder. Early in scoping Mandera's own portal-publishing feature, its
public support article was reviewed as a cross-check on field requirements and portal behavior —
not as a spec for either portal (that's [`propertyfinder-integration-notes.md`](propertyfinder-integration-notes.md)
and [`bayut-dubizzle-xml-guidelines.pdf`](bayut-dubizzle-xml-guidelines.pdf)), but as evidence for
what an existing, shipped integration found necessary in practice.

Everything below is distilled from that article; Salesforce-specific setup steps (Object Manager,
Page Layouts, Process Builder automations, Propertybase's own feed-URL API) are omitted since
they don't describe anything Mandera's implementation needs to replicate.

## Fields every listing needs, regardless of portal

Propertybase's required-field list lines up closely with what Mandera's own schema ended up
requiring (see [`portal-integration-plan.md`](portal-integration-plan.md#field-mapping-reference)):
marketing title, price (+ price unit for rentals), bedrooms, bathrooms, size, property type and
subtype (from each portal's fixed value list), listing type (rent/sale), description, a
broker-assigned listing ID, and the RERA permit number (Dubai) or DTCM permit number (Dubai
short-term rentals via PropertyFinder).

Two portal-specific quirks worth knowing:

- **Bedrooms for studios differ by portal.** PropertyFinder maps `0` bedrooms to "Studio"
  automatically. Dubizzle instead expects `Property Type = Studio` as a separate selection, with
  bedrooms still submitted as `0`.
- **Optional fields** commonly mapped: Arabic title/description, developer, available-from/to
  dates, and amenities (private/commercial) — all portal-hardcoded value lists, not free text (see
  below).

## Location must be validated, not typed

Both Dubizzle and PropertyFinder required a dedicated location-lookup step rather than a free-text
address — a full-text search against each portal's own location tree, with the selection stored
back onto the listing. This confirms the same design Mandera adopted: PropertyFinder publishing
requires resolving `pf_location_id` via `searchLocations` before a listing can go out, and the
Bayut/dubizzle feed carries a structured `city`/`locality`/`sub_locality`/`tower_name` tree rather
than a single address string.

## Amenities are a closed vocabulary

Propertybase's support article is explicit that "amenities are hard-coded and we can only provide
what the feeds support" — custom amenity values silently don't show up on the portal. This matches
`src/lib/portals/amenities.ts` in this codebase: Mandera maps its own free-form amenity picks to a
fixed enum before sending anything to PropertyFinder, for the same reason.

## Media tagging conventions

Propertybase tags media assets by purpose — a floor-plan image, a virtual video tour link, a 360°
tour link — rather than using separate fields per media type. Mandera's schema instead uses typed
columns (`video_urls`, a floor-plan uploader), but the underlying constraint is the same one this
article surfaces: portals expect floor plans and videos as distinctly identified assets, not just
another photo in the gallery.

## Publish latency

Per Propertybase's support team, listing updates typically reach the portal within 30 minutes to
2 hours, depending on how often that portal polls the feed — there's no guaranteed real-time
propagation for pull-based portals. This matches the "effective on the portal's next crawl"
caveat already documented for Mandera's own Bayut/dubizzle toggle in
[`portal-integration-plan.md`](portal-integration-plan.md).

## Not applicable to Mandera

The bulk of the source article covers Salesforce/Propertybase mechanics specific to that platform:
installing their "Middle East Portal" package, editing Salesforce page layouts, Process Builder
automation for auto-publish flags, and generating feed URLs through Propertybase's own `/api/v2/feed/`
endpoint pattern. None of this transfers — Mandera's own feed and publish architecture is described
in full in [`portal-integration-plan.md`](portal-integration-plan.md).

## Source

["Middle East Property Portal Integration"](https://help.propertybase.com/hc/en-us/articles/202899016-Middle-East-Property-Portal-Integration),
Propertybase Help Center. Third-party documentation, not an authoritative spec for Bayut, dubizzle,
or PropertyFinder — see `propertybase-research.png` for a capture of the original article.
