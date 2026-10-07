"use client";
import { createContext, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { emptyJourney, readJourney, journeyHref, validateJourneyDates, type Journey } from "@/lib/data/journey";
const Context = createContext({
  journey: emptyJourney,
  update: (_: Partial<Journey>) => {},
  error: "",
  setError: (_: string) => {},
  validate: (_: Partial<Journey> = {}): boolean => true,
});
export function JourneyProvider({ children }: { children: ReactNode }) {
  const [journey, setJourney] = useState(emptyJourney);
  const [error, setError] = useState("");
  const path = usePathname();
  useEffect(() => {
    // Route links may intentionally omit state; history entries restore a full snapshot.
    setJourney(previous => ({ ...previous, ...readJourney(new URLSearchParams(window.location.search)) }));
    const restore = () => {
      setJourney({ ...emptyJourney, ...readJourney(new URLSearchParams(window.location.search)) });
      setError("");
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [path]);
  function update(changes: Partial<Journey>) {
    const next = { ...journey, ...changes };
    setJourney(next);
    setError("");
    window.history.replaceState(null, "", journeyHref(window.location.href, next));
  }
  function validate(changes: Partial<Journey> = {}) {
    const next = { ...journey, ...changes };
    const incomplete = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]')).some(input => input.validity.badInput);
    const message = incomplete ? "Complete valid pickup and return dates, or clear both to browse without dates." : validateJourneyDates(next.start, next.end);
    setError(message);
    return !message;
  }
  return <Context.Provider value={{ journey, update, error, setError, validate }}>{children}</Context.Provider>;
}
export const useJourney = () => useContext(Context);
export function JourneyNotice() {
  const { error } = useJourney();
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) notice.current?.focus(); }, [error]);
  return error ? <div ref={notice} tabIndex={-1} role="alert" className="container error-message journey-error">{error}</div> : null;
}
export function JourneyLink({ href, changes, onClick, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string; changes?: Partial<Journey> }) {
  const { journey, validate } = useJourney();
  return <Link {...props} href={journeyHref(href, journey, changes)} onClick={event => {
    const carriesTrip = /^\/(fleet|assistant|booking)(\/|\?|$)/.test(href);
    if (carriesTrip && !validate(changes)) { event.preventDefault(); return; }
    onClick?.(event);
  }} />;
}
