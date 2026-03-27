import "server-only";

import { getApps, initializeApp, cert, getApp, applicationDefault, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  return null;
}

export function hasFirebaseAdminConfig() {
  return Boolean(
    getServiceAccount() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.GCLOUD_PROJECT ||
      process.env.FIREBASE_PROJECT_ID,
  );
}

export function getFirebaseAdminApp(): App | null {
  if (!hasFirebaseAdminConfig()) {
    return null;
  }

  if (getApps().length > 0) {
    return getApp();
  }

  const serviceAccount = getServiceAccount();

  return initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID ?? serviceAccount?.projectId,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

export function getAdminDb() {
  const app = getFirebaseAdminApp();

  if (!app) {
    return null;
  }

  return getFirestore(app);
}

export function getAdminAuth() {
  const app = getFirebaseAdminApp();

  if (!app) {
    return null;
  }

  return getAuth(app);
}
