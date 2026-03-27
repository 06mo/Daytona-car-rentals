import { getProtectionPackageDefinition } from "@/lib/protection/config";
import { cn } from "@/lib/utils";
import type { ProtectionPackageId } from "@/types";

const badgeStyles: Record<ProtectionPackageId, string> = {
  basic: "border-slate-200 bg-slate-100 text-slate-700",
  standard: "border-sky-200 bg-sky-50 text-sky-700",
  premium: "border-amber-200 bg-amber-50 text-amber-700",
};

export function ProtectionPackageBadge({ packageId = "standard" }: { packageId?: ProtectionPackageId }) {
  const protectionPackage = getProtectionPackageDefinition(packageId);

  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", badgeStyles[packageId])}>
      {protectionPackage.badgeLabel}
    </span>
  );
}
