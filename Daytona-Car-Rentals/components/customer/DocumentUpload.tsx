"use client";
import { useEffect, useId, useRef, useState } from "react";
type SavedDocument = {
  id: string;
  kind: string;
  valid_until?: string;
  reviewed?: boolean;
};
type Props<T> = {
  endpoint: string;
  payload: Record<string, unknown>;
  done: (value: T) => void;
  disabled?: boolean;
  demo?: boolean;
  onBusy?: (v: boolean) => void;
  documents?: SavedDocument[];
  requiredDocuments?: string[];
  documentUrl?: (id: string) => string;
  remove?: (doc: SavedDocument) => Promise<void>;
};
/** Shared private uploader: selection stays in memory and never implies persistence. */
export function DocumentUpload<T>(props: Props<T>) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="document-cards">
      {["license", "insurance"].map((kind) => (
        <DocumentCard
          key={kind}
          {...props}
          disabled={props.disabled || busy}
          onBusy={(value) => {
            setBusy(value);
            props.onBusy?.(value);
          }}
          kind={kind}
          saved={props.documents?.find((d) => d.kind === kind)}
        />
      ))}
    </div>
  );
}
function DocumentCard<T>({
  kind,
  saved,
  endpoint,
  payload,
  done,
  disabled,
  demo,
  onBusy,
  requiredDocuments,
  documentUrl,
  remove,
}: Props<T> & { kind: string; saved?: SavedDocument }) {
  const title = kind === "license" ? "Driver’s license" : "Insurance document";
  const id = useId(),
    picker = useRef<HTMLInputElement>(null),
    primary = useRef<HTMLButtonElement>(null);
  const [restoreFocus, setRestoreFocus] = useState(false);
  useEffect(() => {
    if (restoreFocus && !disabled) {
      primary.current?.focus();
      setRestoreFocus(false);
    }
  }, [restoreFocus, disabled]);
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState("");
  const [validUntil, setValidUntil] = useState(saved?.valid_until || ""),
    [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState<number | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (!file) setValidUntil(saved?.valid_until || "");
  }, [saved?.id, saved?.valid_until, file]);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function select(next?: File) {
    if (!next) return;
    setError("");
    if (
      !["image/jpeg", "image/png"].includes(next.type) ||
      !next.size ||
      next.size > 2097152
    ) {
      setError(
        "Choose a JPEG or PNG image no larger than 2 MB. Your previous upload is unchanged.",
      );
      return;
    }
    setFile(next);
    setConsent(false);
  }
  async function upload() {
    setError("");
    if (!file) {
      picker.current?.click();
      return;
    }
    if (!validUntil || !consent) {
      setError(
        "Enter the expiration date and confirm the document notice before uploading.",
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
          reject(Error("Connection interrupted. Retry the selected image."));
        xhr.ontimeout = () =>
          reject(
            Error("Upload timed out. Refresh saved documents before retrying."),
          );
        xhr.send(
          JSON.stringify({
            ...payload,
            kind,
            content: btoa(raw),
            validUntil,
          }),
        );
      });
      done(result);
      setFile(null);

      setConsent(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to upload. Retry the selected image.",
      );
    } finally {
      setProgress(null);
      onBusy?.(false);
    }
  }
  return (
    <form
      className="document-upload document-card"
      aria-label={title}
      onSubmit={(e) => {
        e.preventDefault();
        void upload();
      }}
    >
      <h4>{title}</h4>
      <p className="small-note">
        {requiredDocuments?.includes(kind)
          ? "Required"
          : requiredDocuments
            ? "Optional"
            : "Requirements shown with your trip quote"}
      </p>
      <p role="status">
        {progress !== null
          ? "Uploading"
          : saved
            ? "Uploaded — awaiting review"
            : "Missing"}
      </p>
      {saved?.reviewed && (
        <p className="small-note">
          The saved version was previously reviewed. Any replacement needs a new
          review.
        </p>
      )}
      {(preview || (saved && documentUrl)) && (
        <img
          className="document-preview"
          src={preview || documentUrl!(saved!.id)}
          alt={file ? `Selected ${title} — not uploaded` : `Saved ${title}`}
        />
      )}
      {file && (
        <p className="small-note">
          Selected image — not uploaded.{" "}
          {saved
            ? "Your saved document stays in place until this upload succeeds."
            : "Select Save image to upload it privately."}
        </p>
      )}
      <fieldset disabled={disabled || progress !== null}>
        <input
          ref={picker}
          hidden
          type="file"
          aria-label={`${title} image file`}
          accept="image/jpeg,image/png"
          onChange={(e) => {
            select(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {file ? (
          <label htmlFor={id}>
            Expiration date
            <input
              id={id}
              type="date"
              className="rental-date-control"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </label>
        ) : saved && (
          <p className="document-expiration">
            <span>Expiration date</span>
            <time dateTime={saved.valid_until}>{saved.valid_until || "Not recorded"}</time>
          </p>
        )}
        {file && (
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            {demo
              ? "This is a synthetic test image, not a real identity document."
              : "I understand the private document retention policy."}
          </label>
        )}
        <div className="document-actions">
          <button
            ref={primary}
            className={file ? "journey-secondary" : "journey-primary"}
            type="button"
            onClick={() => picker.current?.click()}
          >
            {file || saved ? "Replace image" : "Upload image"}
          </button>
          {file ? (
            <button
              className="text-link"
              type="button"
              onClick={() => {
                setFile(null);
                setError("");
                setRestoreFocus(true);
              }}
            >
              Remove selected image
            </button>
          ) : (
            saved &&
            remove && (
              <button
                className="text-link"
                type="button"
                onClick={async () => {
                  onBusy?.(true);
                  setError("");
                  try {
                    await remove(saved);
                    setRestoreFocus(true);
                  } catch {
                    setError("Unable to remove document. Please retry.");
                  } finally {
                    onBusy?.(false);
                  }
                }}
              >
                Remove
              </button>
            )
          )}
          {file && (
            <button className="journey-primary" type="submit">
              {error ? "Retry save" : "Save image"}
            </button>
          )}
        </div>
      </fieldset>
      <p className="small-note">
        JPEG or PNG, up to 2 MB and 16 megapixels. Private upload; owner review
        is still required.
      </p>
      {progress !== null && (
        <progress
          aria-label={`${title} upload progress`}
          value={progress}
          max={100}
        />
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
    </form>
  );
}
