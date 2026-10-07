"use client";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { JourneyLink } from "@/components/journey/JourneyProvider";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/Brand";
export function Navbar() {
  const [open, setOpen] = useState(false),
    path = usePathname();
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  function close(href: string) {
    setOpen(false);
    if (href.split("#")[0] === path) requestAnimationFrame(() => {
      const target = document.getElementById(href.split("#")[1] || "main-content");
      if (target) { target.tabIndex = -1; target.focus(); }
    });
  }
  if (path.startsWith("/admin")) return null;
  const links = [
    { href: "/fleet", label: "Browse cars" },
    { href: "/assistant", label: "Help me choose" },
    { href: "/#how-it-works", label: "How it works" },
    { href: "/contact", label: "Help" },
    { href: "/my-trip", label: "My trip" },
  ];
  return (
    <header className="site-nav">
      <div className="container nav-inner">
        <Link href="/" aria-label="Daytona Car Rentals home">
          <Brand />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map((l) => (
            <JourneyLink key={l.href} href={l.href}>
              {l.label}
            </JourneyLink>
          ))}
        </nav>
        <JourneyLink className="nav-book" href="/fleet">Browse cars</JourneyLink>
        <button
          ref={toggle}
          className="mobile-menu"
          aria-label="Toggle navigation"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          className="mobile-links"
          aria-label="Mobile navigation"
        >
          {links.map((l) => (
            <JourneyLink key={l.href} href={l.href} onClick={() => close(l.href)}>
              {l.label}
            </JourneyLink>
          ))}
        </nav>
      )}
    </header>
  );
}
