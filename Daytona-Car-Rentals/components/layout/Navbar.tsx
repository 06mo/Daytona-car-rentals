"use client";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/Brand";
export function Navbar() {
  const [open, setOpen] = useState(false),
    path = usePathname();
  if (path.startsWith("/admin")) return null;
  const links = [
    { href: "/fleet", label: "Our cars" },
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
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <Link className="nav-book" href="/booking">
          Choose a car
        </Link>
        <button
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
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
