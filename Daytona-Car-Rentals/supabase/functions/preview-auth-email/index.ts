import { previewAuthEmail } from "./handler.ts";
// Minimal runtime declaration keeps the portable handler covered by application tsc.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): unknown;
};
Deno.serve(previewAuthEmail(name => Deno.env.get(name)));
