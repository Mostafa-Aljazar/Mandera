<div align="center">
  <img src="docs/logo.png" alt="Mandera CRM logo" width="140" />

  # Mandera CRM

  **A multi-tenant, bilingual (Arabic/English) SaaS CRM built for real estate brokerages in the UAE.**

  [![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black?logo=next.js)](https://nextjs.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3FCF8E?logo=supabase)](https://supabase.com/)
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
- 🏢 **True multi-tenancy** — tenant isolation is enforced with Postgres Row Level Security, so one tenant can never see another's data.
- 🔐 **Two-tier, cookie-based authentication** — separate Master Admin and Company (Super Admin / Employee) login flows, with session state readable server-side so Next.js middleware can block unauthenticated access before any protected page is ever rendered.
- 📊 **Role-scoped dashboards** — Company Super Admins see full company-wide metrics and a team leaderboard; employees see only their own assigned pipeline.
- 📅 **Follow-up scheduling** — a dedicated calendar widget surfaces upcoming and overdue client follow-ups on the company dashboard.
- 📤 **CSV export** — clients, owners, and revenue data can all be exported to CSV, with UTF-8 BOM handling so Arabic text renders correctly in Excel.
- 💳 **Subscription lifecycle enforcement** — tenant accounts can be frozen or allowed to lapse based on subscription end date, blocking company login while preserving the underlying data.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend framework | [Next.js](https://nextjs.org/) (App Router) + React 18 |
| Backend & database | [Supabase](https://supabase.com/) — Postgres, Auth, Storage, and Realtime |
| Authentication | Supabase Auth with cookie sessions, gated by Next.js middleware |
| UI components | [shadcn/ui](https://ui.shadcn.com/) ("new-york" style) built on [Radix UI](https://www.radix-ui.com/) primitives |
| Styling | [Tailwind CSS](https://tailwindcss.com/), themed via CSS custom properties for light/dark mode |
| Rich text editing | [Tiptap](https://tiptap.dev/) (used for the legal-pages editor) |
| Charts | [Recharts](https://recharts.org/) |
| Internationalization | [i18next](https://www.i18next.com/) / react-i18next — English + Arabic, full RTL support |
| Data layer | Server Actions + TanStack Query |
| Hosting | Hostinger |

---

## Architecture at a glance

```
┌─────────────────────┐     Server Actions / SSR      ┌──────────────────────┐
│   Next.js App        │ ─────────────────────────────▶│  Supabase             │
│   (repo root)        │◀───────────────────────────── │  (Postgres + Auth)    │
│                       │                                │                        │
│  • App Router pages  │                                │  • Multi-tenant RLS   │
│  • middleware.ts     │                                │  • Auth sessions      │
│    (route protection)│                                │  • Storage / Realtime │
│  • Server Actions    │                                │                        │
└─────────────────────┘                                └──────────────────────┘
```

Server Actions in `src/actions/` are the only place that talk to Supabase. Pages and components call actions (usually via TanStack Query hooks), never the Supabase client directly. Tenant isolation is enforced with Postgres Row Level Security.

For deeper architecture notes, see the [documentation](#documentation) below.

---

## Project structure

```
mandera-crm/
├── src/
│   ├── app/                 # App Router pages, nested layouts
│   ├── actions/             # Server Actions (Supabase access)
│   ├── components/          # Feature components + shadcn/ui primitives
│   ├── contexts/            # Auth + language providers
│   ├── hooks/               # TanStack Query hooks and shared state
│   ├── lib/                 # Supabase clients, utilities
│   ├── locales/             # en.json / ar.json translation dictionaries
│   ├── middleware.ts        # Session refresh + route protection
│   └── types/               # Shared TypeScript types
├── supabase/
│   └── migrations/          # SQL schema migrations
├── public/                  # Static assets
├── docs/                    # README assets
├── package.json
└── next.config.js
```

---

## Database schema

The schema lives in `supabase/migrations/` and is applied in the Supabase SQL Editor (or CLI). Core tables include:

**Auth / profiles:** `profiles` (roles: master admin, company super admin, employee)

**Business tables:**
`companies` (tenant root) · `employees` · `owners` · `properties` · `clients` · `revenues` · `property_types` · `client_statuses` · `owner_statuses` · `marketing_channels` · `legal_pages` · `area_districts`

**Audit-trail tables:**
`client_status_history` · `owner_status_history` · `property_status_history`

Every business table carries a `company_id`, and RLS policies scope access to the authenticated user's tenant.

---

## Internationalization

The app ships with complete English and Arabic translations (`src/locales/{en,ar}.json`), switchable at runtime from the header on every screen. Arabic mode also flips the entire layout to right-to-left, including third-party component internals (dropdown checkmarks, popover placement) via Radix UI's `DirectionProvider`, not just CSS text alignment.

---

## Getting started

### Prerequisites

- **Node.js 22** (see `.nvmrc`)
- A Supabase project with the SQL migrations in `supabase/migrations/` applied
- `.env.local` with your Supabase URL and keys

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Frontend → [http://localhost:3000](http://localhost:3000)

### Local login credentials

See [`.claude/LOCAL_DEV_CREDENTIALS.md`](.claude/LOCAL_DEV_CREDENTIALS.md) for local login details.

---

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Build the Next.js app for production |
| `npm run start` | Start the production Next.js server |
| `npm run lint` | Lint the codebase |

---

## Deployment

Deploy the Next.js app to your host (e.g. Hostinger). Point environment variables at your Supabase project. Secrets are injected at runtime — none are committed to this repository.

---

## Documentation

- [`.claude/PROJECT_ARCHITECTURE_V2_NEXTJS.md`](.claude/PROJECT_ARCHITECTURE_V2_NEXTJS.md) — Next.js frontend architecture
- [`.claude/SUPABASE_MIGRATION_STATUS.md`](.claude/SUPABASE_MIGRATION_STATUS.md) — Supabase migration status
- [`.claude/SUPABASE_MIGRATION_PLAN.md`](.claude/SUPABASE_MIGRATION_PLAN.md) — migration plan notes
- [`.claude/LOCAL_DEV_CREDENTIALS.md`](.claude/LOCAL_DEV_CREDENTIALS.md) — local login credentials (gitignored)

---

## License

Private / proprietary. All rights reserved.
