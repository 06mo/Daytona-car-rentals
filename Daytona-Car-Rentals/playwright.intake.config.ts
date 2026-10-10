import { defineConfig } from "@playwright/test";
import base from "./playwright.recovery.config";
export default defineConfig({ ...base, testMatch: "intake-layout.spec.ts" });
