"use client";

import Link from "next/link";
import { LogOut, Menu, ShieldCheck, UserCircle2, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { getClientServices } from "@/lib/firebase/client";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"customer" | "admin" | null>(null);

  useEffect(() => {
    const services = getClientServices();

    if (!services) {
      return;
    }

    return onAuthStateChanged(services.auth, async (user) => {
      setCurrentUser(user);

      if (!user) {
        setUserRole(null);
        return;
      }

      const tokenResult = await user.getIdTokenResult();
      setUserRole(tokenResult.claims.role === "admin" ? "admin" : "customer");
    });
  }, []);

  async function handleSignOut() {
    const services = getClientServices();

    if (!services) {
      return;
    }

    await signOut(services.auth);
    document.cookie = "__session=; path=/; max-age=0; SameSite=Strict";
    window.location.href = "/";
  }

  const authedItems =
    userRole === "admin"
      ? [{ href: "/admin/dashboard", label: "Admin Panel" }]
      : [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/dashboard/bookings", label: "My Bookings" },
        ];

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
          {currentUser ? (
            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setMenuOpen((current) => !current)}
                type="button"
              >
                <UserCircle2 className="h-5 w-5 text-orange-500" />
                <span>{currentUser.displayName ?? currentUser.email?.split("@")[0] ?? "Account"}</span>
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-12 z-40 grid min-w-52 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  {authedItems.map((item) => (
                    <Link
                      key={item.href}
                      className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={handleSignOut}
                    type="button"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" href="/login">
                Log In
              </Button>
              <Button asChild size="sm" href="/login">
                Sign Up
              </Button>
            </>
          )}
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
            {currentUser ? (
              <>
                {authedItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-2xl px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-100",
                      pathname === item.href ? "bg-orange-50 text-orange-600" : "",
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="flex items-center gap-2">
                      {item.label === "Admin Panel" ? <ShieldCheck className="h-4 w-4" /> : <UserCircle2 className="h-4 w-4" />}
                      {item.label}
                    </span>
                  </Link>
                ))}
              </>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3">
            {currentUser ? (
              <Button leftIcon={<LogOut className="h-4 w-4" />} onClick={handleSignOut} variant="ghost">
                Sign Out
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" href="/login">
                  Log In
                </Button>
                <Button asChild href="/login">
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
