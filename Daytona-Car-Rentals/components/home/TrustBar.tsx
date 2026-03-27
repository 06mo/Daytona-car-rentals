import { CarFront, MapPin, ShieldCheck, Star } from "lucide-react";

const items = [
  { icon: CarFront, value: "50+", label: "Vehicles" },
  { icon: ShieldCheck, value: "100%", label: "Fully Insured" },
  { icon: Star, value: "4.9/5", label: "Rating" },
  { icon: MapPin, value: "Local", label: "Daytona-Based" },
];

export function TrustBar() {
  return (
    <section className="border-y border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-6xl gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
            <div className="rounded-full bg-orange-50 p-2 text-orange-500">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-bold text-orange-500">{value}</p>
              <p className="text-sm text-slate-600">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
