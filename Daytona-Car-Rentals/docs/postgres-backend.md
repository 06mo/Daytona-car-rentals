# Postgres rental backend

Production architecture: Vercel Node.js functions + Supabase Postgres. The browser never connects to the database. All durable state (quotes, requests, calendar blocks, settings, sessions, rate limits and audit history) lives in Postgres. SQLite is no longer a runtime dependency or fallback. `DCR_DATABASE_PATH` has no effect.

## Data and transaction model

`migrations/001_private_rental_store.sql` creates the private `dcr_private` schema. Configuration, quotes, accepted reservation snapshots and calendar blocks use JSONB to preserve existing API shapes and immutable accepted prices. UUID primary keys and a unique request key preserve request identity; session hashes, expiry timestamps, attempt counts and audit rows use typed columns. `schema_migrations` records version, checksum and application time. Never edit an applied migration: add the next version.

Every server store operation runs on one checked-out `pg` client, with `BEGIN READ COMMITTED` and `pg_advisory_xact_lock(724018,1)` **before reading state**. Every writer, including quote creation, owner updates and calendar changes, uses this same transaction-scoped lock. Nested operations share that client through AsyncLocalStorage, which holds transaction context only, not durable data. Commits/rollbacks release the lock even when a function terminates. Each statement then sees the preceding writer's committed rows; do not switch this implementation to a transaction-start snapshot without designing retry handling.

This deliberately preserves SQLite's serialized `BEGIN IMMEDIATE` behavior across multiple Node/Vercel instances. It is conservative: all operations serialize per database and some conflict checks scan the pilot ledger. Suitable for the small pilot; measure contention before increasing volume. Do not bypass the store with ad hoc concurrent writes. A future per-vehicle lock/indexed allocation design requires new concurrency tests. Lock/statement timeouts fail operations rather than allowing unchecked allocations. Retrying a submission must retain its original idempotency key.

The five-direct/seven-Turo map remains authoritative. Rates/launch approvals, Eastern time/DST, 30 civil days, quote expiry/revisions, hold expiry, manual calendar review and required release evidence are unchanged. No recurring billing, automatic substitution, or live integrations were added.

## Roles and access

Migrations create a **NOLOGIN** privilege group `dcr_app`. Use a separate restricted LOGIN role inheriting this group for the server. It has DML privileges needed by the application, no DDL/TRUNCATE, no role/database creation, and no RLS bypass. Config insertion and audit deletion are not runtime privileges. An immutable environment marker prevents changing a demo database into live data.

All rental tables have enabled/forced RLS with a policy only for `dcr_app`. The schema is private and privileges are revoked from PUBLIC and existing Supabase `anon`, `authenticated` and `service_role` roles. **Do not add `dcr_private` to Supabase's exposed API schemas**, grant these roles access, or ship database credentials/API service keys to the browser. No Supabase client SDK or public database key is required.

Migrate/init with a separate owner connection; keep that connection out of Vercel's runtime environment. The migration grants the owner membership in `dcr_app` so initialization also works under FORCE RLS. On a new project, the operator can provision a runtime login after migration:

```sql
CREATE ROLE dcr_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT;
GRANT dcr_app TO dcr_runtime;
```

Set its strong password privately using `psql`'s `\password dcr_runtime` or the approved secrets workflow. Never put a literal password in SQL files, scripts, tickets or source control. The application must connect as this role, not the migration owner.

## Environment setup

Use separate projects/databases **and distinct credentials** for development, Vercel Preview and Production. Current owner-approved mapping: development = preserved local loopback Postgres demo; hosted Preview = `daytona-rentals-dev` (project `moxcovrhondqpjykslkh`) exclusively, with its existing records retained. `mts-ag-services` is untouched/out of scope. This is a reassignment of the previously tested hosted development project, not a reset or a new seed. `.env.example` and `.env.local.example` contain variable names/comments only where secrets belong.

- `DCR_DATABASE_URL`: server runtime URL. For Vercel use Supabase **shared transaction pooler**, normally port 6543. Copy the exact host and `[ROLE].[PROJECT-REF]` username from the Connect panel; do not derive the hostname. Percent-encode reserved password characters.
- `DCR_DATABASE_CA`: optional trusted CA PEM if needed; certificate verification remains enabled. Literal `\n` is accepted. SSL options in the URI cannot disable verification.
- `DCR_DATABASE_SSL=disable`: permitted only for a local loopback database, never on Vercel.
- `DCR_DEMO_MODE=true`: isolated development/preview only. Production deployment rejects demo mode; Vercel Preview rejects live mode. The persisted environment marker must match the process mode on every transaction.
- `DCR_SITE_ORIGIN`: explicit website origin, including scheme. Required for production writes.
- `DCR_ADMIN_PASSWORD_HASH`: retain the existing scrypt owner-authentication mechanism; generate with `npm run admin:setup`. Sessions remain HttpOnly, SameSite Strict, and Secure in production; hashes/expiry/revocation live in Postgres.
- `DCR_MIGRATION_DATABASE_URL`: migration-owner direct connection, supplied only to the operator migration shell. A session pooler connection is an alternative where direct IPv6 is unavailable. Do not use transaction pooling for native dump/restore tooling.

The driver uses only unnamed parameterized queries, a maximum of three local connections per Node instance, short idle timeout and transaction-local settings. No named prepared statements, pipelining, session locks or persistent local files are required. The pool is registered with `attachDatabasePool` from `@vercel/functions`, as recommended by [Vercel for pg/Fluid Compute](https://vercel.com/kb/guide/connection-pooling-with-functions). The hook extends request lifetime for idle cleanup after release; it does not release checked-out transaction clients. Coordinate per-instance limits with Supabase's aggregate project connection budget. Local checks cover active transactions and rollback; suspension/resumption and instance churn still require a hosted preview.

Official guidance checked for this implementation: [Supabase connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres), [pooling limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits), [node-postgres transactions](https://node-postgres.com/features/transactions), and [Postgres transaction-level advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS).

## Apply schema and initialize an explicitly selected database

The following commands are setup instructions, not deployment or permission to access production. Review the target connection before running them. They do not run automatically during build or server startup.

```sh
# Set DCR_MIGRATION_DATABASE_URL securely in this shell first.
npm run db:migrate
# For a dedicated development/preview database only:
DCR_DEMO_MODE=true npm run db:seed
# For a separately authorized empty live database:
DCR_DEMO_MODE=false npm run db:init-live
```

Migration versions/checksums make reruns safe. Seeds only insert missing config; they never overwrite operator settings. Synthetic seed rates mirror the existing demo, not approved live pricing. Live initialization keeps rates zero, vehicles disabled, launch approvals false, and requests closed. It does not import records or enable rentals. Missing URL, schema or initialization fails clearly; no automatic demo/SQLite fallback exists.

## Local integration and browser tests

Requires Node 24+, Postgres 17+ on loopback and the existing npm lockfile. Create a **local-only** disposable-database owner able to create/drop databases and create roles, plus the restricted `dcr_runtime` login. Set passwords privately. The test fixture refuses a non-loopback administrator URL.

Set `DCR_TEST_ADMIN_URL` to that local administrator's `postgres` database URL, `DCR_TEST_RUNTIME_PASSWORD` to the local runtime role's password, and `DCR_DATABASE_SSL=disable`. Tests create unique `dcr_test_<uuid>` databases, migrate and initialize them, run the application as `dcr_runtime`, then drop only those databases. Do not provide production credentials. If using a separate cluster, standard Supabase-like NOLOGIN roles `anon`, `authenticated` and `service_role` are needed for permission assertions.

```sh
npm test
npm run typecheck
npm run build
DCR_E2E_PRODUCTION=true CHROMIUM_BIN=/usr/bin/chromium npm run test:e2e
```

Without these local prerequisites, integration tests fail clearly instead of using mocks or skipping silently. Browser tests start their own isolated database/server. Independent child-process concurrency tests hold the real advisory lock until all competing transactions are visibly waiting in `pg_stat_activity`, then release them. They exercise overlapping requests, duplicate keys, confirmation revisions, confirmations versus blocks and legacy overlapping records. Other checks cover rollback, restart persistence, expired quotes, role permissions, missing configuration and environment separation. The existing pilot/live tests now exercise Postgres directly. Browser tests cover actual owner authorization and the unchanged customer journey.

## Existing SQLite data and recovery

Only two pilot SQLite files were identified in the project/handoff directories; both are marked demo (two synthetic review requests and an empty preview ledger). Neither should be imported into production. No live ledger was found in these available locations. This does not establish that no external operator-held ledger exists: confirm with the owner before a future cutover. If one is identified, inventory and back up it under a separately authorized import plan; do not mix environments or casually copy demo quotes/holds into live state.

The pre-migration coastal checkpoint is `cbbdff0e41255582e431fe01157c20eef0f7af88`, branch `feat/coastal-rental-experience`, plus `/projects/daytona-handoff/supabase-migration/coastal-checkpoint.bundle`. Recover it into a separate worktree (`git worktree add /projects/daytona-coastal-recovery <commit>`), preserving this migration branch. Its SQLite server needs a private persistent disk and is **not** a Vercel rollback target.

Before any future deployment, use the tested application-ledger backup/restore procedure below; store backups privately with encryption/access controls. Rehearse restoration into a separate database before relying on recovery. Also preserve runtime-role provisioning separately; database dumps do not capture cluster roles. No destructive down migration is supplied. Before live traffic, an unused development database can simply be replaced from a known migration/seed. After live writes exist, stop request acceptance and freeze writes before recovery, restore into a new isolated database, reconcile holds and external calendars, and point the application at that verified ledger. Never switch an active Postgres ledger back to a stale SQLite copy. Prefer a compatible Postgres application rollback or a forward corrective migration.

Hosted Supabase/Supavisor/Vercel TLS and deployment behavior have not been exercised here. The local real-Postgres checks are not a hosted deployment sign-off. Stripe payments and Checkr Trust screening remain separate work; no live rentals are enabled.


## Backup and restore under forced RLS

These responsibilities are separate:

| Identity | Required privileges | Use |
| --- | --- | --- |
| Runtime | Restricted LOGIN inheriting `dcr_app`; no ownership, BYPASSRLS, role creation or DDL | Vercel server only |
| Migration/restore owner | Own target database/schema/tables; membership in `dcr_app` for forced RLS; authority to create the privilege group if absent and grant its membership | Operator direct/session connection only |
| Backup reader | NOSUPERUSER, BYPASSRLS, database CONNECT, private schema USAGE, SELECT on every ledger table; no membership in `dcr_app`, no writes/DDL | Protected backup operator only |
| Role provisioning administrator | Authority to create these roles and grant BYPASSRLS/membership/ownership | Initial provisioning, never runtime |

BYPASSRLS is a powerful role attribute, even though table privileges constrain this reader. Do not grant it to runtime or migration roles to make a dump work. A migration owner subject to FORCE RLS cannot run the default pg_dump just because it owns the tables or inherits `dcr_app`. [Postgres pg_dump documentation](https://www.postgresql.org/docs/current/app-pgdump.html) explains the default row-security behavior. The backup reader intentionally bypasses policies but cannot write. Re-grant SELECT when adding new tables; do not assume future tables inherit this grant.

For a separately authorized target, the provisioning administrator creates the backup reader (replace the database identifier):

```sql
CREATE ROLE dcr_backup LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;
GRANT CONNECT ON DATABASE selected_database TO dcr_backup;
GRANT USAGE ON SCHEMA dcr_private TO dcr_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA dcr_private TO dcr_backup;
```

Set passwords privately with `psql`'s `\password` or approved secrets tooling. The database owner/provisioner must execute grants in the source database. Do not embed credentials in commands, archives or documentation. On Supabase, creation/grant of BYPASSRLS and role administration **must be confirmed with the actual hosted provisioning identity**. Local administrator provisioning is not evidence that Supabase permits the same operations. If unsupported, stop and arrange a provider-supported privileged backup/recovery identity; do not disable FORCE RLS or substitute runtime credentials.

This is an application-ledger logical backup, not a full Supabase project backup (Auth, Storage, extensions, other schemas and cluster roles are outside it). Preserve the exact application commit/migration files, the migration version/checksum manifest, and role provisioning separately. Use compatible pg_dump/pg_restore versions (dump client at least the server major); direct or session connection, never transaction pooling. Configure libpq `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER=dcr_backup`, `PGSSLMODE=verify-full`, trusted `PGSSLROOTCERT` if needed, and a private 0600 `PGPASSFILE` outside the repository. All commands below refer to the explicitly selected isolated/source database in that connection context.

Freeze migrations for the backup window; pg_dump provides one consistent data snapshot. For a cutover/recovery also freeze application writes. Do not run seed/init commands during restore.

```sh
umask 077
psql -X --no-psqlrc -v ON_ERROR_STOP=1 --csv -c 'SELECT version,checksum FROM dcr_private.schema_migrations ORDER BY version' > migration-manifest.csv
pg_dump --format=custom --inserts --data-only --schema=dcr_private --exclude-table=dcr_private.schema_migrations --file=rental-data.dump
pg_restore --list rental-data.dump > archive-inventory.txt
```

All application tables, including sessions/audit/accepted quotes, are included. The excluded migration ledger is regenerated from the preserved code. INSERT format is deliberate: COPY cannot restore into tables enforcing RLS for a non-bypass owner. Store these artifacts encrypted with restricted access; SELECT-only backup privileges do not make exported customer records non-sensitive.

Restore into a **new empty disposable database** owned by a separate NOSUPERUSER/NOBYPASSRLS migration/restore login. The provisioning administrator must grant it `dcr_app` membership and permission to grant that membership (ADMIN OPTION) for the existing migration's `GRANT dcr_app TO CURRENT_USER`; alternatively use the authorized migration identity with equivalent permissions. The role need not have CREATEROLE when `dcr_app` already exists. Never use the runtime login to restore. Preserve the group and restricted runtime provisioning separately; do not run broad cluster-role dumps into a hosted project.

1. Check out the exact backed-up migration version. Set the operator-only `DCR_MIGRATION_DATABASE_URL` to the new target and run `npm run db:migrate`. **Do not seed or initialize.** Compare target migration versions/checksums with the saved manifest before continuing.
2. Switch libpq connection context to that target and its non-bypass owner. Confirm database/user explicitly with `SELECT current_database(),current_user`. Restore atomically:

```sh
pg_restore --exit-on-error --single-transaction --enable-row-security --no-owner --no-privileges --dbname="$PGDATABASE" rental-data.dump
```

`--enable-row-security` keeps row security ON for restoration; it does not disable policies. The owner is a member of the existing all-row `dcr_app` policy, so INSERT statements work under FORCE RLS. Schema and grants come from migrations, not archive privileges. Empty tables avoid duplicate rows; errors roll back the entire restore. Do not restore over an active ledger or disable triggers.

3. Compare all application table records/counts, accepted quote snapshots, request keys, environment identity, blocks/holds and audit history with the snapshot. Verify forced RLS, public-role denial, restricted runtime read/DML and denied DDL/TRUNCATE. Confirm ordinary config deletion and explicit environment-mutation rejection. Account for elapsed quote/hold/session expiry before any future cutover; never reset expirations to make records appear current.
4. Run the application against the isolated target with matching demo/live identity and requests closed, then reconcile external calendars before any separately approved cutover. The old ledger must not remain an independent writer.

`tests/backup.test.ts` executes this arrangement on disposable local Postgres: the fixture administrator only provisions identities/databases; pg_dump runs as a non-superuser SELECT-only BYPASSRLS login, and migrations/pg_restore run as a distinct non-superuser NOBYPASSRLS owner. It compares every ledger table plus migration checksums and verifies restored role restrictions. No protection is disabled. Hosted role provisioning, TLS, backup operations and actual restore privileges remain mandatory preview validations.

## Customer portal migration (003)

Apply `003_customer_portal.sql` using the migration owner, never the runtime role. It adds customer ownership, private intake/image records, association claims, durable notification events, setting history and attributed audit entries. It does not associate old requests automatically, seed hosted data, create Auth users, grant public API access or enable rentals. Existing rows remain valid guest records.

Re-grant SELECT on **all** private tables to the separately provisioned backup reader after migration. The existing schema-wide INSERT-format dump includes document bytes, customer UUIDs and outbox state; treat it as highly sensitive. The expanded backup regression populates and compares these tables too. Supabase Auth is outside this ledger backup: separately preserve provider-supported Auth backups and user UUIDs. Restoring rental rows alone does not recreate accounts. Do not bulk reassociate restored requests by email or import Preview users/data into Production.

Before any recovery resumes workers, reconcile outbox `sent`, `retry` and `blocked` records against provider history; do not reset idempotency keys or replay a historical outbox blindly. Restore into an isolated database with capture mode and customer writes closed. Respect the 23-hour retry cutoff and confirm document retention/deletion against backup schedules. The original forced-RLS role separation still applies to every new table.
