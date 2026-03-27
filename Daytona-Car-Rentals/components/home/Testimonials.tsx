import { Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";

const testimonials = [
  {
    name: "Sarah M.",
    rating: 5,
    text: "Pickup was fast, the car was spotless, and the whole process felt way easier than the big chains.",
    vehicle: "Toyota Camry",
  },
  {
    name: "James T.",
    rating: 5,
    text: "Perfect for race weekend. Great communication, no hidden surprises, and plenty of room for our group.",
    vehicle: "Ford Explorer",
  },
  {
    name: "Lisa K.",
    rating: 5,
    text: "Loved having a local team that actually knew the area. I’d absolutely book with Daytona again.",
    vehicle: "Chevy Suburban",
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-500">Testimonials</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Drivers who would book again</h2>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.name} className="border-slate-200 bg-white shadow-sm">
            <CardContent className="pt-6">
              <div className="flex gap-1 text-yellow-400">
                {Array.from({ length: testimonial.rating }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">“{testimonial.text}”</p>
              <div className="mt-6">
                <p className="font-semibold text-slate-900">{testimonial.name}</p>
                <p className="text-sm text-slate-500">{testimonial.vehicle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
