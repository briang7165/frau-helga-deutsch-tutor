import { mkdirSync, openSync, closeSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { VoiceService } from "./voice-core.js";
import { FileUsageLedger } from "./usage-ledger.js";
import { createVoiceServer } from "./http-server.js";
const directory = resolve("private");
mkdirSync(directory, { recursive: true });
const lock = resolve(directory, "voice-server.lock");
let acquired = false;
try {
  const fd = openSync(lock, "wx", 0o600);
  closeSync(fd);
  acquired = true;
  const service = new VoiceService(
    {
      enabled: process.env.ELEVENLABS_LIVE_ENABLED === "true",
      apiKey: process.env.ELEVENLABS_API_KEY ?? "",
      voiceId: process.env.ELEVENLABS_VOICE_ID ?? "",
    },
    new FileUsageLedger(resolve(directory, "voice-usage.json")),
  );
  const server = createVoiceServer(
    service,
    process.env.VOICE_APP_ORIGIN ?? "http://127.0.0.1:5173",
  );
  server.requestTimeout = 20000;
  server.headersTimeout = 10000;
  process.on("exit", () => {
    if (acquired)
      try {
        unlinkSync(lock);
      } catch {
        /* Never log paths/secrets. */
      }
  });
  server.on("error", () => {
    console.error(
      "Voice server could not start. Check local port and private lock/permissions.",
    );
    process.exit(1);
  });
  const close = () => {
    service.clearCache();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 20000).unref();
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
  server.listen(8787, "127.0.0.1", () =>
    console.log(
      "Local voice server listening on 127.0.0.1:8787. No upstream calls occur until an explicitly enabled speak request.",
    ),
  );
} catch {
  if (acquired)
    try {
      unlinkSync(lock);
    } catch {
      /* no sensitive logs */
    }
  console.error(
    "Voice server setup blocked. Check private configuration and single-process lock.",
  );
  process.exitCode = 1;
}
