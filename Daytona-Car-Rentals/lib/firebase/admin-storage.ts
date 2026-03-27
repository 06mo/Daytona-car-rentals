import "server-only";

import { getStorage as getAdminStorage } from "firebase-admin/storage";

import { getFirebaseAdminApp } from "@/lib/firebase/admin";
import { FirebaseStorageConfigError } from "@/lib/firebase/client-storage";

export async function getSignedStorageUrl(storagePath: string) {
  const app = getFirebaseAdminApp();

  if (!app || !app.options.storageBucket) {
    throw new FirebaseStorageConfigError();
  }

  const bucket = getAdminStorage(app).bucket(app.options.storageBucket);
  const [signedUrl] = await bucket.file(storagePath).getSignedUrl({
    action: "read",
    expires: Date.now() + 60 * 60 * 1000,
  });

  return signedUrl;
}
