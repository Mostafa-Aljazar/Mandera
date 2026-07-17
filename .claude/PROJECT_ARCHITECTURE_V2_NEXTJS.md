# Mandera CRM — Architecture Reference V2 (Next.js Frontend)

This is the updated architecture doc reflecting the frontend migration from **Vite + React + react-router-dom** to **Next.js App Router**. The original doc, [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md), remains as a historical record of the pre-migration Vite SPA — refer to it for the backend/PocketBase sections (unchanged) and for context on what changed and why.

**Scope of the migration**: frontend framework/routing only. The PocketBase backend (`apps/pocketbase/`) was **not touched** — same ~15 collections, same migrations, same hooks, same REST API, same multi-tenant rule matrix. Visual styling (Tailwind classes, shadcn/ui components, layout) was preserved exactly — this was a routing/framework port, not a redesign.

---

## What changed

| | Before (V1) | After (V2) |
|---|---|---|
| Framework | React 18 + Vite 7 | React 18 + **Next.js (App Router)** |
| Routing | `react-router-dom` v7, routes declared in `src/App.jsx` | Next.js file-based routing under `src/app/` |
| Auth storage | PocketBase SDK default `LocalAuthStore` (browser `localStorage` only) | **Cookie-based** PocketBase `authStore` (`loadFromCookie`/`exportToCookie`) |
| Route protection | Client-side only — `ProtectedMasterRoute`/`ProtectedCompanyRoute` wrapper components, auth checked after JS loads (protected HTML briefly visible pre-hydration) | **`src/middleware.js`** — checked server-side before any HTML is sent; unauthenticated requests to protected paths get a `307` redirect with no page content in the response |
| Build tool | Vite | Next.js's own bundler (Turbopack/Webpack under the hood) |
| Dev-tooling | `apps/web/plugins/` (Hostinger Horizons visual editor, iframe bridging), `tools/generate-llms.js` | **Removed entirely** — Horizons/Vite-specific, no Next.js equivalent needed |
| Static SPA deploy artifact | `index.html` + `public/.htaccess` (Apache rewrite rules) | Removed — Next.js needs a running Node server (`next start`), not a static file server |

---

## Frontend — `apps/web` (post-migration)

### Stack
- **Next.js** (App Router), React 18.3
- **PocketBase JS SDK** (`pocketbase ^0.25.0`) — same client library, now cookie-backed instead of localStorage-backed
- **Tailwind CSS 3.4 + shadcn/ui + Radix UI** — unchanged, zero visual changes
- Still **plain JavaScript/JSX, no TypeScript** — `jsconfig.json` retained as-is
- Still **no Redux/Zustand/React Query** — same React Context + `useState`/`useEffect` pattern per page
- `react-helmet` retained (not migrated to Next's `metadata` API) — see rationale below

### File structure
```
apps/web/
├── next.config.js              # dev-only rewrite: /hcgi/platform -> local PocketBase (prod still relies on Hostinger's own proxying of that path)
├── jsconfig.json                # unchanged: "@/*" -> "./src/*"
├── tailwind.config.js          # unchanged
├── components.json             # "rsc": true (was false)
├── eslint.config.mjs           # migrated to Next.js's flat ESLint config (next/core-web-vitals)
├── public/                     # (the old .htaccess was removed — no longer applicable)
└── src/
    ├── app/                     # Next.js App Router — replaces src/App.jsx + src/pages/
    │   ├── layout.jsx            # root layout: <html>, metadata, wraps children in Providers
    │   ├── page.jsx               # / (Home)
    │   ├── privacy-policy/page.jsx
    │   ├── terms-of-service/page.jsx
    │   ├── master-login/page.jsx
    │   ├── master-dashboard/
    │   │   ├── page.jsx
    │   │   └── companies/
    │   │       ├── page.jsx
    │   │       ├── new/page.jsx
    │   │       └── [id]/page.jsx
    │   ├── globals.css            # moved from src/index.css — Tailwind directives + brand theme tokens, RTL/rich-text/Tiptap styles
    │   ├── admin/legal-pages/page.jsx
    │   ├── company-login/page.jsx
    │   ├── company-dashboard/
    │   │   ├── page.jsx
    │   │   └── employees/
    │   │       ├── page.jsx
    │   │       ├── new/page.jsx
    │   │       └── [id]/page.jsx
    │   ├── employees/page.jsx
    │   ├── settings/page.jsx
    │   ├── owners/page.jsx
    │   ├── properties/
    │   │   ├── page.jsx
    │   │   └── [id]/page.jsx
    │   ├── clients/page.jsx
    │   └── revenue/page.jsx
    ├── middleware.js             # NEW — server-side auth/route protection
    ├── lib/
    │   ├── pocketbaseClient.js   # rewritten: cookie-backed, 'use client', lazily-constructed singleton
    │   ├── pocketbaseServer.js   # NEW — server-only PocketBase instance for middleware (reads cookie header, never touches localStorage)
    │   └── utils.js              # unchanged
    ├── contexts/                 # MasterAuthContext, CompanyAuthContext, LanguageContext — same public API, now 'use client'
    ├── components/
    │   ├── Providers.jsx          # NEW — client wrapper combining all context providers + Toaster + ScrollToTop (replaces src/App.jsx's provider tree)
    │   ├── ui/                    # shadcn primitives — unchanged
    │   └── *.jsx                   # feature components — react-router-dom calls swapped to next/navigation, 'use client' added
    ├── config/i18n.js             # 'use client', guarded against double-init
    └── locales/, hooks/, utils/   # unchanged
```

All 21 routes from the original `react-router-dom` route table were ported 1:1 into this folder structure — see the table in the "What changed" section's context, or diff against [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) section 2a for the original route list.

### Routing — Next.js App Router
Flat file-based routing replaces the single `src/App.jsx` route table. Every route previously wrapped in `<ProtectedMasterRoute>`/`<ProtectedCompanyRoute>` is now protected by `middleware.js` instead — those wrapper components (`ProtectedMasterRoute.jsx`, `ProtectedCompanyRoute.jsx`, `ProtectedRoute.jsx`) were **deleted** as dead code once middleware took over their job.

Mechanical API swaps applied throughout:
- `useNavigate()` → `useRouter()` from `next/navigation` (`router.push`/`router.replace`)
- `useParams()` → `useParams()` from `next/navigation` (same shape, param now comes from the `[id]` folder segment)
- `useLocation()` → `usePathname()` from `next/navigation`
- `<Link to="...">` → `<Link href="...">` from `next/link`
- `<Navigate to="..." replace>` → `useEffect(() => router.replace(...))` pattern (client components can't use the server `redirect()` function)

### Authentication — now cookie-based with real server-side protection
This is the one genuine architectural upgrade in this migration (not just a mechanical port), because the user explicitly asked for it:

**`src/lib/pocketbaseClient.js`** — client-side, `'use client'`, lazily constructs a single `PocketBase` instance. Instead of the SDK's default `LocalAuthStore` (which only lives in `localStorage`, invisible to the server), it:
1. Loads existing auth state from `document.cookie` on construction (`authStore.loadFromCookie`)
2. Re-syncs the cookie on every auth change (`authStore.onChange` → `authStore.exportToCookie`)

**`src/lib/pocketbaseServer.js`** — server-only, exports `getServerPocketbase(cookieHeader)`: builds a fresh `PocketBase` instance per request and hydrates it from the `Cookie` request header. Never touches `localStorage`/`document` — safe to run in middleware/Node.

**`src/middleware.js`** — the actual security fix. Intercepts requests to two sets of protected path prefixes:
- Master-admin paths (`/master-dashboard`, `/admin/legal-pages`) → requires a valid session with `role === 'master_admin'`
- Company paths (`/company-dashboard`, `/employees`, `/settings`, `/owners`, `/properties`, `/clients`, `/revenue`) → requires a valid session from either the `company_super_admins` or `company_employees` collection

Unauthenticated requests get redirected (`307`) to `/master-login` or `/company-login` **before the server renders any protected page content** — verified via `curl`, e.g. `curl -I http://localhost:3000/company-dashboard` returns a redirect with no dashboard HTML in the response body. Under the old SPA, the protected page's HTML shell was always sent; the client-side `Protected*Route` wrapper only redirected *after* JavaScript loaded and ran.

**Known, intentional scope boundary**: middleware only validates session identity/role (mirrors what `ProtectedMasterRoute`/`ProtectedCompanyRoute` used to check). The additional tenant business-rule checks — `is_frozen`, `isActive`, `subscriptionEndDate` — still happen client-side in `CompanyAuthContext.jsx`'s `login()`/init flow, not in middleware, to avoid adding a second PocketBase fetch (and latency) to every single protected-route navigation. This means a company whose subscription expires *after* login won't be kicked out by middleware alone on next navigation — same behavior as before the migration, not a regression, just not newly hardened either.

### `react-helmet` — deliberately kept, not migrated to Next's `metadata` API
Every page uses `<Helmet><title>...</title></Helmet>` for per-page titles. Since every page in this app is a Client Component (`'use client'` — confirmed there's no server-rendering opportunity anywhere, all data fetching is `useEffect` + PocketBase), Next's `metadata`/`generateMetadata` exports (which only work in Server Components) weren't a drop-in option without a larger restructure. `react-helmet` still works identically in the browser under Next.js, so it was left as-is — a deliberate, low-risk choice for a lift-and-shift migration, not an oversight.

### i18n
`src/config/i18n.js` is `'use client'`-only and guarded with `if (!i18n.isInitialized)` to avoid double-initialization under Next.js's dev-mode Fast Refresh (Vite's single-module-instance guarantee doesn't carry over identically). No routing-based i18n (no `/en/`, `/ar/` URL prefixes) — language is still a single-URL, client-toggled state exactly as before.

### Verified working (production build + manual checks)
- `npm run build --prefix apps/web` compiles all 21 routes successfully, zero server/client boundary errors
- `npm run lint --prefix apps/web` passes clean
- `npm run dev --prefix apps/web` boots on port 3000; public pages return `200`, protected pages return `307` redirects to the correct login page when unauthenticated
- Dynamic segments (`/properties/[id]`, `/master-dashboard/companies/[id]`, `/company-dashboard/employees/[id]`) resolve correctly

### Not yet verified (needs a human pass)
- Full login flow end-to-end in a real browser (cookie gets set correctly, dashboard loads real PocketBase data) — the `curl` checks above prove routing/middleware structure but not actual authenticated data-fetching
- Arabic/RTL rendering and language toggle behavior in-browser
- Visual parity spot-check against the pre-migration version (styling was not intentionally changed, but a manual look is worth doing)

---

## Root monorepo changes
`package.json` at the repo root: the `start` script now also launches the Next.js server (`next start` via `apps/web`'s `start` script) alongside PocketBase, since Next.js requires a running Node process — unlike the old Vite build, which produced a static SPA that could be served by a plain file server/CDN.

---

## Unchanged (see original doc for full detail)
- **Backend**: `apps/pocketbase/` — PocketBase v0.38.0, ~84 migrations, 10 custom JS hooks, full multi-tenant collection/rules matrix. Nothing here was touched.
- **Database schema**: all ~15 collections, relations, and API rules exactly as documented in [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md).
- **Product scope**: still the same multi-tenant, bilingual real-estate CRM for UAE brokerages described in that doc's opening section.
