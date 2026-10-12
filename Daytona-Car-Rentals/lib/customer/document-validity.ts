import { daytonaTime, type Quote } from "../pilot/model";
import { PilotError } from "../pilot/errors";
import { date } from "./intake";

export function validThroughReturn(value: unknown, quote: Pick<Quote, "endMs">) {
  const parsed = date.safeParse(value);
  return parsed.success && daytonaTime(parsed.data + "T23:59") >= quote.endMs;
}

export function requireDocumentValidity(value: unknown, quote: Pick<Quote, "endMs">) {
  if (!validThroughReturn(value, quote))
    throw new PilotError("Upload a document valid through your return date.", 409);
  return date.parse(value);
}

export function requireValidDocuments(
  quote: Pick<Quote, "endMs" | "policy">,
  documents: { kind: string; valid_until?: unknown }[],
) {
  for (const kind of quote.policy?.requiredDocuments || ["license", "insurance"])
    if (!documents.some((d) => d.kind === kind && validThroughReturn(d.valid_until, quote)))
      throw new PilotError("Upload required documents valid through your return date.", 409);
}
