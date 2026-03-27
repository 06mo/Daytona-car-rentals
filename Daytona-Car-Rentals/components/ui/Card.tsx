import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type CardPadding = "none" | "sm" | "md" | "lg";

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  className,
  hover = false,
  onClick,
  padding = "none",
  ...props
}: HTMLAttributes<HTMLDivElement> & { hover?: boolean; padding?: CardPadding }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-200 bg-white shadow-sm",
        paddingClasses[padding],
        hover ? "cursor-pointer transition-shadow hover:shadow-md" : "",
        onClick ? "cursor-pointer" : "",
        className,
      )}
      onClick={onClick}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold tracking-tight text-slate-900", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-6 text-slate-500", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center px-6 pb-6 pt-2", className)} {...props} />;
}
