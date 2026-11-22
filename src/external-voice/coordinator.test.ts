import { afterEach, it, expect, vi } from "vitest";
import {
  SpeechOutputCoordinator,
  VoiceAPI,
  type OutputOptions,
} from "./coordinator";
import { LocalSpeechOutput } from "./output";
import type { ClipStore } from "./saved";
import { VOICE_TEST_TEXT } from "../../shared/voice-contract";
const options: OutputOptions = {
  enabled: true,
  volume: 50,
  rate: 0.85,
  voiceURI: "",
  preference: "helga",
  muted: false,
  saveAudio: false,
};
const store = (): ClipStore => ({
  get: vi.fn().mockResolvedValue(undefined),
  put: vi.fn(),
  select: vi.fn(),
  info: vi.fn(),
  clear: vi.fn(),
});
const local = () =>
  Object.assign(new LocalSpeechOutput(), {
    speak: vi.fn().mockResolvedValue("Local German — no credits"),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  });
const session = {
  token: "fictional",
  enabled: true,
  configured: true,
  cacheNamespace: "a".repeat(64),
};
afterEach(() => vi.unstubAllGlobals());
it("plays a browser-saved clip before all network/consent/credit checks", async () => {
  const s = store(),
    fetch = vi.fn(),
    l = local(),
    play = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal(
    "Audio",
    class {
      play = play;
      pause() {}
      volume = 0;
      playbackRate = 1;
    },
  );
  vi.mocked(s.get).mockResolvedValue({
    key: "test",
    text: VOICE_TEST_TEXT,
    namespace: session.cacheNamespace,
    audio: new Blob(["mock"], { type: "audio/mpeg" }),
  });
  const c = new SpeechOutputCoordinator(() => false, s, new VoiceAPI(fetch), l);
  expect(await c.speak(VOICE_TEST_TEXT, options)).toContain(
    "no network, no credits",
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(l.speak).not.toHaveBeenCalled();
  c.stop();
});
it.each([
  { muted: true },
  { volume: 0 },
  { enabled: false },
  { preference: "text" as const },
])("mute/text blocks storage, synthesis and local voice %j", async (patch) => {
  const s = store(),
    fetch = vi.fn(),
    l = local();
  await new SpeechOutputCoordinator(
    () => true,
    s,
    new VoiceAPI(fetch),
    l,
  ).speak(VOICE_TEST_TEXT, { ...options, ...patch });
  expect(s.get).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(l.speak).not.toHaveBeenCalled();
});
it.each(["denied", "disabled", "missing-key", "quota", "offline"])(
  "falls back on %s without a paid alternative",
  async (reason) => {
    const f = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (reason === "offline") throw Error("offline");
      if (url.endsWith("session"))
        return Response.json({
          ...session,
          enabled: reason !== "disabled",
          configured: reason !== "missing-key",
        });
      if (url.endsWith("cache/read"))
        return Response.json({ code: "unavailable" }, { status: 404 });
      return Response.json({ code: "quota" }, { status: 429 });
    });
    const l = local(),
      c = new SpeechOutputCoordinator(
        () => reason !== "denied",
        store(),
        new VoiceAPI(f),
        l,
      );
    expect(await c.speak(VOICE_TEST_TEXT, options)).toContain("Local German");
    expect(
      f.mock.calls.filter(([u]) => String(u).endsWith("speak")),
    ).toHaveLength(reason === "quota" ? 1 : 0);
  },
);
it("never repeats uncertain synthesis, but permits free saved reads on another explicit click", async () => {
  const f = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("session")) return Response.json(session);
    if (url.endsWith("cache/read"))
      return Response.json({ code: "unavailable" }, { status: 404 });
    throw Error("unknown charge");
  });
  const c = new SpeechOutputCoordinator(
    () => true,
    store(),
    new VoiceAPI(f),
    local(),
  );
  await c.speak(VOICE_TEST_TEXT, options);
  await c.speak(VOICE_TEST_TEXT, options);
  expect(
    f.mock.calls.filter(([u]) => String(u).endsWith("speak")),
  ).toHaveLength(1);
});
it.each(["stop", "mute", "volume"])(
  "%s during a pending request never plays a later fallback",
  async (action) => {
    const f = vi.fn(
      (_url, init) =>
        new Promise<Response>((_, reject) =>
          init.signal.addEventListener("abort", () => reject(Error("abort"))),
        ),
    );
    const l = local(),
      c = new SpeechOutputCoordinator(() => true, store(), new VoiceAPI(f), l);
    const pending = c.speak(VOICE_TEST_TEXT, options);
    await vi.waitFor(() => expect(f).toHaveBeenCalled());
    if (action === "stop") c.stop();
    else c.volume(action === "mute" ? 0 : 25);
    await pending;
    expect(l.speak).not.toHaveBeenCalled();
  },
);
