import "server-only";
import { randomUUID } from "node:crypto";
import { query, transaction, isDemo } from "../pilot/database";
import { PilotError } from "../pilot/errors";
import { vehicles } from "../data/vehicles";
import type { Reservation } from "../pilot/model";
export async function enqueue(
  r: Reservation,
  event: string,
  recipient: string,
  owner = false,
) {
  const car = vehicles.find((v) => v.id === r.quote.vehicleId);
  const payload = {
    subject: owner
      ? "Rental review update"
      : event === "confirmed"
        ? "Rental confirmed"
        : "Rental request update",
    text: `${event === "received" ? "Request received—your trip is not confirmed." : event === "confirmed" ? "Your rental has been confirmed after owner review." : "Your request status has changed; this message is not a confirmation."}\nReference: ${r.id}\n${car?.year} ${car?.make} ${car?.model}\n${r.quote.start} to ${r.quote.end} (Eastern)\nNext: ${owner ? "Review the request and required checks." : event === "received" ? "Sign in and provide the required renter information." : "Sign in to review the next required action."}\n${process.env.DCR_SITE_ORIGIN || ""}${owner ? "/admin" : "/my-trip"}`,
  };
  await query(
    "INSERT INTO dcr_private.outbox(id,event_key,recipient,payload,created_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_key) DO NOTHING",
    [
      randomUUID(),
      r.id +
        ":" +
        r.revision +
        ":" +
        event +
        ":" +
        (owner ? "owner" : "customer"),
      recipient,
      payload,
      Date.now(),
    ],
  );
}
export async function notify(r: Reservation, event: string, email?: string) {
  if (email || r.customerId) await enqueue(r, event, email || r.email);
  await enqueue(
    r,
    event,
    process.env.DCR_OWNER_EMAIL || "owner@example.invalid",
    true,
  );
}
/** A bounded owner-triggered worker; never sends from demo/Preview. Each event has a provider idempotency key. */
export async function dispatchNotifications() {
  return transaction(async () => {
    const rows = (
      await query(
        "SELECT * FROM dcr_private.outbox WHERE state IN ('pending','retry') AND next_at<=$1 ORDER BY created_at LIMIT 5 FOR UPDATE",
        [Date.now()],
      )
    ).rows;
    for (const row of rows) {
      if (
        isDemo() ||
        process.env.VERCEL_ENV === "preview" ||
        process.env.DCR_EMAIL_MODE !== "resend"
      ) {
        await query(
          "UPDATE dcr_private.outbox SET state=$2,attempts=attempts+1 WHERE id=$1",
          [
            row.id,
            isDemo() || process.env.DCR_EMAIL_MODE === "capture"
              ? "captured"
              : "blocked",
          ],
        );
        continue;
      }
      // Prevent retries outside the provider's 24-hour idempotency window: reconcile manually instead.
      if (Date.now() - Number(row.created_at) > 23 * 3600000) {
        await query(
          "UPDATE dcr_private.outbox SET state='blocked' WHERE id=$1",
          [row.id],
        );
        continue;
      }
      if (!process.env.DCR_EMAIL_API_KEY || !process.env.DCR_EMAIL_FROM)
        throw new PilotError("Transactional sender is not configured.", 503);
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          signal: AbortSignal.timeout(3000),
          headers: {
            Authorization: "Bearer " + process.env.DCR_EMAIL_API_KEY,
            "Content-Type": "application/json",
            "Idempotency-Key": row.id,
          },
          body: JSON.stringify({
            from: process.env.DCR_EMAIL_FROM,
            to: [row.recipient],
            ...row.payload,
          }),
        });
        if (!res.ok) throw Error("Provider rejected message");
        await query(
          "UPDATE dcr_private.outbox SET state='sent',attempts=attempts+1,sent_at=$2 WHERE id=$1",
          [row.id, Date.now()],
        );
      } catch {
        await query(
          "UPDATE dcr_private.outbox SET state='retry',attempts=attempts+1,next_at=$2 WHERE id=$1",
          [row.id, Date.now() + 60000 * 2 ** Math.min(row.attempts, 8)],
        );
      }
    }
    return { processed: rows.length };
  });
}
