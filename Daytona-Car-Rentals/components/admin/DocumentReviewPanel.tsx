"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { UserDocument } from "@/types";

export function DocumentReviewPanel({
  documents,
  userId,
}: {
  documents: UserDocument[];
  userId: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeDocType, setActiveDocType] = useState<UserDocument["type"] | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function getAuthHeaders() {
    const { getClientServices } = await import("@/lib/firebase/client");
    const currentUser = getClientServices()?.auth.currentUser;
    const token = currentUser ? await currentUser.getIdToken() : "";
    return token ? ({ Authorization: `Bearer ${token}` } as Record<string, string>) : ({} as Record<string, string>);
  }

  async function handlePreview(document: UserDocument) {
    setError(null);
    const headers = await getAuthHeaders();
    const response = await fetch("/api/admin/get-document-signed-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        userId,
        docType: document.type,
      }),
    });
    const data = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !data.url) {
      setError(data.error ?? "Unable to generate preview URL.");
      return;
    }
    setPreviewUrl(data.url);
  }

  async function submitDocumentReview(docType: UserDocument["type"], action: "approve" | "reject", reason?: string) {
    setError(null);
    const headers = await getAuthHeaders();
    const response = await fetch("/api/admin/verify-document", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        userId,
        docType,
        action,
        rejectionReason: reason,
      }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "Unable to review document.");
      return false;
    }
    return true;
  }

  async function reviewDocument(docType: UserDocument["type"], action: "approve" | "reject", reason?: string) {
    const success = await submitDocumentReview(docType, action, reason);

    if (success) {
      window.location.reload();
    }
  }

  async function approveAll() {
    for (const document of documents) {
      const success = await submitDocumentReview(document.type, "approve");

      if (!success) {
        return;
      }
    }

    window.location.reload();
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Document Review</h2>
        <Button onClick={approveAll} size="sm" type="button">
          Approve All
        </Button>
      </div>

      <div className="mt-4 grid gap-4">
        {documents.map((document) => (
          <div key={document.id} className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900">{document.fileName}</p>
                <p className="mt-1 text-sm text-slate-500">Uploaded {document.uploadedAt.toLocaleDateString()}</p>
                <p className="mt-1 text-sm text-slate-500">Status: {document.status}</p>
                {document.rejectionReason ? (
                  <p className="mt-2 text-sm text-red-600">Reason: {document.rejectionReason}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => handlePreview(document)} size="sm" type="button" variant="secondary">
                  Preview
                </Button>
                <Button onClick={() => reviewDocument(document.type, "approve")} size="sm" type="button">
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    setActiveDocType(document.type);
                    setRejectionReason("");
                  }}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ))}
        {documents.length === 0 ? <p className="text-sm text-slate-500">No documents uploaded yet.</p> : null}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <Modal
        description="Signed URL preview expires automatically after one hour."
        onClose={() => setPreviewUrl(null)}
        open={Boolean(previewUrl)}
        title="Document Preview"
      >
        {previewUrl ? (
          <iframe className="h-[70vh] w-full rounded-2xl border border-slate-200" src={previewUrl} title="Document preview" />
        ) : null}
      </Modal>

      <Modal
        description="A rejection reason is required so the customer knows what to fix."
        onClose={() => setActiveDocType(null)}
        open={Boolean(activeDocType)}
        title="Reject Document"
      >
        <div className="space-y-4">
          <textarea
            className="min-h-32 w-full rounded-2xl border border-slate-300 p-4"
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Explain what needs to be corrected"
            value={rejectionReason}
          />
          <Button
            onClick={async () => {
              if (!activeDocType) {
                return;
              }
              await reviewDocument(activeDocType, "reject", rejectionReason);
              setActiveDocType(null);
            }}
            type="button"
          >
            Submit Rejection
          </Button>
        </div>
      </Modal>
    </div>
  );
}
