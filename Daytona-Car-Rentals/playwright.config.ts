import { defineConfig } from "@playwright/test";
import { randomBytes, scryptSync } from "node:crypto";

const password =
  process.env.DCR_E2E_PASSWORD || randomBytes(24).toString("base64url");
process.env.DCR_E2E_PASSWORD = password;
const salt = randomBytes(16).toString("hex");
export default defineConfig({
  globalSetup: "./tests/browser/global-setup.ts",
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
    command: "node --import tsx scripts/e2e-server.ts",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 10000 },
    timeout: 120000,
    env: {
      DCR_DEMO_MODE: "true",
      DCR_ADMIN_PASSWORD_HASH:
        salt + ":" + scryptSync(password, salt, 64).toString("hex"),
      DCR_SITE_ORIGIN: "http://127.0.0.1:3000",
    },
  },
});
