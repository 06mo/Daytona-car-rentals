import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Uses the existing loopback-only database/Auth fixture and never a hosted project.
export default defineConfig({
  ...base,
  testMatch: "document-layout.spec.ts",
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit", launchOptions: {} } },
  ],
});
