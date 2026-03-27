"use client";

import Link from "next/link";
import { Building2, CarFront, ClipboardList, LayoutDashboard, MapPinned, ShieldCheck, Users } from "lucide-react";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/fleet", label: "Fleet", icon: CarFront },
  { href: "/admin/fleet/options", label: "Fleet Options", icon: MapPinned },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/verifications", label: "Verifications", icon: ShieldCheck },
  { href: "/admin/partners", label: "Partners", icon: Building2 },
];

export function AdminSidebar({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();

  return (
    <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-6">
        <p className="text-lg font-semibold text-slate-900">Daytona Admin</p>
        <p className="mt-1 text-sm text-slate-500">Operations dashboard</p>
      </div>
      <nav className="grid gap-2">
        {items.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            className={cn(
              "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100",
              pathname === href ? "bg-orange-50 text-orange-600" : "",
            )}
            href={href}
          >
            <span className="flex items-center gap-3">
              <Icon className="h-4 w-4" />
              {label}
            </span>
            {label === "Verifications" && pendingCount > 0 ? <Badge className="bg-orange-50 text-orange-600">{pendingCount}</Badge> : null}
          </Link>
        ))}
      </nav>
      <div className="mt-6 border-t border-slate-200 pt-6 text-sm">
        <Link className="font-medium text-slate-600 hover:text-orange-500" href="/">Back to Site</Link>
      </div>
    </aside>
  );
}
