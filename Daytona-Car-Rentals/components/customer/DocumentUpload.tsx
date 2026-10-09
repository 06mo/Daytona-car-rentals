"use client";
import { useState } from "react";
/** Shared request/draft uploader. Bytes exist only in memory until the private API accepts them. */
export function DocumentUpload<T>({
  endpoint,
  payload,
  done,
  disabled,
  demo,
  onBusy,
}: {
  endpoint: string;
  payload: Record<string, unknown>;
  done: (value: T) => void;
  disabled?: boolean;
  demo?: boolean;
  onBusy?: (v: boolean) => void;
}) {
  const [progress, setProgress] = useState<number | null>(null),
    [error, setError] = useState("");
  async function upload(form: HTMLFormElement) {
    const f = new FormData(form),
      selected = f.get("file") as File,
      camera = f.get("camera") as File,
      file = selected?.size ? selected : camera;
    setError("");
    if (
      !file ||
      !["image/jpeg", "image/png"].includes(file.type) ||
      file.size > 2097152
    ) {
      setError(
        "Choose a JPEG or PNG image no larger than 2 MB. Your previous upload is unchanged.",
      );
      return;
    }
    setProgress(0);
    onBusy?.(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let raw = "";
      for (const b of bytes) raw += String.fromCharCode(b);
      const result = await new Promise<T>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", endpoint);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.timeout = 45000;
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setProgress(Math.min(99, Math.round((100 * e.loaded) / e.total)));
        };
        xhr.onload = () => {
          try {
            const d = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) resolve(d);
            else reject(Error(d.error || "Upload failed."));
          } catch {
            reject(Error("Upload failed."));
          }
        };
        xhr.onerror = () =>
          reject(
            Error(
              "Connection interrupted. Your previous upload is unchanged; retry this file.",
            ),
          );
        xhr.ontimeout = () =>
          reject(
            Error("Upload timed out. Refresh saved documents before retrying."),
          );
        xhr.send(
          JSON.stringify({
            ...payload,
            kind: f.get("kind"),
            content: btoa(raw),
            ...(f.get("validUntil") ? { validUntil: f.get("validUntil") } : {}),
          }),
        );
      });
      done(result);
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to upload.");
    } finally {
      setProgress(null);
      onBusy?.(false);
    }
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void upload(e.currentTarget);
      }}
      className="document-upload"
    >
      <fieldset disabled={disabled || progress !== null}>
        <legend>Upload or replace a document</legend>
        <label>
          Document type
          <select name="kind">
            <option value="license">Driver license</option>
            <option value="insurance">Insurance document</option>
          </select>
        </label>
        <label>
          Document valid through
          <input name="validUntil" type="date" required />
        </label>
        <label>
          Choose image file
          <input
            type="file"
            name="file"
            accept="image/jpeg,image/png"
            onChange={(e) => {
              const other = e.currentTarget.form?.elements.namedItem(
                "camera",
              ) as HTMLInputElement | null;
              if (e.currentTarget.files?.length && other) other.value = "";
            }}
          />
        </label>
        <label>
          Take a photo
          <input
            type="file"
            name="camera"
            accept="image/jpeg,image/png"
            capture="environment"
            onChange={(e) => {
              const other = e.currentTarget.form?.elements.namedItem(
                "file",
              ) as HTMLInputElement | null;
              if (e.currentTarget.files?.length && other) other.value = "";
            }}
          />
        </label>
        <p className="small-note">
          On your phone, choose a file or use the camera option. JPEG or PNG, up
          to 2 MB and 16 megapixels.
        </p>
        <label className="checkbox-row">
          <input type="checkbox" required />
          {demo
            ? "This is a synthetic test image, not a real identity document."
            : "I understand the private document retention policy."}
        </label>
        <button className="journey-primary">Upload privately</button>
      </fieldset>
      {progress !== null && (
        <div role="status">
          <progress
            aria-label="Document upload progress"
            value={progress}
            max={100}
          />
          <p>
            {progress >= 99
              ? "Processing image securely…"
              : `Uploading ${progress}%…`}
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
    </form>
  );
}
