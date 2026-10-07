"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { JourneyNotice, JourneyProvider } from "@/components/journey/JourneyProvider";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  const path = usePathname();
  const previous = useRef(path);
  useEffect(() => {
    if (previous.current === path) return;
    previous.current = path;
    const frame = requestAnimationFrame(() => {
      const fragment = window.location.hash.slice(1);
      const target = (fragment && document.getElementById(fragment)) || document.querySelector<HTMLElement>("main h1") || document.querySelector<HTMLElement>("main");
      if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [path]);
  return (
    <JourneyProvider>
    <div className="min-h-screen">
      <Navbar />
      <main id="main-content"><JourneyNotice />{children}</main>
      <Footer />
    </div>
    </JourneyProvider>
  );
}
