import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
};

export function Input({ className, label, hint, error, id, leftAddon, rightAddon, ...props }: InputProps) {
  const inputId = id ?? props.name;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <label className="flex w-full flex-col gap-2" htmlFor={inputId}>
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
      <span
        className={cn(
          "flex h-11 items-center rounded-2xl border border-slate-300 bg-white text-slate-900 transition focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-200",
          error ? "border-red-300 focus-within:border-red-400 focus-within:ring-red-200" : "",
        )}
      >
        {leftAddon ? <span className="pl-4 text-slate-500">{leftAddon}</span> : null}
        <input
          aria-describedby={describedBy}
          id={inputId}
          className={cn(
            "h-full w-full rounded-2xl bg-transparent px-4 outline-none placeholder:text-slate-400",
            leftAddon ? "pl-3" : "",
            rightAddon ? "pr-3" : "",
            className,
          )}
          {...props}
        />
        {rightAddon ? <span className="pr-4 text-slate-500">{rightAddon}</span> : null}
      </span>
      {error ? <span className="text-sm text-red-600" id={`${inputId}-error`}>{error}</span> : null}
      {!error && hint ? <span className="text-sm text-slate-500" id={`${inputId}-hint`}>{hint}</span> : null}
    </label>
  );
}
