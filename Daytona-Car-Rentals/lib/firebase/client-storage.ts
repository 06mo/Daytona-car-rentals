import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

import { getClientServices } from "@/lib/firebase/client";

export class FirebaseStorageConfigError extends Error {
  constructor(message = "Firebase Storage is not configured.") {
    super(message);
    this.name = "FirebaseStorageConfigError";
  }
}

export async function uploadFileWithProgress({
  file,
  onProgress,
  path,
}: {
  file: File;
  onProgress?: (progress: number) => void;
  path: string;
}) {
  const services = getClientServices();

  if (!services) {
    throw new FirebaseStorageConfigError();
  }

  const storageRef = ref(services.storage, path);
  const task = uploadBytesResumable(storageRef, file);

  return new Promise<{ downloadURL: string; storageRef: string }>((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.(progress);
      },
      reject,
      async () => {
        const downloadURL = await getDownloadURL(task.snapshot.ref);
        resolve({
          downloadURL,
          storageRef: path,
        });
      },
    );
  });
}

export async function uploadDocumentWithProgress({
  file,
  onProgress,
  path,
}: {
  file: File;
  onProgress?: (progress: number) => void;
  path: string;
}) {
  return uploadFileWithProgress({ file, onProgress, path });
}
