import { FleetBrowser } from "@/components/fleet/FleetBrowser";
export const metadata = { title: "Our cars · Daytona Car Rentals", description: "Browse direct-request cars and Turo rentals for everyday, weekly and monthly transportation in Daytona Beach." };
export default async function FleetPage({ searchParams }: { searchParams: Promise<{ category?: string; channel?: string }> }) {
  const params = await searchParams;
  return <section className="container page-section">
  <p className="eyebrow">OUR LOCAL FLEET</p><h1>A car for your kind of day.</h1>
  <p className="page-intro">Request a car directly with us, or book selected vehicles on Turo. Choose your car now; dates can wait.</p>
  <FleetBrowser initialCategory={params.category} initialChannel={params.channel} />
  <p className="small-note">Direct eligibility does not confirm availability. Operator approval is required, and any alternative needs your explicit acceptance.</p>
</section>; }
