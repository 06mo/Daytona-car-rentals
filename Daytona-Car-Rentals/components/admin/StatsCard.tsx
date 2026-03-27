import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";

export function StatsCard({
  change,
  changeType = "neutral",
  icon: Icon,
  title,
  value,
}: {
  change?: string;
  changeType?: "negative" | "neutral" | "positive";
  icon: LucideIcon;
  title: string;
  value: string | number;
}) {
  const changeColor =
    changeType === "positive" ? "text-emerald-600" : changeType === "negative" ? "text-red-600" : "text-slate-500";

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-start justify-between pt-6">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          {change ? <p className={`mt-2 text-sm ${changeColor}`}>{change}</p> : null}
        </div>
        <div className="rounded-2xl bg-orange-50 p-3 text-orange-500">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
