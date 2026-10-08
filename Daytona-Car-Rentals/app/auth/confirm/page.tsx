"use client";
import { useEffect, useState, useRef } from "react";
import { SignIn } from "@/components/customer/SignIn";
export default function Confirm() {
  const loaded = useRef(false);
  const [token, setToken] = useState(""),
    [intent, setIntent] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const p = new URLSearchParams(location.search);
    setToken(p.get("token_hash") || "");
    setIntent(p.get("intent") || "");
    history.replaceState(null, "", "/auth/confirm");
  }, []);
  return (
    <section className="container page-section">
      <h1>Finish signing in</h1>
      <p>Continue on this device. Your rental still requires owner approval.</p>
      {token ? (
        <button
          className="journey-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await fetch("/api/customer/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "confirm",
                  token,
                  ...(intent ? { intent } : {}),
                }),
              });
              const d = await r.json();
              if (!r.ok) throw Error(d.error);
              location.replace(d.next);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Unable to sign in.");
              setToken("");
            } finally {
              setBusy(false);
            }
          }}
        >
          Continue securely
        </button>
      ) : (
        <SignIn />
      )}
      <p role="alert">{error}</p>
    </section>
  );
}
