"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ModalProps = {
  children: ReactNode;
  className?: string;
  description?: string;
  footer?: ReactNode;
  onClose?: () => void;
  open: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  title: string;
};

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-6xl",
} as const;

export function Modal({
  children,
  className,
  description,
  footer,
  onClose,
  open,
  size = "md",
  title,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableElements = getFocusableElements(panelRef.current);
    (focusableElements[0] ?? panelRef.current)?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose?.();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = getFocusableElements(panelRef.current);

    if (focusableElements.length === 0) {
      event.preventDefault();
      panelRef.current?.focus();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }

    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-10 backdrop-blur-sm"
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn("relative z-10 w-full rounded-3xl bg-white p-6 shadow-2xl", sizeClasses[size], className)}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-semibold tracking-tight text-slate-900">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-500">
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
        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>
    </div>
  );
}

function getFocusableElements(container: HTMLDivElement | null) {
  if (!container) {
    return [] as HTMLElement[];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("aria-hidden"));
}
