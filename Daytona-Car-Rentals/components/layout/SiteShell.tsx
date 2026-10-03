import type { ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main id="main-content">{children}</main>
      <Footer />
    </div>
  );
}
