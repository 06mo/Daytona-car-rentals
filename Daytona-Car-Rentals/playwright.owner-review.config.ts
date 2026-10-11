import { defineConfig } from "@playwright/test";
import base from "./playwright.recovery.config";
export default defineConfig({ ...base, testMatch: "owner-review.spec.ts" });
