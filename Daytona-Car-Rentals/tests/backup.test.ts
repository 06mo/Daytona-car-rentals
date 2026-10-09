import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Client } from "pg";
import { createTestDatabase } from "./postgres-fixture";
import { connectionOptions, migrate } from "../scripts/database-setup";
import * as store from "../lib/pilot/store";
import { closeDatabase } from "../lib/pilot/database";
const exec = promisify(execFile);

// The loopback-only fixture administrator provisions roles; dump/restore execute
// as distinct non-superuser logins. No production credential is accepted.
test("read-only backup role bypasses FORCE RLS; non-bypass restore owner restores exact records and restrictions", async () => {
  const source = await createTestDatabase();
  const suffix = randomUUID().replaceAll("-", "");
  const backup = "dcr_backup_" + suffix,
    restore = "dcr_restore_" + suffix,
    target = "dcr_test_" + suffix;
  const password = randomUUID(); // disposable only, never printed or passed in argv
  const dir = await mkdtemp(join(tmpdir(), "dcr-backup-"));
  let targetCreated = false,
    restored: Client | undefined;
  const roleURL = (role: string, database: string) => {
    const url = new URL(process.env.DCR_TEST_ADMIN_URL!);
    url.username = role;
    url.password = password;
    url.pathname = "/" + database;
    return url;
  };
  const pgEnv = (url: URL) => ({
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: url.username,
    PGPASSWORD: password,
    PGDATABASE: url.pathname.slice(1),
    PGSSLMODE: "disable",
  });
  try {
    process.env.DCR_DATABASE_URL = source.url;
    process.env.DCR_DEMO_MODE = "true";
    const quote = await store.quote({
      vehicleId: "corolla-3275798",
      start: "2038-01-01T10:00",
      end: "2038-01-05T10:00",
      location: "local",
    });
    const saved = await store.createRequest(
      {
        quoteId: quote.id,
        idempotencyKey: randomUUID(),
        name: "Synthetic Backup",
        email: "backup@example.invalid",
        phone: "0000000000",
        acknowledged: true,
        website: "",
      },
      { id: randomUUID(), email: "backup@example.invalid" },
    );
    await source.owner.query(
      "UPDATE dcr_private.outbox SET claim_token=$1,lease_until=$2,delivery=$3",
      [
        randomUUID(),
        Date.now() + 60000,
        JSON.stringify({
          from: "synthetic@example.invalid",
          to: ["synthetic@example.invalid"],
          text: "Synthetic frozen delivery",
        }),
      ],
    );
    await source.owner.query("INSERT INTO dcr_private.intakes VALUES($1,$2)", [
      saved.id,
      { legalName: "Synthetic backup driver", confirmed: true },
    ]);
    await source.owner.query(
      "INSERT INTO dcr_private.documents(id,request_id,kind,content,created_at,expires_at) VALUES($1,$2,'license',$3,1,2)",
      [randomUUID(), saved.id, Buffer.from("synthetic backup bytes")],
    );
    const draftId = randomUUID();
    await source.owner.query(
      "INSERT INTO dcr_private.customer_drafts(id,customer_id,data,created_at,expires_at) VALUES($1,$2,$3,1,2)",
      [
        draftId,
        randomUUID(),
        { intake: { legalName: "Synthetic saved draft" } },
      ],
    );
    for (const current of [false, true])
      await source.owner.query(
        "INSERT INTO dcr_private.draft_documents(id,draft_id,kind,content,valid_until,created_at,current) VALUES($1,$2,'license',$3,'2040-01-01',1,$4)",
        [
          randomUUID(),
          draftId,
          Buffer.from("synthetic draft version " + current),
          current,
        ],
      );
    await source.owner.query(
      "INSERT INTO dcr_private.auth_intents VALUES('synthetic-intent','/my-trip',1)",
    );
    await source.owner.query(
      "INSERT INTO dcr_private.claims VALUES($1,$2,$3,'synthetic-hash','declined')",
      [randomUUID(), saved.id, randomUUID()],
    );
    await source.owner.query(
      "INSERT INTO dcr_private.setting_history VALUES($1,1,'owner:test','settings',$2)",
      [randomUUID(), { revision: 1 }],
    );
    await source.owner.query(
      "INSERT INTO dcr_private.sessions VALUES('synthetic-backup-session',123)",
    );
    await source.owner.query(
      "INSERT INTO dcr_private.attempts VALUES('synthetic-backup-attempt',1,123)",
    );
    await store.adminAction({
      action: "block",
      trip: {
        vehicleId: "corolla-3275798",
        start: "2038-02-01T10:00",
        end: "2038-02-03T10:00",
        location: "local",
      },
      reason: "Synthetic backup block",
    });
    await source.owner.query(
      `CREATE ROLE ${backup} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS PASSWORD '${password}'`,
    );
    await source.owner.query(
      `GRANT CONNECT ON DATABASE ${source.name} TO ${backup}`,
    );
    await source.owner.query(`GRANT USAGE ON SCHEMA dcr_private TO ${backup}`);
    await source.owner.query(
      `GRANT SELECT ON ALL TABLES IN SCHEMA dcr_private TO ${backup}`,
    );
    const reader = new Client(
      connectionOptions(roleURL(backup, source.name).toString()),
    );
    await reader.connect();
    try {
      assert.deepEqual(
        (
          await reader.query(
            "SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
          )
        ).rows[0],
        { rolsuper: false, rolbypassrls: true },
      );
      await assert.rejects(
        reader.query("DELETE FROM dcr_private.reservations"),
        /permission denied/,
      );
      await assert.rejects(
        reader.query("TRUNCATE dcr_private.reservations"),
        /permission denied/,
      );
    } finally {
      await reader.end();
    }
    const archive = join(dir, "rental-data.dump");
    await exec(
      "pg_dump",
      [
        "--format=custom",
        "--inserts",
        "--data-only",
        "--schema=dcr_private",
        "--exclude-table=dcr_private.schema_migrations",
        "--file=" + archive,
      ],
      { env: pgEnv(roleURL(backup, source.name)) },
    );
    await source.owner.query(
      `CREATE ROLE ${restore} LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION INHERIT PASSWORD '${password}'`,
    );
    // Provisioning authority grants membership; restore owner cannot elevate itself.
    await source.owner.query(`GRANT dcr_app TO ${restore} WITH ADMIN OPTION`);
    await source.owner.query(`CREATE DATABASE ${target} OWNER ${restore}`);
    targetCreated = true;
    restored = new Client(
      connectionOptions(roleURL(restore, target).toString()),
    );
    await restored.connect();
    await migrate(restored); // Do not seed: restore into empty, version-matched tables.
    await exec(
      "pg_restore",
      [
        "--exit-on-error",
        "--enable-row-security",
        "--single-transaction",
        "--no-owner",
        "--no-privileges",
        "--dbname=" + target,
        archive,
      ],
      { env: pgEnv(roleURL(restore, target)) },
    );
    for (const table of [
      "schema_migrations",
      "config",
      "quotes",
      "reservations",
      "blocks",
      "sessions",
      "attempts",
      "audit",
      "auth_intents",
      "intakes",
      "documents",
      "customer_drafts",
      "draft_documents",
      "claims",
      "outbox",
      "setting_history",
    ]) {
      // applied_at reflects the new migration execution, not application data.
      const projection =
        table === "schema_migrations" ? "version,checksum" : "*";
      const order =
        table === "schema_migrations"
          ? "version"
          : table === "sessions"
            ? "hash"
            : table === "intakes"
              ? "request_id"
              : "id";
      assert.deepEqual(
        (
          await restored.query(
            `SELECT ${projection} FROM dcr_private.${table} ORDER BY ${order}`,
          )
        ).rows,
        (
          await source.owner.query(
            `SELECT ${projection} FROM dcr_private.${table} ORDER BY ${order}`,
          )
        ).rows,
        table,
      );
    }
    assert.deepEqual(
      (
        await restored.query(
          "SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
        )
      ).rows[0],
      { rolsuper: false, rolbypassrls: false },
    );
    const policies = (
      await restored.query(
        "SELECT relrowsecurity,relforcerowsecurity FROM pg_class JOIN pg_namespace n ON n.oid=relnamespace WHERE n.nspname='dcr_private' AND relname='reservations'",
      )
    ).rows[0];
    assert.deepEqual(policies, {
      relrowsecurity: true,
      relforcerowsecurity: true,
    });
    for (const role of ["anon", "authenticated", "service_role"]) {
      const access: { schema: boolean; records: boolean } = (
        await restored.query(
          "SELECT has_schema_privilege($1,'dcr_private','USAGE') AS schema, has_table_privilege($1,'dcr_private.reservations','SELECT') AS records",
          [role],
        )
      ).rows[0];
      assert.deepEqual(access, { schema: false, records: false });
    }
    await assert.rejects(
      restored.query("DELETE FROM dcr_private.config WHERE id='environment'"),
      /immutable/,
    );
    const runtimeURL = new URL(source.url);
    runtimeURL.pathname = "/" + target;
    const runtime = new Client(connectionOptions(runtimeURL.toString()));
    await runtime.connect();
    try {
      assert.equal(
        (await runtime.query("SELECT * FROM dcr_private.reservations"))
          .rowCount,
        1,
      );
      await assert.rejects(
        runtime.query("TRUNCATE dcr_private.reservations"),
        /permission denied/,
      );
      await assert.rejects(
        runtime.query("CREATE TABLE dcr_private.forbidden(id int)"),
        /permission denied/,
      );
    } finally {
      await runtime.end();
    }
  } finally {
    await closeDatabase();
    await restored?.end();
    if (targetCreated)
      await source.owner.query(`DROP DATABASE ${target} WITH (FORCE)`);
    await source.cleanup(); // removes source grants before dropping backup role
    const admin = new Client(
      connectionOptions(process.env.DCR_TEST_ADMIN_URL!),
    );
    await admin.connect();
    try {
      await admin.query(`DROP ROLE IF EXISTS ${backup}`);
      await admin.query(`DROP ROLE IF EXISTS ${restore}`);
    } finally {
      await admin.end();
    }
    await rm(dir, { recursive: true, force: true });
  }
});
