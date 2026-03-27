import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { ButtonSize, ButtonVariant } from "@/types";
import { Spinner } from "@/components/ui/Spinner";

type SharedProps = {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  loading?: boolean;
  rightIcon?: ReactNode;
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
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400",
  danger: "bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-500",
  outline: "border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400",
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
  fullWidth = false,
  leftIcon,
  loading = false,
  rightIcon,
  size = "md",
  variant = "primary",
  asChild = false,
  ...props
}: ButtonAsButtonProps | ButtonAsLinkProps) {
  const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], fullWidth ? "w-full" : "", className);
  const content = (
    <>
      {loading ? <Spinner className="h-4 w-4 border-current border-t-transparent" /> : leftIcon}
      <span>{children}</span>
      {!loading ? rightIcon : null}
    </>
  );

  if (asChild) {
    const linkProps = props as ButtonAsLinkProps;

    return (
      <Link href={linkProps.href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={loading || (props as ButtonAsButtonProps).disabled} {...(props as ButtonAsButtonProps)}>
      {content}
    </button>
  );
}
