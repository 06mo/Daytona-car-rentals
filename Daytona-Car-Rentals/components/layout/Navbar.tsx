"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types";

const navItems: NavItem[] = [
  { href: "/fleet", label: "Fleet" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-950">
          Daytona Car Rentals
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:text-orange-500",
                pathname === item.href ? "font-semibold text-orange-500" : "",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button asChild variant="ghost" size="sm" href="/login">
            Log In
          </Button>
          <Button asChild size="sm" href="/login">
            Sign Up
          </Button>
        </div>

        <button
          aria-expanded={isOpen}
          aria-label="Toggle navigation menu"
          className="inline-flex rounded-full border border-slate-200 p-2 text-slate-700 lg:hidden"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isOpen ? (
        <div className="border-t border-slate-200 bg-white px-6 py-6 lg:hidden">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-2xl px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-100",
                  pathname === item.href ? "bg-orange-50 text-orange-600" : "",
                )}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            <Button asChild variant="ghost" href="/login">
              Log In
            </Button>
            <Button asChild href="/login">
              Sign Up
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
