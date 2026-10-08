# Daytona Preview magic links — Resend Send Email Hook preparation

Status: local implementation and tests only, on `feat/renter-portal-review` after checkpoint `b527907`. No hosted deployment, Auth change, migration, real email or production/MTS access occurred. The domain verification and scoped key are operator-confirmed, not independently queried here.

## Fixed scope and behavior

- Daytona project: **daytona-rentals-dev**, ref `moxcovrhondqpjykslkh`.
- Function: `supabase/functions/preview-auth-email`.
- Sender: `Daytona Car Rentals <notifications@notify.daytonacarrentals.com>`.
- Sole allowed recipient: **msooijir@gmail.com**. Exact mailbox, case-insensitive; no aliases, plus addressing, dot normalization, domain-wide entries or extra recipients. The hook also requires the configured list to equal that one address; widening it fails closed.
- `tmdallianceltd@gmail.com` is reserved for future Production owner notifications/reply-to. It is denied as a Preview recipient and is not set as reply-to, CC or BCC.
- Only `signup` and `magiclink` actions are supported. Recovery, invitation, email change and other email events fail closed. Do not use this Preview-only hook in Production.
- Native Supabase HTTP Auth Hook authentication: Standard Webhooks signature over the raw body, including timestamp/message ID. Pinned `standardwebhooks@1.0.0` verifies signatures and timestamp tolerance. `verify_jwt=false` is required for Auth's signed hook requests; it does not mean unauthenticated mail access. Unsigned requests fail before Resend.
- Resend is reached only after signature, project/configuration, action, recipient and callback validation. Maximum body 32 KiB; provider timeout 2.5 seconds. Errors are generic; no body/header/link/token/provider-error logging. Provider errors do not return successful delivery or fall back to SMTP.
- Stable SHA-256 idempotency key derives from the signed email operation, including callback and token hash; only the digest reaches the provider header. Retries have identical bodies. Resend's finite deduplication window is not an exactly-once guarantee, and its successful API response is not verified inbox delivery.

The hook replaces Supabase's built-in sender, so once enabled for this project it also gates email from direct Supabase Auth API calls. Vercel protection and the app's email allowlist alone cannot do that. A sending-domain restriction on a Resend key is **not** a recipient restriction. The project hook is implemented but **not yet installed or verified hosted**. [Supabase hook reference](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook), [Resend idempotency](https://resend.com/changelog/idempotency-keys).

## Callback/session compatibility

The application already calls signInWithOtp with `emailRedirectTo=<actual branch origin>/auth/confirm?intent=<private intent ID>`. The hook accepts exactly that origin and `/auth/confirm`, with either no query or one 64-character lowercase hex `intent`. It appends `token_hash` itself; extra query fields, other origins/paths, URL credentials/fragments and duplicate intents are rejected.

The client callback scrubs the URL and requires **Continue securely**, then performs same-origin POST to `/api/customer/auth`. The server calls `verifyOtp({token_hash, type:'email'})`, writes HttpOnly cookies and consumes the intent to restore the permitted trip fields. A direct approved Auth request may specify `/auth/confirm` without an app intent; it lands in My trips after confirmation. Direct requests that omit the redirect and fall back to a root Site URL are intentionally rejected: clients must request the callback path. No token is consumed by a normal GET/link scanner.

This hook constructs the email itself. Supabase dashboard Magic Link/Confirm Signup SMTP templates are **not used while this hook is enabled**. Do not replace the hook URL with Supabase `/auth/v1/verify` or implement a PKCE callback: the application uses token-hash POST verification. Existing fallback template `{{ .RedirectTo }}&token_hash={{ .TokenHash }}` only belongs to the previous SMTP path; do not enable that unrestricted fallback during Preview.

Keep Vercel Standard Protection enabled. The user must pass protection before opening the callback. Hosted testing must verify that protection preserves the callback query, that the app's no-referrer/no-store headers apply, and that signup/returning-user token hashes work with the real provider. Disable Resend click/open tracking for these Auth emails to avoid rewritten security links; keep analytics/query-string logging off this callback. No Vercel protection bypass secret belongs in an email link. The hook itself runs on Supabase and needs no Vercel bypass.

## Private credential entry — available now, no upload

In your own private interactive terminal:

```bash
cd /projects/Daytona-coastal-experience/Daytona-Car-Rentals
python3 scripts/prepare-preview-auth-secrets.py
```

**Paste the saved `daytona-preview-auth` Resend key at the hidden `Resend key` prompt.** Do not paste it in chat or a shell command. The helper optionally accepts the actual HTTPS branch origin and the full Supabase hook signing secret; both can be left blank until known. It makes a new owner-only file under `/projects/daytona-private/preview-auth-hook/` (directory 0700, file 0600), prints only the file path and never overwrites earlier files. It always saves `DCR_AUTH_HOOK_ENABLED=false`. It rejects symlink paths and has no network/deployment functionality. This review did not run the prompts or retrieve the saved key.

Additional secret: generate the **Send Email Hook signing secret** in the Daytona Supabase Auth Hooks dashboard. It has the form `v1,whsec_<base64>`. This is distinct from the Resend key, Supabase publishable key, database password, maintenance token and Vercel protection credentials. Enter the same complete secret privately as `DCR_AUTH_HOOK_SIGNING_SECRET` in Edge Function secrets. Never put either key in Vercel public variables or Git. CLI management also needs an operator Supabase login/access token, entered privately using supported CLI login/secret storage; the function itself needs no database or service-role credential.

## Concrete hosted setup — requires separate approval; not executed

1. **Keep email closed while preparing.** Leave transactional `DCR_EMAIL_MODE=capture` and `DCR_DEMO_MODE=true`. Set this branch's `DCR_AUTH_TEST_EMAILS=disabled` until the hook has been configured. This non-email sentinel cannot match a validated email and works when the environment form rejects empty values. Do not enable custom/unrestricted SMTP as a workaround. Inspect the Daytona Auth sender settings before activation; they have not been inspected in this task.
2. **Obtain the actual authorized branch URL.** `feat/renter-portal-review` has no newly verified deployment URL in this preparation. Do not invent one or reuse Production. A separately approved protected Vercel deployment is needed if none exists. Its bootstrap can omit both application URL variables and keep sign-in/writes blocked. Then set `DCR_SITE_ORIGIN` and `NEXT_PUBLIC_APP_URL` to the actual HTTPS branch origin and redeploy when authorized. Existing application database migrations 003/004 remain separate prerequisites for the renter portal; the email hook adds **no database migration**.
3. **Prepare Edge secrets in this project only.** Using the private file from the helper or Supabase Dashboard → Edge Functions → Secrets, enter:

| Edge secret | Exact value/source |
| --- | --- |
| `DCR_AUTH_RESEND_KEY` | Saved domain-scoped sending-only `daytona-preview-auth` key; hidden entry |
| `DCR_AUTH_HOOK_SIGNING_SECRET` | Full secret generated in Auth Hooks; hidden entry |
| `DCR_AUTH_HOOK_ENV` | `preview` |
| `DCR_AUTH_HOOK_ENABLED` | `false` initially |
| `DCR_AUTH_TEST_EMAILS` | `msooijir@gmail.com` |
| `DCR_AUTH_HOOK_ORIGIN` | Actual HTTPS Vercel branch origin, no path/trailing slash |

`SUPABASE_URL` is supplied by the Edge runtime and must equal `https://moxcovrhondqpjykslkh.supabase.co`; do not override reserved runtime variables. Sender/recipient/project constants are pinned in code. Blank required entries fail closed. Origin must be a `.vercel.app` branch origin; custom/production domains are intentionally unsupported for this preparation.

Once separately authorized, from the application directory, use a current Supabase CLI authenticated as the authorized operator. It is not installed/configured in this workspace. Commands below are operator instructions, **not commands already run**:

```bash
supabase secrets set --project-ref moxcovrhondqpjykslkh --env-file /absolute/path/printed/by/the/helper.env
supabase functions deploy preview-auth-email --project-ref moxcovrhondqpjykslkh --no-verify-jwt
```

Replace the file placeholder with the actual private file path. Do not echo/cat the file or pass key values as CLI arguments. The per-function `deno.json` and `deno.lock` pin dependencies; local Deno checks pass, but Supabase CLI bundling and actual Edge runtime deployment still require hosted validation.

4. **Register the HTTP Send Email Hook.** Daytona Supabase → Authentication → Hooks → Send Email → HTTP endpoint:

`https://moxcovrhondqpjykslkh.supabase.co/functions/v1/preview-auth-email`

This is the deterministic target URL for the prepared function, **not an observed deployed endpoint**. Generate/copy its signing secret privately and put the matching secret in Edge secrets. Enable this Auth hook while `DCR_AUTH_HOOK_ENABLED=false`; Auth sends should fail closed during staging, not fall back to SMTP. Keep Email Provider/email confirmation enabled. Do not configure an Auth Hook or secrets in MTS or Production.

5. **Set Auth URLs and app restrictions.** Set the Daytona Auth Site URL to the actual Preview origin. Add the narrowly scoped callback redirect entry `<actual origin>/auth/confirm` and the query-bearing callback entry `<actual origin>/auth/confirm?intent=*` in Redirect URLs; verify Supabase's pattern matching against the actual generated intent URL before relying on it. No wildcard host or broad `/**` entry. Set these Vercel variables on **Preview / feat/renter-portal-review only**:

```text
DCR_AUTH_TEST_EMAILS=msooijir@gmail.com
DCR_DEMO_MODE=true
DCR_EMAIL_MODE=capture
DCR_SUPABASE_AUTH_URL=https://moxcovrhondqpjykslkh.supabase.co
DCR_SUPABASE_PROJECT_REF=moxcovrhondqpjykslkh
DCR_SUPABASE_PUBLISHABLE_KEY=<matching public/publishable key, private dashboard entry>
DCR_SITE_ORIGIN=<actual HTTPS branch origin>
NEXT_PUBLIC_APP_URL=<same actual HTTPS branch origin>
```

Retain restricted database URL/CA and owner login configuration. Keep `DCR_EMAIL_API_KEY` and `DCR_EMAIL_FROM` **unset in Vercel**. Do not set `DCR_OWNER_EMAIL` to the production address; retain the synthetic/default capture destination. Do not set a reply-to address to the production mailbox. The Resend key for Auth belongs only in the Edge secrets above, never in the rental outbox configuration.

6. **Enable only after a separate authorized activation decision.** Set Edge secret `DCR_AUTH_HOOK_ENABLED=true` only when actual origin, signing secret and hook registration match. Changing this secret enables actual Auth email sending to the sole approved address; it is intentionally not part of this preparation. Verify hosted signature rejection, denied recipients/direct Auth calls and allowed signup/returning magic links only under separately approved testing. No real sends are authorized by this document. Do not test rejected recipients by sending real email; denial must be proven before any provider call.

7. **Failure/recovery.** If problems occur, set `DCR_AUTH_HOOK_ENABLED=false` or clear the app recipient list and leave the hook installed/enabled in Auth. Disabling the Auth hook itself reverts to the underlying sender and can remove the recipient restriction. Never disable protection or enable unrestricted SMTP to work around a callback failure. Rotate secrets privately and retest; inspect status-only logs, not request bodies, raw provider failures or token-bearing links.

## Local evidence and remaining boundaries

- Nine signed-hook tests passed in Node and Deno with networking denied to the Deno test process. Provider transport is injected and stubbed; calls never reach Resend. Tests cover exact recipient/aliases/owner denial, signup/magiclink callbacks, direct requests, missing config, signatures/replay timestamps, payload limits, unsupported actions, redirect attacks, provider errors and stable retry keys.
- Two private-helper tests pass (0700/0600, no overwrite, symlink refusal). No real key was read or written by the tests.
- Three application Auth isolation/recipient checks and three production-build browser tests (cross-device links, expired/reused links, logout, authorization and draft continuity) pass; the application restriction remains unchanged. TypeScript, Deno entrypoint check and Next production build pass. Production dependency audit reports zero advisories; five previously documented development-only advisories remain.
- Evidence: `/projects/daytona-handoff/preview-auth-hook/`.
- Hosted hook registration, actual Supabase signed payloads/latency/retries, Edge bundle/runtime compatibility, actual-domain Resend permissions/tracking, provider acceptance/inbox delivery and Vercel-protected callback behavior remain **unverified**. No local test proves hosted configuration exists.

Official references: [Supabase hook authentication and time limits](https://supabase.com/docs/guides/auth/auth-hooks), [per-function dependency configuration](https://supabase.com/docs/guides/functions/dependencies).


## Commit and protected bootstrap preflight

Private entry is now operator-completed at `/projects/daytona-private/preview-auth-hook/preview-auth-81715729a53cdf5d.env`. File metadata confirms mode 0600 and owner openhands. Contents were not read. Per the operator, origin/signing secret remain blank and the hook remains disabled. Preserve this file; do not include it in a commit or upload it with blank required entries.

No application code changed during commit preparation, so completed suites were not rerun. Reviewed the public homepage/fleet/SiteShell and lazy Auth initialization: public browsing does not initialize Supabase Auth; a missing URL/key returns a controlled 503 only when authenticated functionality is invoked. A signed-out Auth GET returns customer:null. The browser sign-in form renders API errors without taking down the page. Existing production build and local checks remain the validation evidence. Missing DCR_SITE_ORIGIN rejects mutation POSTs before body/database work; absent NEXT_PUBLIC_APP_URL uses relative Preview metadata, not Production. This is source inspection plus prior local evidence, not a hosted readiness claim.

Migration requirements, locally present and already tested:

| Version | Expected SHA-256 |
| --- | --- |
| `003_customer_portal.sql` | `922ebbffcf9c28dcbfe767799d08924081c61bf609be9f4a4d2f2d23dd9466d4` |
| `004_outbox_claims.sql` | `f1f435ffe5d0025cd483803cf4d1d79547ae41236da659c5c423e4d03effc33f` |

The handoff still records both as pending hosted; no hosted ledger was queried in this preparation. Before enabling the portal/worker, the authorized migration operator should inspect only `version,checksum` in `dcr_private.schema_migrations`, compare these values and prior migrations, then apply missing migrations with `npm run db:migrate` using a private direct/session migration-owner connection. Do not seed/reset. Runtime cannot perform migration DDL. Keep migrations/owner/backup credentials out of Vercel. This is a separate authorized operation, not a command run here.

**Vercel inheritance needs dashboard inspection before a push.** There is no authenticated Vercel connector, CLI configuration or project env inventory available here. Production/main and Standard Protection settings are accepted from the existing owner-verified handoff; current env scopes are not independently verified. Variables scoped only to `feat/supabase-rental-backend` do not carry into `feat/renter-portal-review`; all-Preview/shared values do. Branch-specific entries override shared Preview values. [Official Vercel precedence](https://vercel.com/docs/environment-variables).

For initial protected deployment, scope these to Preview / `feat/renter-portal-review`:

- `DCR_DATABASE_URL`: existing restricted runtime login for daytona-rentals-dev, not production or local Postgres; `DCR_DATABASE_CA`: verified PEM; `DCR_ADMIN_PASSWORD_HASH`: approved Preview owner hash, entered privately.
- `DCR_DEMO_MODE=true`; `DCR_EMAIL_MODE=capture`; `DCR_AUTH_TEST_EMAILS=disabled`; `DCR_OWNER_EMAIL=owner@example.invalid` (override any inherited production mailbox).
- `DCR_SITE_ORIGIN` and `NEXT_PUBLIC_APP_URL`: **effectively absent**, not merely absent from branch-specific rows. Do not use empty values, fabricated URLs or the prior branch URL.
- Auth URL/ref/publishable-key may remain absent for bootstrap. If shared Auth variables already exist, either scope them away or override with the correct Daytona values; never inherit MTS/Production identity. Keep the recipient sentinel and missing site origin until stage 2.
- No Resend keys, hook secrets, service-role keys, migration/backup credentials, TLS-disable settings, test fixture flags or diagnostic DNS/CA hooks in Vercel. If such values are shared across Preview, correct their scopes rather than assuming branch absence masks inheritance. Capture mode prevents transactional sends but does not justify exposing an unnecessary provider key to this branch.

The old verified stable URL is `https://daytona-car-rentals-git-feat-supabase-ren-0984c8-06mos-projects.vercel.app`. It is not the new branch origin. If either URL variable has this value in **all Preview**, preserve it as an override for the old branch first, then remove only its all-Preview scope while retaining any Production scope unchanged. Check other branches before narrowing a shared value. If absence cannot be achieved without an unapproved change, stop before pushing; do not silently bootstrap with the old origin. The same scope review applies to database/Auth credentials and notification recipient settings. Do not modify main's Production values.

After separately authorized push, obtain the actual Git branch URL from Vercel project `06mos-projects/daytona-car-rentals` → Deployments → filter `feat/renter-portal-review`, verify the exact pushed SHA and Preview environment, then copy the branch alias from Domains/assigned URLs. Do not copy the previous branch or immutable deployment URL. Confirm protection before proceeding.

Deploy `preview-auth-email` while explicitly disabled (or all required secrets absent, which fails closed). Then generate/register the HTTP hook's signing secret in the Daytona project, fill the two blank private-file entries privately, retain enabled=false, and upload secrets only when separately authorized. Registering this disabled hook routes Auth mail into a fail-closed path; do not disable it to fall back to SMTP. Configure exact new-origin callbacks and app variables, redeploy the same application commit and leave actual hook sending disabled until a separate activation/test authorization. Updating NEXT_PUBLIC_APP_URL requires a fresh build. No new hostname is inferred from the branch name.
