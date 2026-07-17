<div align="center">
  <img src="docs/logo.png" alt="Mandera CRM logo" width="140" />

  # Mandera CRM

  **A multi-tenant, bilingual (Arabic/English) SaaS CRM built for real estate brokerages in the UAE.**

  [![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black?logo=next.js)](https://nextjs.org/)
  [![PocketBase](https://img.shields.io/badge/PocketBase-0.38-blueviolet?logo=pocketbase)](https://pocketbase.io/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
  [![i18n](https://img.shields.io/badge/i18n-EN%20%2F%20AR-informational)](#internationalization)

</div>

---

## Table of contents

- [What is this?](#what-is-this)
- [Who uses it](#who-uses-it)
- [Core domain](#core-domain)
- [Key features](#key-features)
- [Tech stack](#tech-stack)
- [Architecture at a glance](#architecture-at-a-glance)
- [Project structure](#project-structure)
- [Database schema](#database-schema)
- [Internationalization](#internationalization)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [License](#license)

---

## What is this?

**Mandera CRM** is a subscription-based back-office platform purpose-built for real estate brokerages operating in the UAE. It replaces spreadsheets and scattered WhatsApp threads with a single system for managing property listings, landlord/seller relationships, buyer/tenant leads, sales-agent assignments, and commission tracking — fully bilingual (Arabic and English, with native RTL layout support), so it works equally well for Arabic-first and English-first teams.

The product is a genuine **B2B SaaS**: a single platform operator ("Mandera") onboards and bills multiple independent brokerage companies (tenants) from one admin dashboard. Each tenant's data — its properties, clients, owners, employees, and revenue — is fully isolated from every other tenant, enforced not just in the UI but at the database rule level, so tenant isolation holds even if the frontend were bypassed entirely.

This is not a generic, industry-agnostic CRM template. Its data model is shaped specifically around real-estate brokerage workflows: RERA/DLD advertising permit numbers, emirate/area location fields, commission percentages, sale-vs-rent listing types, and marketing-channel attribution to the specific platforms UAE brokerages actually advertise on (Property Finder, Bayut, Dubizzle, etc.).

---

## Who uses it

Mandera CRM has two separate authentication realms, each with its own login page and its own role hierarchy:

| Role | Realm | Scope |
|---|---|---|
| **Master Admin** | Platform | The Mandera team. Onboards new brokerage tenants, sets subscription start/end dates and employee limits, freezes or unfreezes a tenant's access for billing enforcement, and manages the public-facing legal pages (Privacy Policy, Terms of Service) shown on the marketing site. |
| **Company Super Admin** | Tenant | The owner or manager of a subscribing brokerage. Full visibility into their company's data: manages employees, property types, client/owner status pipelines, marketing channels, and is the only role that can view the revenue/commission ledger. |
| **Company Employee** | Tenant | A sales agent working for a brokerage. Scoped to only the owners, properties, and clients explicitly assigned to them — both in the UI and enforced server-side, so an employee cannot see or edit another agent's book of business. |

---

## Core domain

| Entity | What it tracks |
|---|---|
| **Properties** | Listings with price, commission percentage, land/building area, emirate and area, listing type (sale or rent), a RERA/DLD-style advertising permit number, and up to 12 photos per listing. |
| **Owners** | Landlords and sellers, each moved through a per-company configurable status pipeline (e.g. *New Lead → Negotiating → Listed*), with a full audit trail of every status change. |
| **Clients** | Buyers and tenants (leads), tracked through their own sales pipeline, with follow-up date/time scheduling and a complete interaction history — each client can express interest in up to 4 properties at once. |
| **Employees** | Sales agents, officers, and managers, each with an HR profile separate from their login identity, and assignable to specific owners, properties, and clients. |
| **Revenue** | A commission ledger recording completed deals — visible only to Company Super Admins, never to individual agents. |
| **Marketing channels** | Every owner and client records the channel that brought them in (Google, Facebook, Instagram, TikTok, Property Finder, Bayut, Dubizzle, and more), enabling attribution reporting across the pipeline. |

---

## Key features

- 🌐 **Full bilingual UI** — every screen, form, toast, and table is available in both English and Arabic, with the layout mirroring correctly for RTL (right-to-left) reading in Arabic mode, including third-party UI primitives (Radix dropdowns, selects, dialogs).
- 🏢 **True multi-tenancy** — tenant isolation is enforced declaratively at the database layer (PocketBase collection rules), not just filtered in application code, so one tenant can never see another's data.
- 🔐 **Two-tier, cookie-based authentication** — separate Master Admin and Company (Super Admin / Employee) login flows, with session state readable server-side so Next.js middleware can block unauthenticated access before any protected page is ever rendered.
- 📊 **Role-scoped dashboards** — Company Super Admins see full company-wide metrics and a team leaderboard; employees see only their own assigned pipeline.
- 📅 **Follow-up scheduling** — a dedicated calendar widget surfaces upcoming and overdue client follow-ups on the company dashboard.
- 📧 **Automated assignment notifications** — when a property, owner, or client is (re)assigned to an employee, a bilingual HTML email is sent automatically via a PocketBase server hook.
- 📤 **CSV export** — clients, owners, and revenue data can all be exported to CSV, with UTF-8 BOM handling so Arabic text renders correctly in Excel.
- 💳 **Subscription lifecycle enforcement** — tenant accounts can be frozen or allowed to lapse based on subscription end date, blocking company login while preserving the underlying data.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend framework | [Next.js](https://nextjs.org/) (App Router) + React 18 |
| Backend & database | [PocketBase](https://pocketbase.io/) — self-hosted Go binary bundling a SQLite database, auto-generated REST API, built-in auth, and file storage |
| Authentication | Cookie-based PocketBase auth store, gated server-side by Next.js middleware |
| UI components | [shadcn/ui](https://ui.shadcn.com/) ("new-york" style) built on [Radix UI](https://www.radix-ui.com/) primitives |
| Styling | [Tailwind CSS](https://tailwindcss.com/), themed via CSS custom properties for light/dark mode |
| Rich text editing | [Tiptap](https://tiptap.dev/) (used for the legal-pages editor) |
| Charts | [Recharts](https://recharts.org/) |
| Internationalization | [i18next](https://www.i18next.com/) / react-i18next — English + Arabic, full RTL support |
| Language | Plain JavaScript / JSX (no TypeScript) |
| Monorepo tooling | npm workspaces + [`concurrently`](https://www.npmjs.com/package/concurrently) |
| Hosting | Hostinger |

---

## Architecture at a glance

```
┌─────────────────────┐        cookie-based auth        ┌──────────────────────┐
│   Next.js Frontend   │ ───────────────────────────────▶│  PocketBase Backend   │
│   (apps/web)         │◀─────────────────────────────── │  (apps/pocketbase)    │
│                       │      auto-generated REST API     │                        │
│  • App Router pages  │                                  │  • SQLite database    │
│  • middleware.js      │                                  │  • Collection rules   │
│    (route protection) │                                  │    (multi-tenancy +   │
│  • React Context      │                                  │     role enforcement) │
│    (auth, language)   │                                  │  • JS server hooks    │
└─────────────────────┘                                  │    (email, CLI tools) │
                                                            └──────────────────────┘
```

There is no separate custom API layer between the frontend and the database — PocketBase's auto-generated REST API *is* the backend API, and every collection's access rules (who can list/view/create/update/delete which rows) are declared directly in the migration files. Multi-tenancy is enforced at that rule layer by comparing each record's `company_id` against the authenticated user's own `companyId`, so isolation holds even if a request bypassed the frontend entirely.

For the full write-up — every route, every collection, every server hook, and the reasoning behind each architectural decision — see the [documentation](#documentation) below.

---

## Project structure

```
mandera-crm/
├── apps/
│   ├── web/                       # Next.js frontend
│   │   └── src/
│   │       ├── app/                 # App Router pages, nested layouts, middleware.js
│   │       ├── components/          # Feature components + shadcn/ui primitives (components/ui/)
│   │       ├── contexts/            # MasterAuthContext, CompanyAuthContext, LanguageContext
│   │       ├── hooks/               # Reusable data/state hooks (employee counts, subscription status, etc.)
│   │       ├── lib/                 # PocketBase client — separate browser and server instances
│   │       └── locales/             # en.json / ar.json translation dictionaries
│   │
│   └── pocketbase/                # Backend + database
│       ├── pb_migrations/           # ~80 files — schema history, the source of truth for the DB shape
│       ├── pb_hooks/                 # Custom server-side JS: assignment emails, mailer proxy, admin UI proxy, migration CLI
│       └── pocketbase                # PocketBase server binary (Linux, for deployment)
│
├── docs/                           # README assets
└── package.json                    # Workspace root — runs both apps together via `concurrently`
```

---

## Database schema

The schema is defined entirely through PocketBase migrations (`apps/pocketbase/pb_migrations/`) — there is no separate ORM or hand-written SQL. The core collections:

**Auth collections** (built-in login/password support):
`master_admins` · `company_super_admins` · `company_employees`

**Business collections:**
`companies` (tenant root) · `employees` · `owners` · `properties` · `clients` · `revenues` · `property_types` · `client_statuses` · `owner_statuses` · `marketing_channels` · `legal_pages`

**Audit-trail collections:**
`client_status_history` · `owner_status_history` · `property_status_history`

Every business collection carries a `company_id` (or `companyId`) field, and every access rule checks that field against the requesting user's own tenant — this is the mechanism that makes the platform multi-tenant. See [`.claude/PROJECT_ARCHITECTURE.md`](.claude/PROJECT_ARCHITECTURE.md) for the complete field-by-field schema and the full rules matrix per collection.

---

## Internationalization

The app ships with complete English and Arabic translations (`apps/web/src/locales/{en,ar}.json`), switchable at runtime from the header on every screen. Arabic mode also flips the entire layout to right-to-left, including third-party component internals (dropdown checkmarks, popover placement) via Radix UI's `DirectionProvider`, not just CSS text alignment.

---

## Getting started

### Prerequisites

- **Node.js 22** (see `.nvmrc`)
- A **PocketBase binary** matching your OS — the binary committed at `apps/pocketbase/pocketbase` is a Linux build (for deployment). If you're on Windows or macOS, download the matching build from the [PocketBase releases page](https://github.com/pocketbase/pocketbase/releases), using the exact version in `apps/pocketbase/.pocketbase-version`.

### Install dependencies

```bash
npm install
```

This installs dependencies for the whole workspace (both `apps/web` and `apps/pocketbase`) from the repo root.

### Run locally

```bash
npm run dev
```

This starts the Next.js frontend and the PocketBase backend together:

- Frontend → [http://localhost:3000](http://localhost:3000)
- PocketBase API & admin dashboard → [http://localhost:8090](http://localhost:8090)

> **Windows users:** the committed `apps/pocketbase/pocketbase` binary is Linux-only and won't run natively. Download the Windows build as described above, save it as `apps/pocketbase/pocketbase.exe` (the `dev` script already targets this filename), and it will be picked up automatically.

### Local login credentials

Demo accounts are seeded automatically by the migrations. See [`.claude/LOCAL_DEV_CREDENTIALS.md`](.claude/LOCAL_DEV_CREDENTIALS.md) for the current local login details.

---

## Available scripts

Run from the repository root unless noted otherwise:

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js frontend and PocketBase backend together, for local development |
| `npm run build` | Build the Next.js app for production |
| `npm run start` | Start PocketBase in production mode |
| `npm run lint` | Lint the frontend codebase |

---

## Deployment

The production deployment runs on **Hostinger**, with the Next.js frontend and the PocketBase backend deployed as separate services behind a shared origin/reverse proxy. PocketBase's `--dir=/data` flag in the `start` script assumes a mounted persistent volume for the SQLite database and file storage in that environment.

Secrets (`PB_ENCRYPTION_KEY`, `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD`, mailer credentials) are injected as real environment variables by the hosting platform at runtime — none are committed to this repository.

---

## Documentation

Deep-dive architecture references, covering every route, database collection, access rule, and server hook in detail:

- [`.claude/PROJECT_ARCHITECTURE.md`](.claude/PROJECT_ARCHITECTURE.md) — original architecture reference (backend/database sections are current; frontend sections describe the pre-migration Vite SPA)
- [`.claude/PROJECT_ARCHITECTURE_V2_NEXTJS.md`](.claude/PROJECT_ARCHITECTURE_V2_NEXTJS.md) — current Next.js frontend architecture, including the auth/middleware model
- [`.claude/LOCAL_DEV_CREDENTIALS.md`](.claude/LOCAL_DEV_CREDENTIALS.md) — local development login credentials and setup notes

---

## License

Private / proprietary. All rights reserved.
