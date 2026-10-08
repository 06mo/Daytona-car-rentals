"use client";
import { useState } from "react";
export function SignIn({ next }: { next?: string }) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const f = new FormData(e.currentTarget);
        try {
          const r = await fetch("/api/customer/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: f.get("email"),
              next: next || window.location.pathname + window.location.search,
            }),
          });
          const d = await r.json();
          setMessage(d.message || d.error);
        } catch {
          setMessage("Unable to connect. Try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Sign in to My trips</h2>
      <p>
        We’ll email a one-time link. Verifying your email does not verify your
        license or approve a rental.
      </p>
      <label>
        Email address
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          maxLength={200}
        />
      </label>
      <button className="journey-primary" disabled={busy}>
        {busy ? "Sending…" : "Email my sign-in link"}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
