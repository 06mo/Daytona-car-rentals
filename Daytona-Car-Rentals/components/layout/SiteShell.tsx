"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

type SiteShellProps = {
  children: ReactNode;
};

const authRoutes = ["/login", "/auth/verify", "/auth/magic-link-sent"];

export function SiteShell({ children }: SiteShellProps) {
  const pathname = usePathname();
  const hideChrome = authRoutes.includes(pathname);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100">
      {!hideChrome ? <Navbar /> : null}
      <main>{children}</main>
      {!hideChrome ? <Footer /> : null}
    </div>
  );
}
