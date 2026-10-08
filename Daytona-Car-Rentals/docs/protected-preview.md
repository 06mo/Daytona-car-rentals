# Protected Vercel Preview readiness — 2026-10-08

Status: local preparation only. No push, Vercel configuration change, deployment, purchase or live-rental enablement is authorized by this document. The repository already serves production; do not assume a branch push is harmless before checking its integrations.

## What was inspected

- Worktree `/projects/Daytona-coastal-experience`, branch `feat/supabase-rental-backend`; Git origin `https://github.com/06mo/Daytona-car-rentals.git`. Owner-verified Vercel settings: Production tracks `main`; Preview tracks all unassigned branches; Standard Protection is enabled; Preview has no custom domains. This branch is not `main`.
- Application is nested under `Daytona-Car-Rentals/`. Next.js 15.5.27, npm lockfile, build command `npm run build` (only `next build`), Node engine `>=24.0.0`. No build/start hook runs migrations, seeds or hosted tests. API routes use Node runtime, server-only pg and a bounded pool with Vercel lifecycle handling.
- No tracked `vercel.json`, `.vercel/project.json`, GitHub workflow or local Vercel project link was found. `next.config.ts` contains image hosts and response headers, not deployment promotion logic. No Vercel tool/credential/CLI login is available here. The owner has verified the branch/protection/domain settings above. Project/team identity, root/build overrides, effective Node/Fluid Compute settings, exact generated branch hostname and existing variable scopes have not been independently inspected here.
- The old `DEPLOYMENT.md` described SQLite/persistent-disk hosting. It now points to the Postgres and preview instructions. The coastal SQLite checkpoint remains a recovery source, not the proposed Vercel runtime.

## Preview database separation decision

The owner has designated **daytona-rentals-dev** (`moxcovrhondqpjykslkh`) exclusively for synthetic hosted Vercel Preview. Its existing migrations, demo identity, configuration and synthetic records are retained; no reset/reseed is required or authorized. **mts-ag-services is out of scope and must remain untouched.**

Development now uses the preserved loopback Postgres demo and its local credentials. Preview uses daytona-rentals-dev and its distinct restricted runtime login. Production remains separate and unchanged. This reassignment satisfies the documented database/credential separation: a new Supabase project is no longer needed merely for separation. Do not reconnect ordinary local development to the preview ledger. Historical `hosted-development/` evidence refers to checks made before reassignment; those actual database checks remain applicable to the same project.

Existing preview migrations 001/002 and role/demo checks have already succeeded. Keep launch settings closed. Do not migrate, seed or reset from a Vercel build. The one-off `check-hosted-development.ts` is historical/manual validation against this exact project, not a development connection or automatic CI job; do not rerun it as part of this documentation/configuration pass.

See [the two-stage bootstrap plan](preview-two-stage.md) to discover the real branch hostname without enabling writes. Its Stage 1 omitted-variable instructions supersede the final-value table below until the hostname is known.

## Exact environment-variable checklist

Create each entry in **Preview only**, restricted to Git branch **`feat/supabase-rental-backend`**. Review inherited/team/integration variables for this branch, but do not modify or copy Production values. The database endpoint is selected below. The exact generated Vercel branch origin still needs to be copied from Dashboard; project name/account slug have not been provided and no URL may be guessed.

| Variable | Exact intended value / handling |
| --- | --- |
| `DCR_DATABASE_URL` | Secret: `postgresql://dcr_runtime.moxcovrhondqpjykslkh:<URL_ENCODED_RUNTIME_PASSWORD>@aws-0-us-east-1.pooler.supabase.com:6543/postgres`. Reuse the existing privately saved restricted credential for daytona-rentals-dev, now Preview-only. Never use local-development or owner credentials. |
| `DCR_DATABASE_CA` | Full PEM contents from `/projects/daytona-private/supabase-ca.crt`, already verified for this exact endpoint. Multiline text (literal `\n` also supported), not the file path. No private key. |
| `DCR_DEMO_MODE` | Literal `true`. Runtime rejects live mode on Vercel Preview and rejects a mismatched durable database identity. |
| `DCR_SITE_ORIGIN` | Exact `https://<VERIFIED_STABLE_PREVIEW_BRANCH_HOSTNAME>`, with no trailing slash/path. This is the one browser origin permitted for JSON writes. Do not use localhost, production's domain, a wildcard or literal `$VERCEL_URL`. |
| `DCR_ADMIN_PASSWORD_HASH` | Secret: a unique Preview-only scrypt hash in the existing `salt:hexhash` format, generated privately by the preparation helper below. Never production's hash; never a plaintext password. Keep the corresponding password with authorized reviewers only. |
| `NEXT_PUBLIC_APP_URL` | The same exact verified HTTPS Preview origin, for public metadata. This is intentionally non-secret. |

Keep **unset**: `DCR_DATABASE_SSL`, `DCR_DATABASE_PATH`, `DCR_MIGRATION_DATABASE_URL`, `DCR_TEST_ADMIN_URL`, `DCR_TEST_RUNTIME_PASSWORD`, backup/owner credentials, Supabase service-role keys and `NODE_TLS_REJECT_UNAUTHORIZED`. No `NEXT_PUBLIC_` database URL/password. Do not override Vercel's `NODE_ENV`/`VERCEL_ENV`; verify the deployed target reports `VERCEL_ENV=preview`. Never rely on `.env.local` or a local CA path in a function.

The app compares Origin exactly and does not interpolate environment variables. Obtain the real stable branch URL from the verified Vercel project/branch configuration. Reviewers must browse that URL; immutable deployment URLs with different origins can render but their POSTs will be rejected. If the alias cannot be known until an initial protected preview exists, perform that first authorized deployment with writes deliberately unavailable, then configure its verified branch origin in Preview and redeploy. Do not weaken same-origin checks to solve URL discovery. Environment changes apply on subsequent deployments ([Vercel environment guidance](https://vercel.com/docs/environment-variables)).

## Production-safe deployment plan (not executed)

1. Preserve the owner-verified configuration: Production=`main`, Preview=all unassigned branches, Standard Protection enabled, no Preview custom domains. Obtain the actual project/team identity and generated branch origin; check root/build overrides, effective Node/Fluid Compute and any additional deploy hooks without altering production. No authenticated dashboard/API inspection was performed here.
2. Retain the production branch, domains, production environment entries and global settings. Expected app root is `Daytona-Car-Rentals`, npm lockfile install and Next.js build; compare with existing settings rather than overwriting them. Confirm this branch can use Node 24+ and Fluid Compute without changing the running production project's configuration. If shared settings must change, stop and design an isolated preview-project alternative; do not silently change the production project.
3. Retain the verified Standard Protection setting. Verify Vercel Authentication actually protects the first authorized Preview, with production access policy unchanged. Check branch/immutable URLs and no public bypass/share link. Vercel Authentication is available across plans, but actual account access/protection scope must be inspected ([official protection guidance](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)). The application owner login is not a replacement for whole-deployment protection. Do not buy password protection or publish bypass tokens.
4. Set only the branch-specific Preview variables above and select the isolated Preview database. A later explicitly authorized Git push of **this branch only** can create a Preview in the existing linked project after steps 1–3 pass. Never merge into the production branch, use `--prod`, promote a deployment, reassign a production alias or change production variables. Vercel normally uses non-production branches for Preview, but this repository's actual integration must be confirmed first ([deployment environments](https://vercel.com/docs/deployments/environments)). No push command has been run.
5. Verify unauthenticated requests encounter Vercel protection, authorized reviewers can load the intended preview origin, demo banner/owner authentication/CSRF work, and synthetic trip state persists. Check cold/warm/suspend/resume, multi-instance contention, connection budget and expired holds. Database remains synthetic and requests are never confirmed as real rentals. Automation bypass, if later needed, belongs only in a private test runner/header, not browser code or public URLs.

## Pooler-to-database TLS investigation

**Observed before reassignment:** the client's socket reports TLS 1.3, encrypted=true and authorized=true using the supplied CA. A query on the pooled Postgres backend reports `pg_stat_ssl.ssl=false`. These are two different connections. Evidence is in `hosted-development/client-tls.json` and `results.json` outside Git. This establishes verified client-to-pooler TLS, not end-to-end TLS.

**Official guidance:** Supabase's [connection-monitoring documentation](https://supabase.com/docs/guides/troubleshooting/monitor-supavisor-postgres-connections) describes Supavisor as an intermediary and uses `pg_stat_ssl` to inspect database-side connections. Official [Supavisor tenant configuration](https://supabase.github.io/supavisor/configuration/tenants/) distinguishes client `enforce_ssl` from upstream `upstream_ssl`, `upstream_verify` and `upstream_tls_ca`. This explains why a client CA cannot by itself change the upstream connection. The [SSL enforcement guide](https://supabase.com/docs/guides/platform/ssl-enforcement) does not establish this project's internal topology or prove upstream TLS.

**Not verified:** whether the managed project intentionally disables upstream TLS, how that hop is isolated, and whether a customer-supported TLS option exists. A community reply in [discussion 50379](https://github.com/orgs/supabase/discussions/50379) claims a private-network design with upstream TLS disabled, but its author was not verified as Supabase staff; it is **not** treated as an official support response or assurance. Open-source tenant settings likewise do not prove the hosted fleet's configuration. No support message was sent.

Prepared support question (for later owner-authorized submission): “For project moxcovrhondqpjykslkh on the shared transaction pooler in us-east-1, our client verifies TLS 1.3, but pg_stat_ssl for pg_backend_pid() returns ssl=false. Please confirm the pooler-to-Postgres transport, isolation guarantees, whether upstream TLS and certificate verification are configurable/supported on Hosted, and the supported connection option if TLS on every hop is required. Please distinguish client SSL enforcement from upstream TLS.” No password, private key or record data is needed.

Do not relax client certificate verification or claim the observation is harmless. Obtain an official project-specific answer before treating the internal-transport question as resolved. No topology/configuration change or paid alternative was attempted.

## Remaining gates

- Exact generated branch origin/project identity and confirmation of remaining build/runtime overrides. Production branch, Preview targeting, Standard Protection and absence of Preview custom domains are owner-verified.
- Private entry of four branch-scoped variables for stage 1, then two URL variables for stage 2; database selection/separation is resolved without provisioning or reseeding.
- Confirmation of managed upstream transport (or an explicitly reviewed synthetic-preview-only acceptance while production sign-off stays blocked).
- Hosted backup-role provisioning/restore proof and Data API exposure verification remain production-readiness requirements; local backup tests are not hosted proof.
- Five unpatched dev-only braces-chain audit entries remain documented in `dependency-security.md`. Production dependency audit is zero. Previously passed: 25 local database tests, 23 production Chromium tests, TypeScript/build, and focused hosted-development checks.


## Secure variable entry (preparation only)

Run `/projects/daytona-private/prepare-vercel-preview.py` directly in a private terminal. Choose stage 1 for read-only bootstrap with both URL variables omitted, or stage 2 to enter the **actual HTTPS branch origin**. It asks for a new Preview-only owner password twice using hidden input only if no private Preview hash has been prepared. The runtime password is reused from the existing owner-only private file, never displayed. It generates the compatible scrypt hash and writes four values for stage 1 (no URL files), or six for stage 2, to a fresh 0700 directory with 0600 files, all outside Git. No network operation occurs. Retired hosted-development helpers now refuse to launch, and their original contents are retained privately for recovery.

For a later authorized upload, first verify the existing Vercel project/team link. In Dashboard, add only the four non-URL entries for stage 1, then the two URL entries for stage 2, with **Preview only → Git branch `feat/supabase-rental-backend`**; do not select Production or all Preview branches. Transfer value contents privately, not through chat. Mark database URL and owner hash sensitive where supported. Leave production entries and shared defaults unchanged.

Alternatively, with an already verified CLI project link and authorization to edit Preview variables, use stdin from each private file ([official CLI environment reference](https://vercel.com/docs/cli/env)). Example (set `PREVIEW_VALUES_DIR` to the private directory printed by the helper):

```sh
vercel env add DCR_DATABASE_URL preview feat/supabase-rental-backend < "$PREVIEW_VALUES_DIR/DCR_DATABASE_URL"
```

Repeat for the other stage-appropriate names (four total in stage 1, six in stage 2), preserving the explicit Preview/branch arguments. Do not print/cat the files or put values in argv; do not use broad `env pull`, `--force`, `--prod`, or an unverified project link. If a branch-specific entry exists, update that entry deliberately rather than altering a shared/Production value. No variable upload or CLI linking was performed during preparation.

The correct `DCR_SITE_ORIGIN` and `NEXT_PUBLIC_APP_URL` are the same verified **generated branch HTTPS origin**, not daytona-rentals-dev, not localhost, not the production domain and not literal `$VERCEL_URL`. No Preview custom domain exists. Without the actual generated hostname, final origin entry remains pending; all other values are concrete or privately available.
