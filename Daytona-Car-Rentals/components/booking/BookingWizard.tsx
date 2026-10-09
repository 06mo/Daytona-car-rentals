"use client";
import { DraftEditor, type DraftView } from "@/components/customer/DraftEditor";
import { IntakeSummary } from "@/components/customer/IntakeFields";
import { SignIn } from "@/components/customer/SignIn";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { vehicles, TURO_HOST_URL } from "@/lib/data/vehicles";
import { money, type Quote, type TripInput } from "@/lib/pilot/model";

import { directVehicles } from "@/lib/data/rentalChannels";
import {
  monthlyTerms,
  readJourney,
  type RentalPeriod,
} from "@/lib/data/journey";
import { JourneyLink, useJourney } from "@/components/journey/JourneyProvider";

type PublicState = {
  demo: boolean;
  open: boolean;
  airportOpen: boolean;
  rates: { vehicleId: string; enabled: boolean; dailyCents: number }[];
  minimumAge: number;
  mileage: string;
};
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
          <dt>
            {quote.location === "airport"
              ? "Airport delivery"
              : "Local pickup service"}
          </dt>
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
      {quote.policy?.mileagePerDay != null && (
        <div>
          <dt>Included miles per day</dt>
          <dd>{quote.policy.mileagePerDay}</dd>
        </div>
      )}
      {quote.policy?.excessMileCents != null && (
        <div>
          <dt>Excess mileage per mile</dt>
          <dd>{money(quote.policy.excessMileCents)}</dd>
        </div>
      )}
      {quote.policy?.operationalTerms && <p>{quote.policy.operationalTerms}</p>}
      <p>
        No payment is taken with this request. Deposit and payment arrangements
        are reviewed before confirmation.
      </p>
    </dl>
  );
}
export function BookingWizard({
  initial,
  initialPeriod,
}: {
  initial: Partial<TripInput>;
  initialPeriod: RentalPeriod;
}) {
  const { update: updateJourney } = useJourney();
  const [customerIdentity, setCustomerIdentity] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [editorStarted, setEditorStarted] = useState(false);
  const [draftKey, setDraftKey] = useState("");
  const [draft, setDraft] = useState<DraftView | null>(null);
  const [period, setPeriod] = useState(initialPeriod);
  const [state, setState] = useState<PublicState | null>(null),
    [step, setStep] = useState(1),
    [quote, setQuote] = useState<Quote | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [accepted, setAccepted] = useState(false),
    [result, setResult] = useState<{ id: string; demo: boolean } | null>(null);
  const [trip, setTrip] = useState<TripInput>({
    vehicleId: initial.vehicleId || directVehicles[0].id,
    start: initial.start || "",
    end: initial.end || "",
    location: initial.location || "local",
    period: initialPeriod,
  });
  useEffect(() => {
    if (step === 2) setEditorStarted(true);
  }, [step]);
  const quoteVersion = useRef(0);
  const previousStep = useRef(1);
  const key = useRef(""),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // Native history edits can leave Next's cached server props behind the URL.
    const restore = () => {
      const saved = readJourney(new URLSearchParams(window.location.search));
      setDraftKey(
        new URLSearchParams(window.location.search).get("draft") || "",
      );
      setDraft(null);
      const vehicleId = directVehicles.some((v) => v.id === saved.vehicle)
        ? saved.vehicle!
        : directVehicles[0].id;
      setTrip({
        vehicleId,
        period: saved.period || "",
        start: saved.start || "",
        end: saved.end || "",
        location: saved.location === "airport" ? "airport" : "local",
      });
      setPeriod(saved.period || "");
      quoteVersion.current++;
      setQuote(null);
      setAccepted(false);
      setBusy(false);
      setError("");
      setStep(
        new URLSearchParams(window.location.search).get("step") === "2" ? 2 : 1,
      );
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      quoteVersion.current++;
    };
  }, []);
  useEffect(() => {
    fetch("/api/customer/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d.customer) {
          setCustomerIdentity(d.customer);
        }
      })
      .catch(() => {});
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
    if (step !== previousStep.current || result) {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: "start" });
    }
    previousStep.current = step;
  }, [step, result]);
  useEffect(() => {
    let active = true;
    const verify = async () => {
      try {
        const r = await fetch("/api/customer/auth", { cache: "no-store" });
        const d = await r.json();
        if (active && d.customer?.id !== customerIdentity?.id) {
          setDraft(null);
          setAccepted(false);
          setCustomerIdentity(d.customer || null);
        }
      } catch {
        if (active) {
          setDraft(null);
          setCustomerIdentity(null);
        }
      }
    };
    window.addEventListener("focus", verify);
    return () => {
      active = false;
      window.removeEventListener("focus", verify);
    };
  }, [customerIdentity?.id]);
  const vehicle = vehicles.find((v) => v.id === trip.vehicleId)!;
  const update = (field: keyof TripInput, value: string) => {
    quoteVersion.current++;
    setBusy(false);
    setTrip({ ...trip, [field]: value });
    updateJourney({ [field === "vehicleId" ? "vehicle" : field]: value });
    setQuote(null);
    setAccepted(false);
    setError("");
  };
  async function getQuote() {
    const version = ++quoteVersion.current;
    setQuote(null);
    setAccepted(false);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/pilot/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trip),
      });
      const data = await response.json();
      if (version !== quoteVersion.current) return;
      if (!response.ok) throw new Error(data.error);
      setQuote(data);
      key.current = crypto.randomUUID();
    } catch (e) {
      if (version === quoteVersion.current)
        setError(e instanceof Error ? e.message : "Unable to quote this trip.");
    } finally {
      if (version === quoteVersion.current) setBusy(false);
    }
  }
  async function submit() {
    if (!quote || !accepted || !customerIdentity || !draft) return;
    if (
      quote.vehicleId !== trip.vehicleId ||
      quote.start !== trip.start ||
      quote.end !== trip.end ||
      quote.location !== trip.location ||
      (quote.period || "") !== period
    ) {
      setQuote(null);
      setAccepted(false);
      setStep(1);
      setError("Your trip changed. Calculate a new quote before continuing.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/pilot/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id,
          draftRevision: draft.revision,
          website: "",
          quoteId: quote.id,
          idempotencyKey: key.current,
          acknowledged: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          setCustomerIdentity(null);
          setStep(2);
        }
        if (response.status === 409) {
          setQuote(null);
          setAccepted(false);
          setStep(1);
        }
        throw new Error(data.error);
      }
      try {
        sessionStorage.removeItem("dcr-contact-draft");
      } catch {}
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
          {result.demo
            ? "Preview request complete."
            : "Your trip is awaiting review."}
        </h1>
        <p>
          {result.demo
            ? "This is a preview request. Only synthetic renter records belong in this preview. No payment was taken and no car is reserved for you."
            : "This is not a confirmed rental. Contact our team with your reference to arrange verification and the next steps. Your renter information and documents have been submitted for review. Use My trips for status and corrections. Acknowledgment delivery is queued separately; it does not confirm your rental."}
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
        <Button asChild href="/my-trip">
          View My trips
        </Button>
      </section>
    );
  return (
    <section className="container booking-page">
      {state?.demo && (
        <div className="demo-banner">
          Booking preview · Sample rates and policies. Use only synthetic renter
          information and sample documents. Email sign-in is limited to approved
          test recipients.
        </div>
      )}
      <div className="booking-header">
        <p className="eyebrow">YOUR DIRECT REQUEST</p>
        <h1 ref={heading} tabIndex={-1}>
          {step === 1
            ? "Plan your rental."
            : step === 2
              ? "Let’s get you ready."
              : "One last look."}
        </h1>
        <ol className="booking-progress" aria-label="Booking progress">
          {["Choose", "Driver & documents", "Review"].map((label, i) => (
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
      <p className="small-note booking-intro">
        Your draft is unsent. Direct requests require approval.
      </p>
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
              <p className="selected-car">
                Selected car:{" "}
                <strong>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </strong>{" "}
                · {vehicle.color}
              </p>
              {step === 1 && (
                <>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      getQuote();
                    }}
                  >
                    <details className="change-car">
                      <summary>Change car</summary>
                      <Select
                        id="vehicle"
                        label="Your car"
                        options={directVehicles.map((v) => ({
                          value: v.id,
                          label: `${v.year} ${v.make} ${v.model} · ${v.color}`,
                        }))}
                        value={trip.vehicleId}
                        onChange={(e) => update("vehicleId", e.target.value)}
                      />
                      <JourneyLink
                        className="text-link"
                        href="/assistant"
                        changes={{
                          vehicle: trip.vehicleId,
                          period,
                          start: trip.start,
                          end: trip.end,
                          location: trip.location,
                        }}
                      >
                        Help me choose
                      </JourneyLink>{" "}
                      ·{" "}
                      <JourneyLink
                        className="text-link"
                        href="/fleet"
                        changes={{
                          vehicle: trip.vehicleId,
                          period,
                          start: trip.start,
                          end: trip.end,
                          location: trip.location,
                        }}
                      >
                        Browse cars
                      </JourneyLink>
                    </details>
                    <Select
                      id="booking-period"
                      label="Rental period"
                      value={period}
                      options={[
                        { value: "", label: "Not sure yet" },
                        { value: "short", label: "A few days" },
                        { value: "weekly", label: "Weekly" },
                        { value: "monthly", label: "Monthly" },
                      ]}
                      onChange={(e) => {
                        setPeriod(e.target.value as RentalPeriod);
                        update("period", e.target.value);
                      }}
                    />
                    {period === "monthly" && (
                      <p className="small-note renewal-note">{monthlyTerms}</p>
                    )}
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
                    </div>
                    <p className="small-note">
                      All times are Daytona Beach time (Eastern). Allow two
                      hours’ notice. Each started rental day is charged.
                    </p>
                    {!state.rates.some(
                      (rate) =>
                        rate.vehicleId === trip.vehicleId &&
                        rate.enabled &&
                        rate.dailyCents > 0,
                    ) && (
                      <p role="status">
                        Direct requests for this car are unavailable pending
                        operator configuration. Contact us or choose another
                        car.
                      </p>
                    )}
                    <Button
                      type="submit"
                      loading={busy}
                      disabled={
                        !state.rates.some(
                          (rate) =>
                            rate.vehicleId === trip.vehicleId &&
                            rate.enabled &&
                            rate.dailyCents > 0,
                        )
                      }
                    >
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
                          const url = new URL(window.location.href);
                          url.searchParams.set("step", "2");
                          window.history.replaceState(null, "", url);
                          setStep(2);
                        }}
                      >
                        Continue to driver & documents
                      </Button>
                    </div>
                  )}
                </>
              )}
              {step === 2 && !customerIdentity && (
                <SignIn
                  next={
                    typeof window !== "undefined"
                      ? window.location.pathname + window.location.search
                      : undefined
                  }
                />
              )}
              {customerIdentity && (editorStarted || step === 2) && (
                <DraftEditor
                  key={customerIdentity.id + ":" + draftKey}
                  user={customerIdentity}
                  trip={trip}
                  active={step === 2}
                  demo={state.demo}
                  onSaved={setDraft}
                  onAuthLost={() => {
                    setCustomerIdentity(null);
                    setDraft(null);
                    setStep(2);
                  }}
                  onReady={() => {
                    setAccepted(false);
                    setStep(3);
                  }}
                />
              )}
              {step === 2 && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
              )}
              {step === 3 && !quote && (
                <div>
                  <p>
                    Your documents are saved. Calculate a fresh quote before
                    reviewing and accepting the total.
                  </p>
                  <Button onClick={() => setStep(1)}>
                    Return to Choose for a fresh total
                  </Button>
                </div>
              )}
              {step === 3 && quote && (
                <>
                  <div className="review-trip">
                    <p>
                      Rental period: {quote.period || "Dates selected below"}
                    </p>

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
                      {draft?.data.contact.name} · {customerIdentity?.email} ·{" "}
                      {draft?.data.contact.phone}
                    </p>
                  </div>
                  {draft && (
                    <>
                      <h3>Renter information</h3>
                      <IntakeSummary value={draft.data.intake} />
                      <p>
                        {draft.data.intake.confirmed
                          ? "You confirmed these fields; owner review is pending."
                          : "Confirm your renter information before submitting."}
                      </p>
                      <h3>Documents</h3>
                      {(
                        quote.policy?.requiredDocuments || [
                          "license",
                          "insurance",
                        ]
                      ).map((kind) => (
                        <p key={kind}>
                          {kind}:{" "}
                          {draft.documents.find((d) => d.kind === kind)
                            ? "Uploaded — awaiting owner review"
                            : "Required — not uploaded"}
                        </p>
                      ))}
                    </>
                  )}
                  <PriceSummary quote={quote} />
                  <div className="notice">
                    <Clock3 />
                    <span>
                      Manual approval required. The team checks driver
                      eligibility, insurance and the shared Turo calendar before
                      confirming. No payment is taken now. Any alternative
                      vehicle requires your explicit acceptance.
                    </span>
                  </div>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                    />
                    <span>
                      I accept the displayed trip total and understand this is a
                      booking request, subject to approval. I have read the{" "}
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
                      disabled={
                        !accepted || !customerIdentity || !draft || busy
                      }
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
              {quote ? (
                <>
                  <strong className="aside-total">
                    {money(quote.totalCents)}
                  </strong>
                  <span>trip total · {quote.days} rental days</span>
                </>
              ) : (
                <p>
                  {busy
                    ? "Calculating your quote…"
                    : trip.start && trip.end
                      ? "Select ‘See my trip total’ to calculate your quote."
                      : "Choose pickup and return dates to calculate a quote."}
                </p>
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
