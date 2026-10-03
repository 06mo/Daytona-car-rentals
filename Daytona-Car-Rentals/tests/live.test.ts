import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.DCR_DEMO_MODE = "false";
process.env.DCR_DATABASE_PATH = join(
  mkdtempSync(join(tmpdir(), "dcr-live-tests-")),
  "live.sqlite",
);
import * as store from "../lib/pilot/store";
test("new live database starts closed, with no example rates or approved insurance", () => {
  const state = store.publicState();
  assert.equal(state.open, false);
  assert.equal(state.demo, false);
  assert.equal(state.airportOpen, false);
  assert.equal(state.rates.length, 12);
  assert.ok(state.rates.every((r) => !r.enabled && r.dailyCents === 0));
  assert.equal(store.settings().policyApproved, false);
  assert.equal(store.settings().agreementApproved, false);
});
test("incomplete approvals cannot enable requests", () => {
  assert.throws(
    () =>
      store.adminAction({
        action: "settings",
        settings: { ...store.settings(), requestsEnabled: true },
      }),
    /must be configured/,
  );
});
