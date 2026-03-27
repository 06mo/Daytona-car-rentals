import { getApps, initializeApp, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const clientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function hasFirebaseClientConfig() {
  return Object.values(clientConfig).every(Boolean);
}

export function getFirebaseClientApp(): FirebaseApp | null {
  if (!hasFirebaseClientConfig()) {
    return null;
  }

  return getApps().length > 0 ? getApp() : initializeApp(clientConfig);
}

export function getClientServices() {
  const app = getFirebaseClientApp();

  if (!app) {
    return null;
  }

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app),
  };
}
