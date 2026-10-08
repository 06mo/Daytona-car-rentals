import test, { before, after } from "node:test";
import { createTestDatabase } from "./postgres-fixture";
import { query, closeDatabase } from "../lib/pilot/database";
let fixture: Awaited<ReturnType<typeof createTestDatabase>>;
before(async () => { fixture = await createTestDatabase(false); process.env.DCR_DATABASE_URL = fixture.url; });
after(async () => { await closeDatabase(); await fixture?.cleanup(); });
import assert from "node:assert/strict";
process.env.DCR_DEMO_MODE = "false";
import * as store from "../lib/pilot/store";
test("new live database starts closed, with no example rates or approved insurance", async () => {
    const state = (await store.publicState());
    assert.equal(state.open, false);
    assert.equal(state.demo, false);
    assert.equal(state.airportOpen, false);
    assert.equal(state.rates.length, 12);
    assert.ok(state.rates.every((r) => !r.enabled && r.dailyCents === 0));
    assert.equal((await store.settings()).policyApproved, false);
    assert.equal((await store.settings()).agreementApproved, false);
});
test("incomplete approvals cannot enable requests", async () => {
    await assert.rejects(async () => (await store.adminAction({
        action: "settings",
        settings: { ...(await store.settings()), requestsEnabled: true },
    })), /must be configured/);
});
