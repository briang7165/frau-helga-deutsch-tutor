import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(path, e.name)) : [join(path, e.name)],
  );
}
const bundle = files(resolve("dist"))
  .filter((p) => /\.(js|html|css|map)$/.test(p))
  .map((p) => readFileSync(p, "utf8"))
  .join("\n");
const privatePath = resolve("private/.env.voice");
const values = existsSync(privatePath)
  ? readFileSync(privatePath, "utf8")
      .split(/\r?\n/)
      .filter((l) => /^ELEVENLABS_(API_KEY|VOICE_ID)=/.test(l))
      .map((l) => l.slice(l.indexOf("=") + 1).trim())
      .filter(Boolean)
  : [];
const forbidden = [
  "xi-api-key",
  "api.elevenlabs.io/v1/text-to-speech",
  ...values,
  process.env.ELEVENLABS_API_KEY,
  process.env.ELEVENLABS_VOICE_ID,
].filter(Boolean);
if (forbidden.some((value) => bundle.includes(value))) {
  console.error(
    "FAIL: server-only data found in client output. Details withheld.",
  );
  process.exit(1);
}
console.log(
  "PASS: client bundle contains no configured voice ID, API key, upstream endpoint or auth-header marker.",
);
