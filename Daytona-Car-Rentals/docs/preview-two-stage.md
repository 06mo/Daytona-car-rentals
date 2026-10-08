# Two-stage protected Preview plan

Preparation only. No push/deployment or Vercel variable upload has occurred. Local development remains on loopback Postgres; daytona-rentals-dev is exclusively the synthetic Preview database. No migration, reset, reseed or hosted-record changes are part of either setup stage. mts-ag-services, main, Production variables, domains and Standard Protection remain unchanged.

## Inspection findings

| Setting | Build/start behavior | Request behavior |
| --- | --- | --- |
| `DCR_SITE_ORIGIN` | Not validated by build/start. No lookup of Vercel URL variables. | `lib/pilot/http.ts:14`: when NODE_ENV=production (including Next production builds on Preview), missing/empty origin returns 503 before parsing the body, rate limiting or creating quotes/requests. A nonempty value must exactly match the Origin header. |
| `NEXT_PUBLIC_APP_URL` | Read by `lib/data/localBusinessSchema.ts:5`; used for static metadata, schema, sitemap and robots. No explicit URL validation. Missing value in Vercel Preview now resolves to an empty base (relative metadata). Outside Preview, the existing production-domain fallback is unchanged. Explicit values still take precedence. Public/static output requires a rebuild when changed. | Does not authorize requests or override DCR_SITE_ORIGIN. |

Customer quote/request POSTs and owner-session POST/DELETE call the origin guard before writes. Admin state POST requires authentication first, then the same guard before mutation. There is no customer-write-capable GET route. In demo mode the database's requestsEnabled flag does not itself close simulated requests, so do not rely on that flag for bootstrap write protection.

Vercel documents `VERCEL_BRANCH_URL` and `VERCEL_URL` at build and runtime, without `https://`. A carefully validated, Preview-only resolver could use the platform branch variable as a single exact allowed origin without trusting Host/forwarded headers or allowing arbitrary vercel.app origins. **The code does not implement that resolver or expand variable references in configured values.** We are retaining its strict explicit-origin check rather than adding an untested alternate authorization path. The deployment URL also differs from the stable branch alias, and Vercel documents a Standard Protection caveat for `VERCEL_URL`. Never use `VERCEL_PROJECT_PRODUCTION_URL`, which can point to production even on Preview. [Official system-variable reference](https://vercel.com/docs/environment-variables/system-environment-variables).

## Stage 1 — protected read-only bootstrap

Before the first push, enter the following values in the **existing verified Vercel project → Preview → Git branch `feat/supabase-rental-backend` only**:

| Name | Stage 1 value |
| --- | --- |
| `DCR_DATABASE_URL` | Existing private restricted runtime URL for daytona-rentals-dev: host aws-0-us-east-1.pooler.supabase.com, port 6543, database postgres, username dcr_runtime.moxcovrhondqpjykslkh. Encoded password stays private. |
| `DCR_DATABASE_CA` | Full PEM text from `/projects/daytona-private/supabase-ca.crt`; never a local file path or private key. |
| `DCR_DEMO_MODE` | `true` |
| `DCR_ADMIN_PASSWORD_HASH` | Unique privately generated Preview owner hash. Sign-in remains disabled by the missing origin until stage 2. |
| `DCR_SITE_ORIGIN` | **Omit the variable.** Production-build writes fail closed. No empty value, placeholder, guessed URL or literal `$VERCEL_BRANCH_URL`. |
| `NEXT_PUBLIC_APP_URL` | **Omit the variable.** The Preview-only fallback is now relative, never the production domain. |

Vercel's form rejects empty values; stage 1 now needs only the four nonempty entries. Verify both URL variables are absent from the **effective** branch environment, including shared/team/integration Preview entries. Remove only obsolete branch-specific URL entries if present. If a broader Preview value would be inherited, stop and resolve scope without changing Production or silently changing other branches. Do not upload an empty or fabricated value. The absence behavior has been verified with actual production build/start and HTTP requests.

Keep `DCR_DATABASE_SSL`, owner/migration/backup/test credentials and TLS bypass variables unset. Leave Vercel's own NODE_ENV/VERCEL_ENV alone. Retain owner-verified Production=`main`, Preview=all unassigned branches, Standard Protection on, no Preview custom domains. Confirm effective project root is the nested `Daytona-Car-Rentals` application and Node/build settings support this branch without changing Production configuration. Do not add schema/setup commands to build.

After explicit authorization, push only the current reviewed application commit to the feature branch. With the owner-verified integration, that branch push creates a protected Preview automatically. Do not also trigger a CLI deployment, merge to main, use --prod, promote or change aliases.

Inspect the created deployment through Dashboard/authorized Vercel access. Confirm target Preview and protection on both generated URLs. Obtain the **actual stable Git branch URL** from its assigned domains/branch metadata, not from guessing a naming convention and not from a production custom domain. Authorized browser verification should show the pages and demo notice while quote/request POSTs return 503 for the origin prerequisite. Admin mutation cannot proceed. It is a URL-discovery/read-only preview, not a usable booking preview. Its metadata is temporarily relative; it is protected and not a public SEO release.

## Stage 2 — exact-origin synthetic Preview

Normalize the actual branch URL to `https://<actual-host>` with no trailing slash/path. Set **both** `DCR_SITE_ORIGIN` and `NEXT_PUBLIC_APP_URL` to that identical explicit value, still Preview/this branch only. Leave the other four values and all Production settings unchanged.

Redeploy the **same feature-branch commit to Preview**, with a fresh build and the updated Preview environment (do not promote/reuse an old prebuilt artifact). Confirm build metadata contains the actual branch origin and runtime same-origin requests from that URL work. Requests using a different Origin, including production or an immutable deployment hostname, remain rejected. Reviewers should use the stable branch URL. Preserve Standard Protection and verify unauthenticated visitors cannot bypass it.

Stage 2 permits only the application's synthetic demo workflow; no live rental gate is enabled. Validate with read-only checks first. Any later synthetic request exercise must be explicitly labelled and retain/cancel only its own test records, never reset the ledger. Hosted backup, internal-transport and Data API questions documented in `protected-preview.md` remain distinct from hostname discovery.

## Exact private entry procedure

1. In your private terminal run `/projects/daytona-private/prepare-vercel-preview.py` and choose **1**. No hostname is requested. The helper reuses the already saved restricted runtime credential privately and prompts for a new Preview-only owner password twice with hidden input if a private hash has not yet been prepared. It keeps the same hash for stage 2. Stage 1 writes four owner-only files in a new owner-only directory outside Git; it creates no URL-value files. No secret is displayed. It makes no network calls.
2. Enter the four nonempty values privately in Dashboard at the exact Preview/branch scope. Leave the two URL keys absent. Prefer Dashboard review to confirm effective absence and scope; never paste credentials in chat or commit a value file. For a verified, authorized CLI project link, stdin entry is supported, for example:

```sh
# PREVIEW_VALUES_DIR is the private directory printed by the helper.
vercel env add DCR_DATABASE_URL preview feat/supabase-rental-backend < "$PREVIEW_VALUES_DIR/DCR_DATABASE_URL"
```

For stage 1 repeat only for DCR_DATABASE_CA, DCR_DEMO_MODE and DCR_ADMIN_PASSWORD_HASH. Check success and exact Preview/branch scope; do not add either URL variable. Do not use --value with a secret in argv, broad env pull, --force or --prod. An existing branch-specific variable should be updated deliberately through Dashboard; do not remove another scope to work around conflicts. [Official CLI environment documentation](https://vercel.com/docs/cli/env).

3. After stage 1 produces the actual branch URL, run the helper again and choose **2**. Paste only the verified HTTPS branch origin at the public prompt. It reuses the owner hash and saved restricted runtime credential and produces new private files. Add the two URL entries in the same Preview/branch scope. Stage 2 produces six private files; the other four values remain unchanged. Redeploy as described above. Retain files privately; none belong in Git or a Vercel filesystem.

The helper validates URL syntax, not that the supplied hostname belongs to this Vercel project; verify ownership/branch assignment in Dashboard. No hostname is invented by the helper or these instructions.

## Preparation evidence and next approval

An isolated copy of the focused fix was built with both URL variables entirely absent, NODE_ENV's production-build behavior, demo=true and VERCEL_ENV=preview; **no database credentials** were supplied. Build/start and homepage/fleet/assistant/booking returned successfully. Robots/sitemap did not contain the production domain. Actual HTTP quote/request/session POSTs returned 503 before database access; unauthenticated admin mutation returned 401. The temporary server was stopped. The existing local demo server/build and hosted records were not touched. Evidence: `/projects/daytona-handoff/preview-preparation/absent-origin-build.log`, `absent-origin-server.log`, `absent-origin-http.json`.

The earlier commit `c1b626d` does **not** contain the missing-URL Preview fallback. Deploy only the new focused-fix commit recorded in the handoff after local verification. The specific next action for approval is: **after the four Stage 1 Preview entries are saved and effective absence of both URL variables is verified, push the reviewed fixed commit only to `refs/heads/feat/supabase-rental-backend`, allowing its automatic protected read-only Preview deployment, then report its actual branch URL.**

Check the remote branch head first; if divergent work exists, stop rather than force-push. This approval does not include stage-2 redeployment, production promotion, purchasing, schema/data changes or disabling protection. No push or deployment has been executed.
