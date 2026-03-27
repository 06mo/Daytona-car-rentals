import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: SelectOption[];
};

export function Select({ className, error, id, label, options, ...props }: SelectProps) {
  const selectId = id ?? props.name;
  const describedBy = error ? `${selectId}-error` : undefined;

  return (
    <label className="flex w-full flex-col gap-2" htmlFor={selectId}>
      {label ? <span className="text-sm font-medium text-slate-700">{label}</span> : null}
      <select
        aria-describedby={describedBy}
        id={selectId}
        className={cn(
          "h-11 rounded-2xl border border-slate-300 bg-white px-4 text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200",
          error ? "border-red-300 focus:border-red-400 focus:ring-red-200" : "",
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-sm text-red-600" id={describedBy}>{error}</span> : null}
    </label>
  );
}
