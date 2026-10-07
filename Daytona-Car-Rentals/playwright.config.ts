import { defineConfig } from "@playwright/test";
import { randomBytes, scryptSync } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
const password =
  process.env.DCR_E2E_PASSWORD || randomBytes(24).toString("base64url");
process.env.DCR_E2E_PASSWORD = password;
const salt = randomBytes(16).toString("hex");
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
    launchOptions: { executablePath: process.env.CHROMIUM_BIN || undefined },
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: process.env.DCR_E2E_PRODUCTION === "true" ? "npm run start -- --hostname 127.0.0.1" : "npm run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      DCR_DEMO_MODE: "true",
      DCR_DATABASE_PATH: join(
        tmpdir(),
        "dcr-e2e-" + process.pid,
        "pilot.sqlite",
      ),
      DCR_ADMIN_PASSWORD_HASH:
        salt + ":" + scryptSync(password, salt, 64).toString("hex"),
      DCR_SITE_ORIGIN: "http://127.0.0.1:3000",
    },
  },
});
