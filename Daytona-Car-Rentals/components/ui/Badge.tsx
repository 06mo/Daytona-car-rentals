import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";
type BadgeSize = "sm" | "md";

const variantClasses: Record<BadgeVariant, string> = {
  default: "border-slate-200 bg-slate-100 text-slate-700",
  success: "border-emerald-200 bg-emerald-100 text-emerald-700",
  warning: "border-amber-200 bg-amber-100 text-amber-700",
  error: "border-red-200 bg-red-100 text-red-700",
  info: "border-blue-200 bg-blue-100 text-blue-700",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
};

export function Badge({
  className,
  variant = "default",
  size = "md",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant; size?: BadgeSize }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
