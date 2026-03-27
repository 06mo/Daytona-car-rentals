#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function printUsage() {
  console.error("Usage:");
  console.error("  node scripts/set-admin-claim.mjs <uid> [service-account-json-path]");
  console.error("");
  console.error("Examples:");
  console.error("  node scripts/set-admin-claim.mjs abc123 ./service-account.json");
  console.error("  npm run set-admin-claim -- abc123 ./service-account.json");
}

async function loadServiceAccount(serviceAccountPath) {
  const resolvedPath = resolve(serviceAccountPath);
  const raw = await readFile(resolvedPath, "utf8");
  return JSON.parse(raw);
}

async function main() {
  const [, , uid, serviceAccountPath] = process.argv;

  if (!uid) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (!serviceAccountPath) {
    console.error("A Firebase service account JSON path is required for this one-off script.");
    console.error("Tip: use the file you downloaded from Firebase Console -> Service accounts.");
    printUsage();
    process.exitCode = 1;
    return;
  }

  const serviceAccount = await loadServiceAccount(serviceAccountPath);
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

  await getAuth(app).setCustomUserClaims(uid, { role: "admin" });

  console.log(`Admin claim set for UID: ${uid}`);
  console.log("Have that user sign out and sign back in to refresh their token.");
}

main().catch((error) => {
  console.error("Failed to set admin claim.");
  console.error(error);
  process.exitCode = 1;
});
