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

import { sameTrip, tripKey, quoteChanges } from "@/lib/pilot/quote-state";

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
function revealWizardFocus(target: HTMLElement) {
  if (document.activeElement !== target) return;
  const offset =
    (document.querySelector(".site-nav")?.getBoundingClientRect().height || 0) +
    16;
  const box = target.getBoundingClientRect();
  if (box.top < offset || box.bottom > window.innerHeight)
    window.scrollBy({ top: box.top - offset, behavior: "instant" });
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
    if (step >= 2) setEditorStarted(true);
  }, [step]);
  const quoteVersion = useRef(0);
  const tripRef = useRef(trip),
    quoteRef = useRef(quote);
  const activeDraftId = useRef("");
  if (draft) activeDraftId.current = draft.id;
  const quoteHeading = useRef<HTMLHeadingElement>(null);
  const focusQuoteResult = useRef(false);
  tripRef.current = trip;
  quoteRef.current = quote;
  const lastQuote = useRef<Quote | null>(null);
  const [changes, setChanges] = useState<string[]>([]);
  const [quoteNotice, setQuoteNotice] = useState("");
  const submitting = useRef(false);
  const wizard = useRef<HTMLElement>(null);
  const quoteCache = "dcr-quote-reference";
  function moveStep(next: number) {
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(next));
    window.history.replaceState(null, "", url);
    setStep(next);
  }
  function invalidateQuote(message: string) {
    quoteVersion.current++;
    focusQuoteResult.current = false;
    quoteRef.current = null;
    setQuote(null);
    setAccepted(false);
    setBusy(submitting.current);
    setQuoteNotice(message);
  }
  function restoreReference(next: TripInput) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(quoteCache) || "null");
      if (saved?.trip === tripKey(next) && typeof saved.id === "string")
        void getQuote(next, saved.id);
    } catch {
      /* Storage is optional; in-place refresh remains available. */
    }
  }
  const previousStep = useRef(1);
  const key = useRef(""),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // Native history edits can leave Next's cached server props behind the URL.
    const restore = () => {
      const saved = readJourney(new URLSearchParams(window.location.search));
      const id = new URLSearchParams(window.location.search).get("draft") || "";
      if (id !== activeDraftId.current) {
        activeDraftId.current = id;
        setDraftKey(id);
        setDraft(null);
      }
      const vehicleId = directVehicles.some((v) => v.id === saved.vehicle)
        ? saved.vehicle!
        : directVehicles[0].id;
      const next: TripInput = {
        vehicleId,
        period: saved.period || "",
        start: saved.start || "",
        end: saved.end || "",
        location: saved.location === "airport" ? "airport" : "local",
      };
      tripRef.current = next;
      setTrip(next);
      setPeriod(saved.period || "");
      setAccepted(false);
      setError("");
      if (
        !quoteRef.current ||
        !sameTrip(quoteRef.current, next) ||
        quoteRef.current.expiresAt <= Date.now()
      ) {
        invalidateQuote(
          "Refresh the quote to review the current total. Your saved information stays here.",
        );
        restoreReference(next);
      }
      const requested = new URLSearchParams(window.location.search).get("step");
      setStep(requested === "3" ? 3 : requested === "2" ? 2 : 1);
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
      if (heading.current)
        window.scrollTo({
          top:
            heading.current.getBoundingClientRect().top +
            window.scrollY -
            (document.querySelector(".site-nav")?.getBoundingClientRect()
              .height || 0) -
            16,
          behavior: "instant",
        });
    }
    previousStep.current = step;
  }, [step, result]);
  useEffect(() => {
    const nav = document.querySelector(".site-nav");
    const measure = () => {
      wizard.current?.style.setProperty(
        "--wizard-offset",
        `${(nav?.getBoundingClientRect().height || 0) + 16}px`,
      );
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && wizard.current?.contains(focused))
        requestAnimationFrame(() => revealWizardFocus(focused));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (nav) observer.observe(nav);
    if (wizard.current) observer.observe(wizard.current);
    return () => observer.disconnect();
  }, [result]);
  useEffect(() => {
    if (step === 3 && !busy && focusQuoteResult.current) {
      focusQuoteResult.current = false;
      quoteHeading.current?.focus({ preventScroll: true });
      if (quoteHeading.current) revealWizardFocus(quoteHeading.current);
    }
  }, [step, busy, quote, error]);
  useEffect(() => {
    if (!quote) return;
    const expire = () => {
      if (quoteRef.current?.id === quote.id && quote.expiresAt <= Date.now())
        invalidateQuote(
          "Your quote expired. Refresh it before accepting the total. Your information and documents are saved.",
        );
    };
    const timer = window.setTimeout(
      expire,
      Math.max(0, quote.expiresAt - Date.now()),
    );
    window.addEventListener("focus", expire);
    document.addEventListener("visibilitychange", expire);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", expire);
      document.removeEventListener("visibilitychange", expire);
    };
  }, [quote]);
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
    if (tripRef.current[field] === value) return;
    invalidateQuote(
      "Your trip changed. Refresh the quote to review the current total.",
    );
    const next = { ...tripRef.current, [field]: value };
    tripRef.current = next;
    setTrip(next);
    updateJourney({ [field === "vehicleId" ? "vehicle" : field]: value });
    setError("");
  };
  async function getQuote(
    input: TripInput = tripRef.current,
    resumeQuoteId?: string,
  ) {
    if (submitting.current) return;
    focusQuoteResult.current = step === 3 && !resumeQuoteId;
    const version = ++quoteVersion.current;
    quoteRef.current = null;
    setQuote(null);
    setAccepted(false);
    setBusy(true);
    setError("");
    setQuoteNotice(
      resumeQuoteId ? "Checking your saved quote…" : "Refreshing your quote…",
    );
    try {
      const response = await fetch("/api/pilot/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          resumeQuoteId ? { resumeQuoteId, trip: input } : input,
        ),
      });
      const data = await response.json();
      if (version !== quoteVersion.current || !sameTrip(input, tripRef.current))
        return;
      if (!response.ok)
        throw new Error(
          data.error || "Unable to refresh the quote. Please retry.",
        );
      const next: Quote = resumeQuoteId ? data.quote : data;
      if (!next || !sameTrip(next, input))
        throw new Error("The quote does not match this trip. Please retry.");
      const differences = quoteChanges(lastQuote.current, next);
      lastQuote.current = next;
      if ((resumeQuoteId && !data.valid) || next.expiresAt <= Date.now())
        throw new Error(
          data.reason ||
            "Your quote expired. Refresh it to check the current total.",
        );
      setChanges(differences);
      quoteRef.current = next;
      setQuote(next);
      setQuoteNotice(
        resumeQuoteId
          ? "Saved quote checked. Review and accept the total before submitting."
          : differences.length
            ? "Your quote changed. Review the changes and accept the new total."
            : "Quote ready. Review and accept the total before submitting.",
      );
      key.current = crypto.randomUUID();
      try {
        sessionStorage.setItem(
          quoteCache,
          JSON.stringify({ id: next.id, trip: tripKey(input) }),
        );
      } catch {}
    } catch (e) {
      if (version === quoteVersion.current) {
        setQuoteNotice(
          "No current quote. Your information and documents are saved.",
        );
        setError(
          e instanceof Error
            ? e.message
            : "Unable to refresh the quote. Please retry.",
        );
      }
    } finally {
      if (version === quoteVersion.current) setBusy(false);
    }
  }
  async function submit() {
    if (
      submitting.current ||
      busy ||
      !quote ||
      !accepted ||
      !customerIdentity ||
      !draft
    )
      return;
    if (quote.expiresAt <= Date.now()) {
      invalidateQuote(
        "Your quote expired. Refresh it and accept the current total.",
      );
      return;
    }
    if (!sameTrip(quote, trip) || !sameTrip(draft.data.trip, trip)) {
      invalidateQuote(
        "Your trip changed. Save the current details and refresh your quote.",
      );
      return;
    }
    submitting.current = true;
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
          moveStep(2);
        }
        if (response.status === 409) {
          invalidateQuote(
            "Review your trip and refresh the quote before trying again.",
          );
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
      submitting.current = false;
      setBusy(false);
    }
  }
  if (result)
    return (
      <section
        ref={wizard}
        className="container page-section confirmation booking-confirmation"
      >
        <CheckCircle2 size={52} />
        <p className="eyebrow">
          {result.demo ? "PREVIEW COMPLETE" : "REQUEST RECEIVED"}
        </p>
        <h1 ref={heading} tabIndex={-1}>
          Request submitted — awaiting approval
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
    <section
      ref={wizard}
      className="container booking-page"
      onFocusCapture={(event) => {
        const target = event.target as HTMLElement;
        requestAnimationFrame(() => revealWizardFocus(target));
      }}
    >
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
          {["Choose", "Driver & docs", "Review"].map((label, i) => (
            <li
              key={label}
              aria-current={step === i + 1 ? "step" : undefined}
              className={step >= i + 1 ? "active" : ""}
            >
              <span>{step > i + 1 ? <CheckCircle2 size={18} /> : i + 1}</span>
              <span className="step-label">{label}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="small-note booking-intro">
        Your draft is unsent. Direct requests require approval.
      </p>
      {error && step !== 3 && (
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
                        className="rental-date-control"
                        required
                        value={trip.start}
                        onChange={(e) => update("start", e.target.value)}
                      />
                      <Input
                        id="return-time"
                        label="Return date & time"
                        type="datetime-local"
                        className="rental-date-control"
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
                        busy ||
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
                          moveStep(2);
                        }}
                      >
                        Driver & documents
                      </Button>
                    </div>
                  )}
                </>
              )}
              {step >= 2 && !customerIdentity && (
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
                  requiredDocuments={
                    quote
                      ? quote.policy?.requiredDocuments || [
                          "license",
                          "insurance",
                        ]
                      : undefined
                  }
                  user={customerIdentity}
                  trip={trip}
                  active={step === 2}
                  demo={state.demo}
                  onSaved={setDraft}
                  onAuthLost={() => {
                    setCustomerIdentity(null);
                    setDraft(null);
                    moveStep(2);
                  }}
                  onBack={() => moveStep(1)}
                  onReady={() => {
                    setAccepted(false);
                    moveStep(3);
                  }}
                />
              )}
              {step === 2 && !customerIdentity && (
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => moveStep(1)}
                >
                  Back
                </Button>
              )}
              {step === 3 && customerIdentity && (
                <div className="request-review">
                  <div className="review-trip">
                    <h2>Trip details</h2>
                    <p>Rental period: {period || "Dates selected below"}</p>
                    <p>
                      {trip.start.replace("T", " at ")} —{" "}
                      {trip.end.replace("T", " at ")} ET
                    </p>
                    <p>
                      {trip.location === "airport"
                        ? "DAB airport delivery by arrangement"
                        : "Daytona Beach appointment pickup"}
                    </p>
                    {period === "monthly" && (
                      <p className="small-note">{monthlyTerms}</p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => moveStep(1)}
                    >
                      Edit trip
                    </Button>
                  </div>
                  <section
                    className="review-quote"
                    aria-label="Current quote"
                    aria-busy={busy && !submitting.current}
                  >
                    <h2 ref={quoteHeading} tabIndex={-1}>
                      Trip total
                    </h2>
                    <p role="status">
                      {quoteNotice ||
                        "Refresh your quote to review the current total. Your information and documents are saved."}
                    </p>
                    {error && (
                      <p role="alert" className="error-message">
                        {error}
                      </p>
                    )}
                    {quote && (
                      <>
                        {changes.length > 0 && (
                          <ul
                            className="quote-changes"
                            aria-label="Quote changes"
                          >
                            {changes.map((change) => (
                              <li key={change}>{change}</li>
                            ))}
                          </ul>
                        )}
                        <PriceSummary quote={quote} />
                      </>
                    )}
                    <Button
                      type="button"
                      variant={quote ? "outline" : "primary"}
                      disabled={
                        busy || !draft || !sameTrip(draft.data.trip, trip)
                      }
                      loading={busy && !submitting.current}
                      onClick={() => void getQuote(draft!.data.trip)}
                    >
                      {busy && !submitting.current
                        ? "Checking quote…"
                        : "Refresh quote"}
                    </Button>
                    {!quote && !busy && (
                      <p className="small-note">
                        If this car or these dates are unavailable, edit your
                        trip. Your saved documents stay with your draft.
                      </p>
                    )}
                  </section>
                  <details className="review-driver" open>
                    <summary>Driver & documents</summary>
                    <p>
                      {draft?.data.contact.name} · {customerIdentity?.email} ·{" "}
                      {draft?.data.contact.phone}
                    </p>
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
                          quote?.policy?.requiredDocuments ||
                          lastQuote.current?.policy?.requiredDocuments || [
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
                  </details>
                  <div className="notice">
                    <Clock3 />
                    <span>
                      This is a request, not a confirmed rental. Owner approval
                      is required. No payment is taken now. You must explicitly
                      accept any alternative vehicle.
                    </span>
                  </div>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={accepted}
                      disabled={
                        !quote ||
                        busy ||
                        !draft ||
                        !sameTrip(draft.data.trip, trip)
                      }
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
                      disabled={busy}
                      onClick={() => moveStep(2)}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      disabled={
                        !quote ||
                        !accepted ||
                        !customerIdentity ||
                        !draft ||
                        !sameTrip(draft.data.trip, trip) ||
                        busy
                      }
                      loading={busy && submitting.current}
                      onClick={submit}
                    >
                      Submit request
                    </Button>
                  </div>
                  <p className="small-note">
                    Quote expires after 15 minutes. Availability is checked
                    again when you submit.
                  </p>
                </div>
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
                      ? step === 3
                        ? "Refresh your quote to review the current total."
                        : "Select ‘See my trip total’ to calculate your quote."
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
