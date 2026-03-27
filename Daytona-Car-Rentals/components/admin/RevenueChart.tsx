"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function RevenueChart({ data }: { data: Array<{ date: string; revenue: number }> }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-lg font-semibold text-slate-900">Revenue Over The Last 30 Days</p>
      <div className="mt-6 h-64 min-h-64">
        <ResponsiveContainer width="100%" height={256} minWidth={320}>
          <BarChart data={data}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="revenue" fill="#f97316" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
