export function AnalyticsOverview({
  bookingConversionRate,
  topPages,
}: {
  bookingConversionRate: number;
  topPages: Array<{ path: string; views: number }>;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Analytics Snapshot</h2>
          <p className="mt-2 text-sm text-slate-500">Recent page traffic and booking funnel health.</p>
        </div>
        <p className="text-sm font-semibold text-orange-600">Conversion: {bookingConversionRate}%</p>
      </div>

      <div className="mt-6 grid gap-3">
        {topPages.length === 0 ? (
          <p className="text-sm text-slate-500">No analytics events recorded yet.</p>
        ) : (
          topPages.map((page) => (
            <div key={page.path} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <span className="truncate pr-4 text-sm font-medium text-slate-700">{page.path}</span>
              <span className="text-sm text-slate-500">{page.views} views</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
