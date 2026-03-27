"use client";

import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

import { getClientServices } from "@/lib/firebase/client";
import { uploadDocumentWithProgress } from "@/lib/firebase/client-storage";

type DocumentUploadProps = {
  onUploadComplete: (ref: string) => void;
  type: "drivers_license" | "insurance_card";
  userId: string;
};

const allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];
const maxSizeInBytes = 10 * 1024 * 1024;

export function DocumentUpload({ onUploadComplete, type, userId }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleFile(file: File | null) {
    if (!file) {
      return;
    }

    if (!allowedMimeTypes.includes(file.type) || file.size > maxSizeInBytes) {
      setError("File must be JPG, PNG, or PDF under 10MB.");
      return;
    }

    setError(null);
    setFileName(file.name);

    try {
      const currentUser = getClientServices()?.auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : "";

      try {
        const result = await uploadDocumentWithProgress({
          file,
          path: `users/${userId}/documents/${type}/${file.name}`,
          onProgress: setProgress,
        });
        setPreviewUrl(file.type.startsWith("image/") ? result.downloadURL : null);
      } catch (storageError) {
        if (storageError instanceof Error && storageError.name === "FirebaseStorageConfigError") {
          setProgress(100);
        } else {
          throw storageError;
        }
      }

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type,
          storageRef: `users/${userId}/documents/${type}/${file.name}`,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });

      const data = (await response.json()) as { document?: { storageRef: string }; error?: string };

      if (!response.ok || !data.document) {
        throw new Error(data.error ?? "Unable to store document metadata.");
      }

      onUploadComplete(data.document.storageRef);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    }
  }

  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5">
      <input
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
        ref={inputRef}
        type="file"
      />
      <button
        className="flex w-full flex-col items-center gap-3 rounded-2xl bg-slate-50 px-4 py-8 text-center hover:bg-slate-100"
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        <UploadCloud className="h-6 w-6 text-orange-500" />
        <span className="text-sm font-medium text-slate-700">Upload {type === "drivers_license" ? "Driver's License" : "Insurance Card"}</span>
        <span className="text-xs text-slate-500">JPG, PNG, PDF · 10MB max</span>
      </button>
      {progress > 0 ? (
        <div className="mt-4">
          <div className="h-2 rounded-full bg-slate-200">
            <div className="h-2 rounded-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">{progress < 100 ? "Uploading..." : `Uploaded ${fileName}`}</p>
        </div>
      ) : null}
      {previewUrl ? (
        <img alt={fileName ?? "Uploaded document preview"} className="mt-4 max-h-40 rounded-2xl object-cover" src={previewUrl} />
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
