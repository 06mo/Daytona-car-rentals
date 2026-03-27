"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { storePendingMagicLinkEmail } from "@/lib/auth/clientSession";

type MagicLinkRequestFormProps = {
  buttonLabel?: string;
  continueUrl?: string;
  initialEmail?: string;
  onSent?: (email: string) => void;
  submitVariant?: "primary" | "secondary";
};

export function MagicLinkRequestForm({
  buttonLabel = "Send Secure Link",
  continueUrl = "/dashboard",
  initialEmail = "",
  onSent,
  submitVariant = "primary",
}: MagicLinkRequestFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          continueUrl,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to send your sign-in link.");
      }

      storePendingMagicLinkEmail(normalizedEmail);
      onSent?.(normalizedEmail);
      router.push(
        `/auth/magic-link-sent?email=${encodeURIComponent(normalizedEmail)}&continueUrl=${encodeURIComponent(continueUrl)}`,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send your sign-in link.");
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Input
        autoComplete="email"
        disabled={loading}
        id="magic-link-email"
        label="Email"
        onChange={(event) => setEmail(event.target.value)}
        required
        type="email"
        value={email}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button className="w-full" disabled={loading} type="submit" variant={submitVariant}>
        {loading ? "Sending..." : buttonLabel}
      </Button>
    </form>
  );
}
