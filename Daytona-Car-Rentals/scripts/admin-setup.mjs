import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

async function readPassword() {
  if (!process.stdin.isTTY) {
    let value = "";
    for await (const chunk of process.stdin) value += chunk;
    return value.trimEnd();
  }
  process.stdout.write(
    "New admin password (at least 14 characters; input hidden): ",
  );
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return await new Promise((resolve, reject) => {
    let value = "";
    const handler = (chunk) => {
      for (const c of chunk.toString()) {
        if (c === "\u0003") {
          process.stdin.setRawMode(false);
          reject(new Error("Cancelled."));
          process.stdin.removeListener("data", handler);
          return;
        }
        if (c === "\r" || c === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", handler);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (c === "\u007f") value = value.slice(0, -1);
        else value += c;
      }
    };
    process.stdin.on("data", handler);
  });
}
const password = await readPassword();
if (password.length < 14 || password.length > 200)
  throw new Error("Use a password between 14 and 200 characters.");
const salt = randomBytes(16).toString("hex"),
  hash = salt + ":" + scryptSync(password, salt, 64).toString("hex");
const path = resolve(".env.local");
let text = existsSync(path)
  ? readFileSync(path, "utf8")
  : "DCR_DEMO_MODE=true\nDCR_DATABASE_PATH=data/preview.sqlite\n";
text = text.replace(/^DCR_ADMIN_PASSWORD_HASH=.*\n?/gm, "");
writeFileSync(
  path,
  text.trimEnd() + "\nDCR_ADMIN_PASSWORD_HASH=" + hash + "\n",
  { mode: 0o600 },
);
process.stdout.write(
  "Admin configuration saved to .env.local. Restart the server, then open /admin.\n",
);
