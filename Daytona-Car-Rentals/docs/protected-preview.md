# Protected Vercel Preview readiness — 2026-10-08

Status: local preparation only. No push, Vercel configuration change, deployment, purchase or live-rental enablement is authorized by this document. The repository already serves production; do not assume a branch push is harmless before checking its integrations.

## What was inspected

- Worktree `/projects/Daytona-coastal-experience`, branch `feat/supabase-rental-backend`; Git origin `https://github.com/06mo/Daytona-car-rentals.git`. Cached `origin/HEAD` is `origin/main`. That is not proof of Vercel's configured Production Branch.
- Application is nested under `Daytona-Car-Rentals/`. Next.js 15.5.27, npm lockfile, build command `npm run build` (only `next build`), Node engine `>=24.0.0`. No build/start hook runs migrations, seeds or hosted tests. API routes use Node runtime, server-only pg and a bounded pool with Vercel lifecycle handling.
- No tracked `vercel.json`, `.vercel/project.json`, GitHub workflow or local Vercel project link was found. `next.config.ts` contains image hosts and response headers, not deployment promotion logic. No Vercel tool/credential/CLI login is available here. Existing Vercel project/team ID, linked repository settings, root/build overrides, production branch, domain aliases, protection and environment-variable scopes remain **unverified**.
- The old `DEPLOYMENT.md` described SQLite/persistent-disk hosting. It now points to the Postgres and preview instructions. The coastal SQLite checkpoint remains a recovery source, not the proposed Vercel runtime.

## Preview database separation decision

`docs/postgres-backend.md` requires separate projects/databases **and distinct credentials** for development, Preview and Production. The currently tested Supabase project `moxcovrhondqpjykslkh` is development and remains in use by the local app. Do **not** copy its runtime password/URL into Vercel Preview.

An isolated Preview database plus its own runtime credentials is required. A separate Supabase project is the straightforward option; an appropriately isolated Supabase database branch could also satisfy the database rule after its availability, credentials and cost are confirmed. A second schema/login pointing to the same development ledger does not satisfy it. No new paid resource or exception to separation is approved. If no existing isolated preview database is available, provisioning/selection is a blocker requiring a separate decision.

The preview database must have migrations 001 and 002 applied by an operator, a durable `demo` identity and synthetic seed only, with launch settings still closed. Give its runtime login only `dcr_app` privileges: no owner, BYPASSRLS, CREATE, CREATEROLE or CREATEDB. Do not put migrations in a Vercel build command. Run role/identity/quote/idempotency/conflict checks on that selected preview database; existing development-project evidence does not substitute. The current `check-hosted-development.ts` intentionally refuses any other project; do not run it against Preview by disguising its target.

## Exact environment-variable checklist

Create each entry in **Preview only**, restricted to Git branch **`feat/supabase-rental-backend`**. Review inherited/team/integration variables for this branch, but do not modify or copy Production values. The actual preview project and hostname have not been selected, so placeholders below must be replaced from verified dashboard details, never guessed.

| Variable | Exact intended value / handling |
| --- | --- |
| `DCR_DATABASE_URL` | Secret: `postgresql://dcr_runtime.<PREVIEW_PROJECT_REF>:<URL_ENCODED_PREVIEW_RUNTIME_PASSWORD>@<PREVIEW_CONNECT_PANEL_POOLER_HOST>:6543/postgres`. Use the selected Preview project's transaction-pooler endpoint and restricted login, not development's credential or an owner URL. |
| `DCR_DATABASE_CA` | Complete trusted CA PEM text for that endpoint, entered as multiline content (literal `\n` also supported by the driver). No filesystem path; no private key. Obtain/verify for Preview rather than assuming development's CA applies. |
| `DCR_DEMO_MODE` | Literal `true`. Runtime rejects live mode on Vercel Preview and rejects a mismatched durable database identity. |
| `DCR_SITE_ORIGIN` | Exact `https://<VERIFIED_STABLE_PREVIEW_BRANCH_HOSTNAME>`, with no trailing slash/path. This is the one browser origin permitted for JSON writes. Do not use localhost, production's domain, a wildcard or literal `$VERCEL_URL`. |
| `DCR_ADMIN_PASSWORD_HASH` | Secret: a unique Preview-only scrypt hash in the existing `salt:hexhash` format, generated privately with `npm run admin:setup`. Never production's hash; never a plaintext password. Keep the corresponding password with authorized reviewers only. |
| `NEXT_PUBLIC_APP_URL` | The same exact verified HTTPS Preview origin, for public metadata. This is intentionally non-secret. |

Keep **unset**: `DCR_DATABASE_SSL`, `DCR_DATABASE_PATH`, `DCR_MIGRATION_DATABASE_URL`, `DCR_TEST_ADMIN_URL`, `DCR_TEST_RUNTIME_PASSWORD`, backup/owner credentials, Supabase service-role keys and `NODE_TLS_REJECT_UNAUTHORIZED`. No `NEXT_PUBLIC_` database URL/password. Do not override Vercel's `NODE_ENV`/`VERCEL_ENV`; verify the deployed target reports `VERCEL_ENV=preview`. Never rely on `.env.local` or a local CA path in a function.

The app compares Origin exactly and does not interpolate environment variables. Obtain the real stable branch URL from the verified Vercel project/branch configuration. Reviewers must browse that URL; immutable deployment URLs with different origins can render but their POSTs will be rejected. If the alias cannot be known until an initial protected preview exists, perform that first authorized deployment with writes deliberately unavailable, then configure its verified branch origin in Preview and redeploy. Do not weaken same-origin checks to solve URL discovery. Environment changes apply on subsequent deployments ([Vercel environment guidance](https://vercel.com/docs/environment-variables)).

## Production-safe deployment plan (not executed)

1. Read the existing Vercel project settings with authorized read access: team/project ID, Git repo, Production Branch, all production domain mappings, Root Directory, framework/build/install overrides, effective Node runtime, Fluid Compute and Git deploy hooks. Check any GitHub/org automation capable of promoting or deploying branches. Confirm this feature branch is **not** a production branch/custom production trigger. No authenticated dashboard/API inspection was possible here.
2. Retain the production branch, domains, production environment entries and global settings. Expected app root is `Daytona-Car-Rentals`, npm lockfile install and Next.js build; compare with existing settings rather than overwriting them. Confirm this branch can use Node 24+ and Fluid Compute without changing the running production project's configuration. If shared settings must change, stop and design an isolated preview-project alternative; do not silently change the production project.
3. Confirm Vercel Authentication protects Preview deployments **before** the first authorized push/deploy, with the existing production access policy unchanged. Check branch/immutable URLs and no public bypass/share link. Vercel Authentication is available across plans, but actual account access/protection scope must be inspected ([official protection guidance](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)). The application owner login is not a replacement for whole-deployment protection. Do not buy password protection or publish bypass tokens.
4. Set only the branch-specific Preview variables above and select the isolated Preview database. A later explicitly authorized Git push of **this branch only** can create a Preview in the existing linked project after steps 1–3 pass. Never merge into the production branch, use `--prod`, promote a deployment, reassign a production alias or change production variables. Vercel normally uses non-production branches for Preview, but this repository's actual integration must be confirmed first ([deployment environments](https://vercel.com/docs/deployments/environments)). No push command has been run.
5. Verify unauthenticated requests encounter Vercel protection, authorized reviewers can load the intended preview origin, demo banner/owner authentication/CSRF work, and synthetic trip state persists. Check cold/warm/suspend/resume, multi-instance contention, connection budget and expired holds. Database remains synthetic and requests are never confirmed as real rentals. Automation bypass, if later needed, belongs only in a private test runner/header, not browser code or public URLs.

## Pooler-to-database TLS investigation

**Observed:** the existing development client's socket reports TLS 1.3, encrypted=true and authorized=true using the supplied CA. A query on the pooled Postgres backend reports `pg_stat_ssl.ssl=false`. These are two different connections. Evidence is in `hosted-development/client-tls.json` and `results.json` outside Git. This establishes verified client-to-pooler TLS, not end-to-end TLS.

**Official guidance:** Supabase's [connection-monitoring documentation](https://supabase.com/docs/guides/troubleshooting/monitor-supavisor-postgres-connections) describes Supavisor as an intermediary and uses `pg_stat_ssl` to inspect database-side connections. Official [Supavisor tenant configuration](https://supabase.github.io/supavisor/configuration/tenants/) distinguishes client `enforce_ssl` from upstream `upstream_ssl`, `upstream_verify` and `upstream_tls_ca`. This explains why a client CA cannot by itself change the upstream connection. The [SSL enforcement guide](https://supabase.com/docs/guides/platform/ssl-enforcement) does not establish this project's internal topology or prove upstream TLS.

**Not verified:** whether the managed project intentionally disables upstream TLS, how that hop is isolated, and whether a customer-supported TLS option exists. A community reply in [discussion 50379](https://github.com/orgs/supabase/discussions/50379) claims a private-network design with upstream TLS disabled, but its author was not verified as Supabase staff; it is **not** treated as an official support response or assurance. Open-source tenant settings likewise do not prove the hosted fleet's configuration. No support message was sent.

Prepared support question (for later owner-authorized submission): “For project moxcovrhondqpjykslkh on the shared transaction pooler in us-east-1, our client verifies TLS 1.3, but pg_stat_ssl for pg_backend_pid() returns ssl=false. Please confirm the pooler-to-Postgres transport, isolation guarantees, whether upstream TLS and certificate verification are configurable/supported on Hosted, and the supported connection option if TLS on every hop is required. Please distinguish client SSL enforcement from upstream TLS.” No password, private key or record data is needed.

Do not relax client certificate verification or claim the observation is harmless. Obtain an official project-specific answer before treating the internal-transport question as resolved. No topology/configuration change or paid alternative was attempted.

## Remaining gates

- Authorized inspection of the existing Vercel project's production branch/root/settings/protection and actual preview origin.
- A separate Preview database/project or suitably isolated branch and distinct restricted credentials; operator setup outside Vercel.
- Confirmation of managed upstream transport (or an explicitly reviewed synthetic-preview-only acceptance while production sign-off stays blocked).
- Hosted backup-role provisioning/restore proof and Data API exposure verification remain production-readiness requirements; local backup tests are not hosted proof.
- Five unpatched dev-only braces-chain audit entries remain documented in `dependency-security.md`. Production dependency audit is zero. Previously passed: 25 local database tests, 23 production Chromium tests, TypeScript/build, and focused hosted-development checks.
