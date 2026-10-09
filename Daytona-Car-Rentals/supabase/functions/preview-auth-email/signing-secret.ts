/** Supabase's versioned Standard Webhooks HMAC secret; never repair key material. */
export function signingSecret(value: string): string {
  if (!value.startsWith("v1,whsec_")) throw new Error("Invalid hook secret format.");
  const encoded = value.slice("v1,whsec_".length);
  // RFC 4648 standard base64, including required padding and canonical pad bits.
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))
    throw new Error("Invalid hook secret encoding.");
  const decoded = atob(encoded);
  // Standard Webhooks specifies 24–64 bytes for symmetric signing keys.
  if (decoded.length < 24 || decoded.length > 64 || btoa(decoded) !== encoded)
    throw new Error("Invalid hook secret encoding.");
  // standardwebhooks@1.0.0 accepts whsec_ + base64; remove only Supabase's version.
  return value.slice(3);
}
