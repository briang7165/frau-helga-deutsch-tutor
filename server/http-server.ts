import { createServer, type IncomingMessage } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { VoiceService, VoiceError } from "./voice-core.js";
export function validOrigin(origin: string) {
  try {
    const u = new URL(origin);
    return (
      u.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(u.hostname) &&
      u.origin === origin
    );
  } catch {
    return false;
  }
}
export function requestAllowed(
  req: Pick<IncomingMessage, "headers" | "socket">,
  origin: string,
  host: string,
) {
  return (
    req.socket.remoteAddress === "127.0.0.1" &&
    req.headers.host === host &&
    req.headers.origin === origin &&
    req.headers["x-frau-helga"] === "voice-v1" &&
    req.headers["content-type"] === "application/json"
  );
}
export function createVoiceServer(
  service: VoiceService,
  origin: string,
  host?: string,
) {
  if (!validOrigin(origin)) throw Error("Invalid local origin");
  const token = randomBytes(32).toString("hex");
  let requests: number[] = [];
  return createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'");
    const fail = (code: string, status: number) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ code }));
    };
    if (
      req.method !== "POST" ||
      !requestAllowed(req, origin, host ?? `127.0.0.1:${req.socket.localPort}`)
    ) {
      fail("authorization", 403);
      return;
    }
    const now = Date.now();
    requests = requests.filter((t) => now - t < 60000);
    if (requests.length >= 20) {
      fail("rate_limit", 429);
      return;
    }
    requests.push(now);
    try {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 4096) throw new VoiceError("invalid_request", 413);
        chunks.push(Buffer.from(chunk));
      }
      let raw: unknown;
      try {
        raw = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        throw new VoiceError("invalid_request");
      }
      if (req.url === "/api/voice/session") {
        if (
          !raw ||
          typeof raw !== "object" ||
          (raw as { consent?: boolean }).consent !== true
        )
          throw new VoiceError("consent_required", 403);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ...service.status(), token }));
        return;
      }
      if (req.url !== "/api/voice/speak") {
        fail("invalid_request", 404);
        return;
      }
      const received = req.headers["x-voice-session"];
      if (
        typeof received !== "string" ||
        received.length !== token.length ||
        !timingSafeEqual(Buffer.from(received), Buffer.from(token))
      )
        throw new VoiceError("authorization", 403);
      const result = await service.speak(raw);
      res.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "X-Voice-Cache": result.cached ? "hit" : "miss",
      });
      res.end(result.audio);
    } catch (error) {
      const safe =
        error instanceof VoiceError
          ? error
          : new VoiceError("unavailable", 500);
      if (!res.headersSent) fail(safe.code, safe.status);
      else res.end();
    }
  });
}
