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
    text: `${event === "received" ? "Request received—your trip is not confirmed." : event === "confirmed" ? "Your rental has been confirmed after owner review." : event === "documents" ? "Your renter information was updated; this message is not a confirmation." : "Your request status has changed; this message is not a confirmation."}\nReference: ${r.id}\n${car?.year} ${car?.make} ${car?.model}\n${r.quote.start} to ${r.quote.end} (Eastern)\nNext: ${owner ? "Review the request and required checks." : event === "received" ? "Sign in and provide the required renter information." : "Sign in to review the next required action."}\n${process.env.DCR_SITE_ORIGIN || ""}${owner ? "/admin" : "/my-trip"}`,
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
const leaseMs = 60000;

/** Claim durably, release the rental lock, send, then conditionally acknowledge.
 * A crashed worker's lease expires; retries keep the same provider key/body.
 */
export async function claimNotifications() {
  return transaction(async () => {
    const now = Date.now();
    const rows = (await query(
      "SELECT * FROM dcr_private.outbox WHERE state IN ('pending','retry') AND next_at<=$1 AND lease_until<=$1 ORDER BY created_at LIMIT 5 FOR UPDATE",
      [now],
    )).rows;
    const claimed = [];
    for (const row of rows) {
      if (isDemo() || process.env.VERCEL_ENV === "preview" || process.env.DCR_EMAIL_MODE !== "resend") {
        await query("UPDATE dcr_private.outbox SET state=$2,attempts=attempts+1,claim_token=NULL,lease_until=0 WHERE id=$1", [row.id,
          isDemo() || process.env.VERCEL_ENV === "preview" || process.env.DCR_EMAIL_MODE === "capture" ? "captured" : "blocked"]);
        continue;
      }
      // Conservatively stop automatic replay before the provider's 24h dedupe expiry.
      if (now - Number(row.created_at) > 23 * 3600000) {
        await query("UPDATE dcr_private.outbox SET state='blocked',claim_token=NULL,lease_until=0 WHERE id=$1", [row.id]);
        continue;
      }
      if (!process.env.DCR_EMAIL_API_KEY || !process.env.DCR_EMAIL_FROM)
        throw new PilotError("Transactional sender is not configured.", 503);
      const token = randomUUID();
      const delivery = row.delivery || JSON.stringify({ from: process.env.DCR_EMAIL_FROM, to: [row.recipient], ...row.payload });
      await query("UPDATE dcr_private.outbox SET claim_token=$2,lease_until=$3,delivery=$4,attempts=attempts+1 WHERE id=$1", [row.id,token,now+leaseMs,delivery]);
      claimed.push({ id: String(row.id), attempts: Number(row.attempts), claim_token: token, delivery: String(delivery) });
    }
    return { rows: claimed, processed: rows.length };
  });
}
export async function dispatchNotifications() {
  const batch = await claimNotifications();
  for (const row of batch.rows) {
    // Do not send a later row if a suspension let another worker acquire it.
    const now = Date.now();
    const current = await query("UPDATE dcr_private.outbox SET lease_until=$3 WHERE id=$1 AND claim_token=$2 AND lease_until>$4 AND created_at>$5 AND state IN ('pending','retry') RETURNING id",
      [row.id,row.claim_token,now+leaseMs,now,now-23*3600000]);
    if (!current.rowCount) continue;
    let sent = false;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST", signal: AbortSignal.timeout(3000),
        headers: { Authorization: "Bearer " + process.env.DCR_EMAIL_API_KEY, "Content-Type": "application/json", "Idempotency-Key": row.id },
        body: row.delivery,
      });
      sent = res.ok;
    } catch { /* uncertain response: retry the immutable body with the same key */ }
    // Database failure here deliberately leaves the lease recoverable. Never
    // acknowledge a claim superseded while the provider request was in flight.
    await query("UPDATE dcr_private.outbox SET state=$3,sent_at=$4,next_at=$5,claim_token=NULL,lease_until=0 WHERE id=$1 AND claim_token=$2", [
      row.id,row.claim_token,sent ? "sent" : "retry",sent ? Date.now() : null,
      sent ? 0 : Date.now()+60000*2**Math.min(row.attempts,8),
    ]);
  }
  return { processed: batch.processed };
}
