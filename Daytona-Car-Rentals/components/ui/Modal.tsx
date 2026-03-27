"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ModalProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  onClose?: () => void;
  open: boolean;
  title: string;
};

export function Modal({ children, className, description, onClose, open, title }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-10">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        aria-describedby={description ? "modal-description" : undefined}
        aria-labelledby="modal-title"
        aria-modal="true"
        className={cn("relative z-10 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl", className)}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="text-xl font-semibold tracking-tight text-slate-900">
              {title}
            </h2>
            {description ? (
              <p id="modal-description" className="mt-2 text-sm leading-6 text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
          {onClose ? (
            <button
              aria-label="Close modal"
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          ) : null}
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
