"use client";

import Link from "next/link";
import { ClipboardList, FileCheck, LayoutDashboard, Search, UserCircle } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/bookings", label: "My Bookings", icon: ClipboardList },
  { href: "/dashboard/documents", label: "Documents", icon: FileCheck },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
];

export function CustomerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-6">
        <p className="text-lg font-semibold text-slate-900">My Daytona</p>
        <p className="mt-1 text-sm text-slate-500">Bookings, documents, and profile</p>
      </div>
      <nav className="grid gap-2">
        {items.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100",
              pathname === href ? "bg-orange-50 text-orange-600" : "",
            )}
            href={href}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-6 border-t border-slate-200 pt-6 text-sm">
        <Link className="flex items-center gap-2 font-medium text-slate-600 hover:text-orange-500" href="/fleet">
          <Search className="h-4 w-4" />
          Browse Fleet
        </Link>
      </div>
    </aside>
  );
}
