import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  VoiceService,
  VoiceError,
  validateVoiceRequest,
  MODEL,
  type UsageLedger,
} from "../../server/voice-core";
import { FileUsageLedger } from "../../server/usage-ledger";
import {
  createVoiceServer,
  requestAllowed,
  validOrigin,
} from "../../server/http-server";
import {
  VOICE_TEST_TEXT,
  originalVoiceTexts,
  VOICE_LIMITS,
} from "../../shared/voice-contract";
const fakeVoice = "fictionalVoice123";
const config = {
  enabled: true,
  apiKey: "fictional-server-key",
  voiceId: fakeVoice,
};
const subscription = {
  tier: "free",
  can_extend_character_limit: false,
  allowed_to_extend_character_limit: false,
  max_character_limit_extension: 0,
  max_credit_limit_extension: 0,
  has_open_invoices: false,
  current_overage: { amount: "0" },
  character_count: 0,
  character_limit: 10000,
};
const model = {
  model_id: MODEL,
  can_do_text_to_speech: true,
  languages: [{ language_id: "de" }],
  model_rates: { character_cost_multiplier: 1 },
};
const mockUpstream = (overrides: Record<string, unknown> = {}) =>
  vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/user/subscription"))
      return Response.json(overrides.subscription ?? subscription);
    if (url.endsWith("/models"))
      return Response.json(overrides.models ?? [model]);
    if (url.endsWith(`/voices/${fakeVoice}`))
      return Response.json(
        overrides.voice ?? {
          voice_id: fakeVoice,
          available_for_tiers: ["free"],
        },
      );
    return new Response(new Uint8Array([73, 68, 51]), {
      headers: { "content-type": "audio/mpeg" },
    });
  });
const ledger = (): UsageLedger => ({ reserve: vi.fn() });
const request = { text: VOICE_TEST_TEXT, consent: true };
afterEach(() => vi.useRealTimers());
describe("secure opt-in and validation", () => {
  it("makes zero network calls when disabled", async () => {
    const fetch = mockUpstream();
    await expect(
      new VoiceService({ ...config, enabled: false }, ledger(), fetch).speak(
        request,
      ),
    ).rejects.toMatchObject({ code: "disabled" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    { ...request, consent: false },
    { ...request, voice_id: "other" },
    { ...request, model_id: "other" },
    { ...request, text: "x".repeat(301) },
    { ...request, text: "private personal text" },
    { text: "\n", consent: true },
    null,
  ])("rejects unauthorized request %j without network", async (raw) => {
    const fetch = mockUpstream();
    await expect(
      new VoiceService(config, ledger(), fetch).speak(raw),
    ).rejects.toBeInstanceOf(VoiceError);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not accept missing private credentials or malformed voice ID", async () => {
    for (const patch of [{ apiKey: "" }, { voiceId: "../../other" }])
      await expect(
        new VoiceService(
          { ...config, ...patch },
          ledger(),
          mockUpstream(),
        ).speak(request),
      ).rejects.toMatchObject({ code: "configuration" });
  });
  it("only allows local origins and exact Host/Origin/custom header", () => {
    expect(validOrigin("https://evil.example")).toBe(false);
    expect(validOrigin("http://127.0.0.1:5173")).toBe(true);
    const base = {
      headers: {
        host: "127.0.0.1:8787",
        origin: "http://127.0.0.1:5173",
        "x-frau-helga": "voice-v1",
        "content-type": "application/json",
      },
      socket: { remoteAddress: "127.0.0.1" },
    };
    expect(
      requestAllowed(base as never, base.headers.origin, base.headers.host),
    ).toBe(true);
    for (const patch of [
      { origin: "https://evil.example" },
      { host: "evil.example" },
      { "x-frau-helga": "" },
    ])
      expect(
        requestAllowed(
          { ...base, headers: { ...base.headers, ...patch } } as never,
          base.headers.origin,
          base.headers.host,
        ),
      ).toBe(false);
  });
});
describe("account, model, voice and credit checks", () => {
  it.each([
    {},
    {
      allowed_to_extend_character_limit: null,
      max_character_limit_extension: null,
    },
    {
      allowed_to_extend_character_limit: false,
      max_character_limit_extension: null,
    },
    {
      allowed_to_extend_character_limit: null,
      max_character_limit_extension: 0,
    },
  ])(
    "accepts a current free account with absent/null deprecated fields %j",
    async (legacy) => {
      const current: Record<string, unknown> = { ...subscription };
      delete current.allowed_to_extend_character_limit;
      delete current.max_character_limit_extension;
      const f = mockUpstream({ subscription: { ...current, ...legacy } });
      const l = ledger();
      await expect(
        new VoiceService(config, l, f).speak(request),
      ).resolves.toMatchObject({ cached: false });
      expect(f).toHaveBeenCalledTimes(4);
      expect(l.reserve).toHaveBeenCalledWith(
        VOICE_TEST_TEXT.length,
        expect.any(Date),
      );
    },
  );
  it.each([
    { max_credit_limit_extension: undefined },
    { max_credit_limit_extension: null },
    { max_credit_limit_extension: "unlimited" },
    { max_credit_limit_extension: 1000 },
    { max_credit_limit_extension: -1 },
    { max_credit_limit_extension: "0" },
    { max_credit_limit_extension: false },
    { max_credit_limit_extension: {} },
    { allowed_to_extend_character_limit: true },
    { allowed_to_extend_character_limit: "false" },
    { max_character_limit_extension: 1000 },
    { max_character_limit_extension: "0" },
    { can_extend_character_limit: true },
    { can_extend_character_limit: undefined },
    { can_extend_character_limit: null },
    { tier: undefined },
    { tier: "starter" },
    { has_open_invoices: null },
    { has_open_invoices: true },
    { current_overage: undefined },
    { current_overage: null },
    { current_overage: { amount: null } },
    { current_overage: { amount: false } },
    { current_overage: { amount: "" } },
    { current_overage: { amount: "0.01" } },
  ])(
    "rejects ambiguous or contradictory billing metadata before synthesis %j",
    async (patch) => {
      const f = mockUpstream({ subscription: { ...subscription, ...patch } });
      const l = ledger();
      await expect(
        new VoiceService(config, l, f).speak(request),
      ).rejects.toMatchObject({ code: "quota" });
      expect(f).toHaveBeenCalledTimes(1);
      expect(String(f.mock.calls[0][0])).toMatch(/\/user\/subscription$/);
      expect(l.reserve).not.toHaveBeenCalled();
    },
  );
  it.each([
    { tier: "starter" },
    { allowed_to_extend_character_limit: true },
    { character_count: 9999 },
    { has_open_invoices: true },
    { current_overage: { amount: "2" } },
    { character_limit: undefined },
  ])("blocks unsafe account state %j", async (patch) => {
    const f = mockUpstream({ subscription: { ...subscription, ...patch } });
    await expect(
      new VoiceService(config, ledger(), f).speak(request),
    ).rejects.toMatchObject({ code: "quota" });
    expect(f.mock.calls.length).toBeLessThanOrEqual(2);
  });
  it("blocks unsupported model or voice", async () => {
    for (const overrides of [
      { models: [{ ...model, languages: [{ language_id: "en" }] }] },
      { voice: { voice_id: "different" } },
      { voice: { voice_id: fakeVoice, available_for_tiers: ["starter"] } },
    ])
      await expect(
        new VoiceService(config, ledger(), mockUpstream(overrides)).speak(
          request,
        ),
      ).rejects.toMatchObject({ code: "unsupported_voice" });
  });
  it("maps auth, quota and voice upstream errors without exposing response bodies", async () => {
    for (const [status, code] of [
      [401, "authorization"],
      [403, "authorization"],
      [404, "unsupported_voice"],
      [429, "quota"],
    ] as const) {
      const f = vi.fn(
        async () => new Response("secret diagnostic text", { status }),
      );
      await expect(
        new VoiceService(config, ledger(), f).speak(request),
      ).rejects.toMatchObject({ code, message: code });
    }
  });
  it("pins upstream URL/model and reuses ephemeral original-prompt cache", async () => {
    const f = mockUpstream(),
      l = ledger(),
      service = new VoiceService(config, l, f);
    expect((await service.speak(request)).cached).toBe(false);
    expect((await service.speak(request)).cached).toBe(true);
    expect(f).toHaveBeenCalledTimes(4);
    const call = f.mock.calls[3] as unknown as [string, RequestInit];
    expect(call[0]).toContain(`/text-to-speech/${fakeVoice}/stream`);
    expect(call[0]).not.toContain(config.apiKey);
    expect(JSON.parse(call[1].body as string)).toEqual({
      text: VOICE_TEST_TEXT,
      model_id: MODEL,
    });
    expect(l.reserve).toHaveBeenCalledTimes(1);
  });
  it("reserves characters even when synthesis fails", async () => {
    const f = mockUpstream(),
      l = ledger();
    f.mockImplementationOnce(async () => Response.json(subscription))
      .mockImplementationOnce(async () => Response.json([model]))
      .mockImplementationOnce(async () =>
        Response.json({ voice_id: fakeVoice }),
      )
      .mockImplementationOnce(async () => new Response(null, { status: 500 }));
    const service = new VoiceService(config, l, f);
    await expect(service.speak(request)).rejects.toMatchObject({
      code: "unavailable",
    });
    expect(service.status().sessionUsed).toBe(VOICE_TEST_TEXT.length);
    expect(l.reserve).toHaveBeenCalledTimes(1);
  });
  it("bounds response size and accepts only audio", async () => {
    const f = mockUpstream();
    f.mockImplementationOnce(async () => Response.json(subscription))
      .mockImplementationOnce(async () => Response.json([model]))
      .mockImplementationOnce(async () =>
        Response.json({ voice_id: fakeVoice }),
      )
      .mockImplementationOnce(
        async () =>
          new Response(new Uint8Array(VOICE_LIMITS.audioBytes + 1), {
            headers: { "content-type": "audio/mpeg" },
          }),
      );
    await expect(
      new VoiceService(config, ledger(), f).speak(request),
    ).rejects.toMatchObject({ code: "unavailable" });
  });
  it("serializes synthesis and times out stuck upstream reads", async () => {
    vi.useFakeTimers();
    const f = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("abort")),
          ),
        ),
    );
    const service = new VoiceService(config, ledger(), f);
    const pending = service.speak(request);
    const assertion = expect(pending).rejects.toMatchObject({
      code: "timeout",
    });
    await expect(service.speak(request)).rejects.toMatchObject({
      code: "busy",
    });
    await vi.advanceTimersByTimeAsync(VOICE_LIMITS.timeoutMs + 1);
    await assertion;
  });
  it("enforces per-minute and server-session caps", async () => {
    let now = new Date("2026-11-08T00:00:00Z");
    const service = new VoiceService(
      config,
      ledger(),
      mockUpstream(),
      () => now,
    );
    for (let i = 0; i < 6; i++) await service.speak(request);
    await expect(service.speak(request)).rejects.toMatchObject({
      code: "rate_limit",
    });
    let hit = false;
    for (const text of originalVoiceTexts) {
      now = new Date(now.getTime() + 61000);
      try {
        await service.speak({ text, consent: true });
      } catch (e) {
        expect(e).toMatchObject({ code: "quota" });
        hit = true;
        break;
      }
    }
    expect(hit).toBe(true);
  });
});
describe("durable count-only quota ledger", () => {
  it("preserves quotas over restarts and fails closed for corruption", () => {
    const dir = mkdtempSync(join(tmpdir(), "helga-test-"));
    try {
      const path = join(dir, "usage.json"),
        date = new Date("2026-11-08T00:00:00Z");
      new FileUsageLedger(path).reserve(1200, date);
      expect(() => new FileUsageLedger(path).reserve(1, date)).toThrow(
        VoiceError,
      );
      expect(readFileSync(path, "utf8")).not.toContain(VOICE_TEST_TEXT);
      writeFileSync(path, "{bad");
      expect(() => new FileUsageLedger(path).reserve(1, date)).toThrow(
        VoiceError,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("enforces monthly totals across UTC day rollover", () => {
    const dir = mkdtempSync(join(tmpdir(), "helga-test-"));
    try {
      const l = new FileUsageLedger(join(dir, "counts.json"));
      l.reserve(1200, new Date("2026-11-08"));
      l.reserve(1200, new Date("2026-11-09"));
      expect(() => l.reserve(601, new Date("2026-11-10"))).toThrow(VoiceError);
      l.reserve(600, new Date("2026-11-10"));
      l.reserve(1, new Date("2026-12-01"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("requires a session token before HTTP synthesis and never exposes credentials", async () => {
    const f = mockUpstream();
    const service = new VoiceService(
      { ...config, enabled: false },
      ledger(),
      f,
    );
    const server = createVoiceServer(service, "http://127.0.0.1:5173");
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    try {
      const address = server.address() as { port: number };
      const headers = {
        Origin: "http://127.0.0.1:5173",
        "X-Frau-Helga": "voice-v1",
        "Content-Type": "application/json",
      };
      const base = `http://127.0.0.1:${address.port}`;
      const denied = await fetch(base + "/api/voice/speak", {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });
      expect(denied.status).toBe(403);
      const session = await fetch(base + "/api/voice/session", {
        method: "POST",
        headers,
        body: '{"consent":true}',
      });
      const body = await session.text();
      expect(body).not.toContain(config.apiKey);
      expect(body).not.toContain(config.voiceId);
      expect(JSON.parse(body).enabled).toBe(false);
      expect(f).not.toHaveBeenCalled();
    } finally {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
