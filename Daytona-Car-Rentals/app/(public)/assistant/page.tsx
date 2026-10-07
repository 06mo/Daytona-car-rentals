import { CarFinder } from "@/components/home/CarFinder";
export const metadata = { title: "Help me choose · Daytona Car Rentals" };
export default function AssistantPage() { return <section className="container page-section">
  <p className="eyebrow">GUIDED VEHICLE SELECTION</p><h1>What do you need a car for?</h1>
  <p className="page-intro">Compare the fit for your plans, then choose dates. These suggestions do not check availability.</p>
  <CarFinder />
</section>; }
