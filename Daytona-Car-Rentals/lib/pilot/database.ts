import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, type PoolClient, type QueryResultRow, type QueryResult } from "pg";
import { PilotError } from "./errors";

export const isDemo = () => process.env.DCR_DEMO_MODE === "true";
const context = new AsyncLocalStorage<PoolClient>();
let pool: Pool | undefined;

function getPool() {
  if (!process.env.DCR_DATABASE_URL)
    throw new PilotError("Postgres is not configured. Set DCR_DATABASE_URL and apply database migrations.", 503);
  if (process.env.VERCEL_ENV === "production" && isDemo())
    throw new PilotError("Demo mode cannot run in the production deployment.", 503);
  if (process.env.VERCEL_ENV === "preview" && !isDemo())
    throw new PilotError("Preview deployments require an isolated demo database.", 503);
  if (!pool) {
    let url: URL;
    try { url = new URL(process.env.DCR_DATABASE_URL); }
    catch { throw new PilotError("DCR_DATABASE_URL must be a valid Postgres connection string.", 503); }
    if (!["postgres:", "postgresql:"].includes(url.protocol))
      throw new PilotError("DCR_DATABASE_URL must use Postgres.", 503);
    // Do not allow URI sslmode options to override certificate verification.
    for (const key of ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert"]) url.searchParams.delete(key);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (process.env.DCR_DATABASE_SSL === "disable" && (!local || process.env.VERCEL))
      throw new PilotError("Unencrypted Postgres is only allowed on local loopback.", 503);
    pool = new Pool({
      connectionString: url.toString(),
      ssl: local && process.env.DCR_DATABASE_SSL === "disable" ? false : {
        rejectUnauthorized: true,
        ...(process.env.DCR_DATABASE_CA ? { ca: process.env.DCR_DATABASE_CA.replace(/\\n/g, "\n") } : {}),
      },
      max: 3, idleTimeoutMillis: 5000, connectionTimeoutMillis: 10000,
      allowExitOnIdle: true,
    });
    // Keep idle cleanup alive before Fluid Compute suspension; checked-out clients
    // remain owned by transaction() until COMMIT/ROLLBACK and release().
    attachDatabasePool(pool);
    // Idle socket failures must not crash a function or disclose connection details.
    pool.on("error", () => console.error("Postgres idle connection failed."));
  }
  return pool;
}

/** One connection per transaction. Unnamed queries work with Supavisor transaction pooling. */
export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  if (context.getStore()) return fn();
  const configuredPool = getPool();
  let client: PoolClient;
  try { client = await configuredPool.connect(); }
  catch { throw new PilotError("Postgres is unavailable. Check the server database connection configuration.", 503); }
  try {
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    await client.query("SET LOCAL statement_timeout = '15s'");
    await client.query("SET LOCAL lock_timeout = '10s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '20s'");
    // Same serialization guarantee as SQLite BEGIN IMMEDIATE, across all server instances.
    // Transaction-scoped: no session locks/state survive release to the pooler.
    await client.query("SELECT pg_advisory_xact_lock(724018, 1)");
    const mode = await client.query("SELECT data FROM dcr_private.config WHERE id='environment'");
    if (!mode.rowCount) throw new PilotError("Postgres environment is not initialized. Run the explicit environment initialization command.", 503);
    if (mode.rows[0]?.data !== (isDemo() ? "demo" : "live"))
      throw new PilotError("Use a separate database for live rentals and preview data.", 503);
    const result = await context.run(client, fn);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (error && typeof error === "object" && "code" in error && ["42P01", "3F000"].includes(String(error.code)))
      throw new PilotError("Postgres schema is not initialized. Apply migrations and initialize this environment.", 503);
    throw error;
  } finally { client.release(); }
}
export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, values: unknown[] = []): Promise<QueryResult<T>> {
  const client = context.getStore();
  if (client) return client.query<T>(sql, values);
  return transaction(() => query<T>(sql, values));
}
export async function closeDatabase() { await pool?.end(); pool = undefined; }
