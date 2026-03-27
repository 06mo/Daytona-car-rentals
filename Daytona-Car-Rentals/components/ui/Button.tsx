import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { ButtonSize, ButtonVariant } from "@/types";

type SharedProps = {
  children: ReactNode;
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

type ButtonAsButtonProps = SharedProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: false;
  };

type ButtonAsLinkProps = SharedProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> & {
    asChild: true;
    href: string;
  };

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-500",
  secondary: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus-visible:ring-slate-400",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

const baseClasses =
  "inline-flex items-center justify-center rounded-full font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60";

export function Button({
  children,
  className,
  size = "md",
  variant = "primary",
  asChild = false,
  ...props
}: ButtonAsButtonProps | ButtonAsLinkProps) {
  const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);

  if (asChild) {
    const linkProps = props as ButtonAsLinkProps;

    return (
      <Link href={linkProps.href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(props as ButtonAsButtonProps)}>
      {children}
    </button>
  );
}
