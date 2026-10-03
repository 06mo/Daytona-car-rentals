"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  FileCheck2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { vehicles, TURO_HOST_URL } from "@/lib/data/vehicles";
import { money, type Quote, type TripInput } from "@/lib/pilot/model";

type PublicState = {
  demo: boolean;
  open: boolean;
  airportOpen: boolean;
  rates: { vehicleId: string; enabled: boolean; dailyCents: number }[];
  minimumAge: number;
  mileage: string;
};
const customerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(100),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().regex(/^[+\d ()-]{7,30}$/, "Enter a valid phone number."),
  website: z.string().max(0),
});
type Customer = z.infer<typeof customerSchema>;
export function PriceSummary({ quote }: { quote: Quote }) {
  return (
    <dl className="price-summary">
      <div>
        <dt>
          Rental · {quote.days} {quote.days === 1 ? "day" : "days"}
        </dt>
        <dd>{money(quote.rentalCents)}</dd>
      </div>
      <div>
        <dt>Florida rental surcharge</dt>
        <dd>{money(quote.surchargeCents)}</dd>
      </div>
      {quote.deliveryCents > 0 && (
        <div>
          <dt>Airport delivery</dt>
          <dd>{money(quote.deliveryCents)}</dd>
        </div>
      )}
      <div>
        <dt>{quote.demo ? "Estimated tax (example)" : "Tax"}</dt>
        <dd>{money(quote.taxCents)}</dd>
      </div>
      <div className="total">
        <dt>Trip total</dt>
        <dd>{money(quote.totalCents)}</dd>
      </div>
      <div>
        <dt>Security deposit, separate</dt>
        <dd>{money(quote.depositCents)}</dd>
      </div>
      <p>
        No payment is taken with this request. Deposit and payment arrangements
        are reviewed before confirmation.
      </p>
    </dl>
  );
}
export function BookingWizard({ initial }: { initial: Partial<TripInput> }) {
  const [state, setState] = useState<PublicState | null>(null),
    [step, setStep] = useState(1),
    [quote, setQuote] = useState<Quote | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [accepted, setAccepted] = useState(false),
    [result, setResult] = useState<{ id: string; demo: boolean } | null>(null);
  const [trip, setTrip] = useState<TripInput>({
    vehicleId: initial.vehicleId || vehicles[0].id,
    start: initial.start || "",
    end: initial.end || "",
    location: initial.location || "local",
  });
  const key = useRef(""),
    heading = useRef<HTMLHeadingElement>(null);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Customer>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", email: "", phone: "", website: "" },
  });
  useEffect(() => {
    fetch("/api/pilot/quote")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setState(data);
      })
      .catch(() =>
        setError("Unable to load booking options. Please try again."),
      );
  }, []);
  useEffect(() => {
    if (step > 1 || result) heading.current?.focus();
  }, [step, result]);
  const vehicle = vehicles.find((v) => v.id === trip.vehicleId)!;
  const update = (field: keyof TripInput, value: string) => {
    setTrip({ ...trip, [field]: value });
    setQuote(null);
    setAccepted(false);
    setError("");
  };
  async function getQuote() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/pilot/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trip),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setQuote(data);
      key.current = crypto.randomUUID();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to quote this trip.");
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (!quote || !accepted) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/pilot/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...getValues(),
          quoteId: quote.id,
          idempotencyKey: key.current,
          acknowledged: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to submit your request.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <section className="container page-section confirmation">
        <CheckCircle2 size={52} />
        <p className="eyebrow">
          {result.demo ? "PREVIEW COMPLETE" : "REQUEST RECEIVED"}
        </p>
        <h1 ref={heading} tabIndex={-1}>
          {result.demo ? "That’s the flow." : "Your trip is awaiting review."}
        </h1>
        <p>
          {result.demo
            ? "This is a synthetic booking. No personal details were saved, no payment was taken, and no car is reserved for you."
            : "This is not a confirmed rental. Contact our team with your reference to arrange verification and the next steps. No automated email has been sent."}
        </p>
        <div className="reference">
          Reference <strong>{result.id}</strong>
        </div>
        <div className="notice">
          <Clock3 />
          <span>
            Each request has a 24-hour internal review hold, or until pickup if
            sooner. Approval requires driver, insurance, agreement, payment,
            protection, and channel checks.
          </span>
        </div>
        <Button asChild href="/fleet">
          Back to our cars
        </Button>
      </section>
    );
  return (
    <section className="container booking-page">
      {state?.demo && (
        <div className="demo-banner">
          Booking preview · Sample rates and policies. Enter sample contact
          details. No personal details are saved.
        </div>
      )}
      <div className="booking-header">
        <p className="eyebrow">YOUR NEXT GOOD DAY</p>
        <h1 ref={heading} tabIndex={-1}>
          {step === 1
            ? "Choose your escape."
            : step === 2
              ? "Let’s get you ready."
              : "One last look."}
        </h1>
        <ol className="booking-progress" aria-label="Booking progress">
          {["Choose", "Verify", "Review"].map((label, i) => (
            <li
              key={label}
              aria-current={step === i + 1 ? "step" : undefined}
              className={step >= i + 1 ? "active" : ""}
            >
              <span>{step > i + 1 ? <CheckCircle2 size={18} /> : i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </div>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      {!state && !error && <p role="status">Loading booking options…</p>}
      {state && !state.open ? (
        <div className="panel closed-booking">
          <h2>Direct rentals are opening soon.</h2>
          <p>
            We’re finalizing driver and insurance requirements. You can still
            book through Turo or speak with our local team.
          </p>
          <Button asChild href={TURO_HOST_URL} target="_blank" rel="noreferrer">
            Book on Turo
          </Button>
          <Link className="text-link" href="/contact">
            Contact us
          </Link>
        </div>
      ) : (
        state && (
          <div className="booking-grid">
            <div className="panel booking-main">
              {step === 1 && (
                <>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      getQuote();
                    }}
                  >
                    <div className="form-grid">
                      <Input
                        id="pickup-time"
                        label="Pickup date & time"
                        type="datetime-local"
                        required
                        value={trip.start}
                        onChange={(e) => update("start", e.target.value)}
                      />
                      <Input
                        id="return-time"
                        label="Return date & time"
                        type="datetime-local"
                        required
                        value={trip.end}
                        min={trip.start}
                        onChange={(e) => update("end", e.target.value)}
                      />
                      <Select
                        id="location"
                        label="Pickup service"
                        options={[
                          { value: "local", label: "Daytona Beach pickup" },
                          ...(state.airportOpen
                            ? [
                                {
                                  value: "airport",
                                  label: "DAB airport delivery",
                                },
                              ]
                            : []),
                        ]}
                        value={trip.location}
                        onChange={(e) => update("location", e.target.value)}
                      />
                      <Select
                        id="vehicle"
                        label="Your car"
                        options={vehicles.map((v) => ({
                          value: v.id,
                          label: `${v.year} ${v.make} ${v.model} · ${v.color}`,
                        }))}
                        value={trip.vehicleId}
                        onChange={(e) => update("vehicleId", e.target.value)}
                      />
                    </div>
                    <p className="small-note">
                      All times are Daytona Beach time (Eastern). Allow two
                      hours’ notice. Each started rental day is charged.
                    </p>
                    <Button type="submit" loading={busy}>
                      See my trip total
                    </Button>
                  </form>
                  {quote && (
                    <div className="quote-ready">
                      <PriceSummary quote={quote} />
                      <Button
                        type="button"
                        onClick={() => {
                          setError("");
                          setStep(2);
                        }}
                      >
                        Continue to verify
                      </Button>
                    </div>
                  )}
                </>
              )}
              {step === 2 && (
                <form
                  onSubmit={handleSubmit(() => {
                    setError("");
                    setStep(3);
                  })}
                >
                  <p>
                    We’ll contact you to arrange driver and insurance
                    verification. A request is not a confirmed rental.
                  </p>
                  <div className="form-grid">
                    <Input
                      label="Full name"
                      autoComplete="name"
                      id="name"
                      {...register("name")}
                      error={errors.name?.message}
                    />
                    <Input
                      label="Email"
                      autoComplete="email"
                      type="email"
                      id="email"
                      {...register("email")}
                      error={errors.email?.message}
                    />
                    <Input
                      label="Phone"
                      autoComplete="tel"
                      type="tel"
                      id="phone"
                      {...register("phone")}
                      error={errors.phone?.message}
                    />
                  </div>
                  <div className="honeypot" aria-hidden="true">
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      {...register("website")}
                    />
                  </div>
                  <div className="verification-list">
                    {[
                      {
                        icon: UserRound,
                        title: "Driver’s license & driving record",
                        text: `Minimum age ${quote?.minimumAge || "to be confirmed"}. All drivers require review. Driving-record consent will be collected separately.`,
                      },
                      {
                        icon: ShieldCheck,
                        title: "Qualifying renter insurance",
                        text: "We verify your coverage before confirming. An insurance card alone does not establish rental coverage.",
                      },
                      {
                        icon: FileCheck2,
                        title: "Agreement & trip protection",
                        text: "The approved rental agreement and any required protection must be completed before vehicle release.",
                      },
                    ].map(({ icon: Icon, title, text }) => (
                      <div key={title}>
                        <Icon />
                        <span>
                          <strong>{title}</strong>
                          <small>{text}</small>
                        </span>
                        <span className="status-pill">Pending</span>
                      </div>
                    ))}
                  </div>
                  <p className="small-note">
                    Do not email license images or insurance documents. Secure
                    document collection will be arranged by our team.{" "}
                    <Link href="/privacy">Privacy information</Link>
                  </p>
                  <div className="form-actions">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </Button>
                    <Button type="submit">Continue to review</Button>
                  </div>
                </form>
              )}
              {step === 3 && quote && (
                <>
                  <div className="review-trip">
                    <h2>
                      {vehicle.make} {vehicle.model}
                    </h2>
                    <p>
                      {quote.start.replace("T", " at ")} —{" "}
                      {quote.end.replace("T", " at ")} ET
                    </p>
                    <p>
                      {quote.location === "airport"
                        ? "DAB airport delivery by arrangement"
                        : "Daytona Beach appointment pickup"}
                    </p>
                    <p>{quote.mileage}</p>
                    <p>
                      {getValues("name")} · {getValues("email")}
                    </p>
                  </div>
                  <PriceSummary quote={quote} />
                  <div className="notice">
                    <Clock3 />
                    <span>
                      Manual approval required. The team checks driver
                      eligibility, insurance and the shared Turo calendar before
                      confirming. No payment is taken now.
                    </span>
                  </div>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                    />
                    <span>
                      I understand this is a booking request, subject to
                      approval. I have read the{" "}
                      <Link href="/terms" target="_blank">
                        rental requirements
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" target="_blank">
                        privacy information
                      </Link>
                      . This does not sign a rental agreement or authorize a
                      driving-record search.
                    </span>
                  </label>
                  <div className="form-actions">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      disabled={!accepted}
                      loading={busy}
                      onClick={submit}
                    >
                      {state.demo
                        ? "Try booking request"
                        : "Submit booking request"}
                    </Button>
                  </div>
                  <p className="small-note">
                    Quote expires after 15 minutes. Availability is checked
                    again when you submit.
                  </p>
                </>
              )}
            </div>
            <aside className="booking-aside">
              <div className="aside-image">
                <Image
                  src={vehicle.image}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  fill
                  sizes="(max-width: 900px) 100vw, 400px"
                />
              </div>
              <p className="eyebrow">YOUR CAR</p>
              <h2>
                {vehicle.make} {vehicle.model}
              </h2>
              <p>
                {vehicle.year} · {vehicle.color} · {vehicle.seats} seats
              </p>
              {quote ? (
                <>
                  <strong className="aside-total">
                    {money(quote.totalCents)}
                  </strong>
                  <span>trip total · {quote.days} rental days</span>
                </>
              ) : (
                <p>Pick dates to see a total.</p>
              )}
              <div className="aside-help">
                <p>Need a hand?</p>
                <a href="tel:+13868984035">(386) 898-4035</a>
              </div>
              <a
                className="text-link"
                href={vehicle.turoUrl}
                target="_blank"
                rel="noreferrer"
              >
                Or book this car on Turo
              </a>
            </aside>
          </div>
        )
      )}
    </section>
  );
}
