# Portal Account Setup — Bayut & PropertyFinder

This document covers the human, one-time process of getting Mandera's own account access to each
portal's API — where to log in, what to request, and what you get back. It does not cover how the
app *uses* those credentials at runtime; for that, see
[`portal-integration-plan.md`](portal-integration-plan.md) (architecture) and
[`propertyfinder-integration-notes.md`](propertyfinder-integration-notes.md) (auth flow).

**This document does not contain any real credential values.** Issued keys, secrets, and login
details are tracked separately in `.claude/LOCAL_DEV_CREDENTIALS.md` (gitignored, local-only) —
see that file, or your production secrets manager, for the actual values.

## PropertyFinder — Enterprise API

Official guide: [How to integrate your CRM with PF Expert 2.0 using the Enterprise API](https://support.propertyfinder.ae/hc/en-us/articles/28266806720914-How-to-integrate-your-CRM-with-PF-Expert-2-0-using-the-Enterprise-API).

1. Log into **PF Expert** with the account's decision-maker credentials.
2. Navigate to **Developer Resources → API Credentials**.
3. Generate a new API key/secret pair, using type **API Integration**.
4. Exchange the pair for a Bearer JWT by calling PropertyFinder's token endpoint — the exact
   request/response shape is documented in
   [`propertyfinder-integration-notes.md`](propertyfinder-integration-notes.md#2-authentication).

**Handling the issued key/secret:**

- These are credentials for Mandera's live PropertyFinder account, not a sandbox — treat them as
  production secrets from the moment they're issued.
- Store them in `.claude/LOCAL_DEV_CREDENTIALS.md` for local development, and in each company's
  entry under **Settings → Portals** for production use (`company_portal_credentials`, per the
  per-company credential model described in `portal-integration-plan.md`).
- Never commit them to the repository, paste them into other docs, or share them outside the team.

## Bayut — Profolio sandbox

Bayut provisions API access through **Profolio**, their partner portal, via a sandbox account for
the Listings API.

1. Bayut's team emails an account-setup / password-reset link for the sandbox account.
2. Complete account setup via that link on first login.
3. Log into Profolio: https://www.bayut.com/profolio/signin
4. API documentation is available inside Profolio's top banner once logged in.
5. General developer docs: https://developers.bayut.com/

The issued login and API token are sandbox credentials for testing — see
`.claude/LOCAL_DEV_CREDENTIALS.md` for the current values and
[`bayut-dubizzle-xml-guidelines.pdf`](bayut-dubizzle-xml-guidelines.pdf) for the feed format they
unlock access to.

## If credentials are ever exposed

Rotate immediately with the portal (PF Expert → Developer Resources for PropertyFinder; contact
Bayut support for Profolio) and update `.claude/LOCAL_DEV_CREDENTIALS.md` with the new values. Do
not reuse an exposed credential after rotation.
