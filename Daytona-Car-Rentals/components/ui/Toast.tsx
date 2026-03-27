"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info";

export type ToastMessage = {
  id: string;
  message: string;
  variant: ToastVariant;
};

const variantStyles: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

const variantIcons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
} as const;

export function Toast({ message, variant }: Omit<ToastMessage, "id">) {
  const Icon = variantIcons[variant];

  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg", variantStyles[variant])}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
