# Local Dev Credentials

**These accounts exist ONLY in your local development database** (`apps/pocketbase/pb_data/`, rebuilt fresh during this session). They are **not** accounts on production (`mandera.site`) — that is a separate, real PocketBase instance this environment has no access to.

The original local database was permanently locked (unrecoverable `PB_ENCRYPTION_KEY`) and was moved aside to `apps/pocketbase/pb_data.locked-backup/` rather than deleted. A brand-new local database was created from `pb_migrations/`, which auto-seeds the demo accounts below.

---

## App login accounts (seeded by `pb_migrations/`)

### Master admin (platform operator — manages all tenant companies)
- URL: `http://localhost:3000/master-login`
- Email: `master@realestate.com`
- Password: `Master@123456`
- Role: `master_admin`

### Company admin (demo tenant — the actual CRM: clients/properties/owners/revenue)
- URL: `http://localhost:3000/company-login`
- Email: `admin@goldrealestate.com`
- Password: `Admin@123456`
- Role: `company_super_admin`
- Company: "شركة العقارات الذهبية" (Gold Real Estate Company), code `COMP001`
- Note: this demo company's `subscriptionEndDate` was originally `2025-12-31` (already expired relative to today) — it was manually extended to `2027-12-31` in the local database so login succeeds. This edit only exists locally; it was made directly via the PocketBase API, not through a migration file.

---

## PocketBase dashboard / server-level account

### Superuser (PocketBase's own root admin — separate from the `master_admins` app collection above)
- URL: `http://localhost:8090/_/`
- Email: `admin@localdev.test`
- Password: `LocalDevAdmin123!`
- Set via `PB_SUPERUSER_EMAIL`/`PB_SUPERUSER_PASSWORD` environment variables when PocketBase was started — not stored anywhere else, only effective for this local `pb_data`.

### Local encryption key
- `PB_ENCRYPTION_KEY=local-dev-encryption-key-not-for-production`
- Needed as an env var any time you restart PocketBase locally (`--encryptionEnv=PB_ENCRYPTION_KEY`), or it will fail to start with `invalid settings db data or missing encryption key`.

---

## How to start both servers locally

```
# Terminal 1 — PocketBase backend
cd apps/pocketbase
$env:PB_ENCRYPTION_KEY = "local-dev-encryption-key-not-for-production"   # PowerShell
./pocketbase.exe serve --http=0.0.0.0:8090 --hooksWatch=false

# Terminal 2 — Next.js frontend
cd apps/web
npm run dev
```

Frontend: http://localhost:3000
PocketBase API/dashboard: http://localhost:8090

---

## Security note

These are throwaway local credentials — fine for local development, but:
- Never commit real production secrets to this or any file in the repo
- If this repo is ever pushed to a shared/public location, treat this file as something to `.gitignore` or delete first
