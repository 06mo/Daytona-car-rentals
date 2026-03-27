import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Input({ className, label, hint, error, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="flex w-full flex-col gap-2" htmlFor={inputId}>
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
      <input
        id={inputId}
        className={cn(
          "h-11 rounded-2xl border border-slate-300 bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-200",
          error ? "border-red-300 focus:border-red-400 focus:ring-red-200" : "",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
      {!error && hint ? <span className="text-sm text-slate-500">{hint}</span> : null}
    </label>
  );
}
