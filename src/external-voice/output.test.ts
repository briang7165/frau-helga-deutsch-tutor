import { afterEach, expect, it, vi } from "vitest";
import { ElevenLabsSpeechOutput, LocalSpeechOutput } from "./output";
const options = { enabled: true, volume: 50, rate: 0.85, voiceURI: "" };
afterEach(() => vi.unstubAllGlobals());
it("never calls the local proxy without explicit browser opt-in", async () => {
  const request = vi.fn();
  await expect(
    new ElevenLabsSpeechOutput(() => false, request).speak("Hallo", options),
  ).rejects.toMatchObject({ code: "consent_required" });
  expect(request).not.toHaveBeenCalled();
});
it("keeps secrets out of client requests and uses only the local API", async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        enabled: true,
        configured: true,
        token: "test-session-token",
      }),
    )
    .mockResolvedValueOnce(
      new Response(new Uint8Array([73, 68, 51]), {
        headers: { "content-type": "audio/mpeg" },
      }),
    );
  vi.stubGlobal(
    "Audio",
    class {
      volume = 0;
      playbackRate = 0;
      async play() {}
      pause() {}
    },
  );
  const provider = new ElevenLabsSpeechOutput(() => true, request);
  await provider.speak("Hallo", options);
  expect(request.mock.calls.map((c) => c[0])).toEqual([
    "/api/voice/session",
    "/api/voice/speak",
  ]);
  const sent = JSON.stringify(request.mock.calls);
  expect(sent).not.toContain("xi-api-key");
  expect(sent).not.toContain("voice_id");
  provider.pause();
  await provider.resume();
  provider.stop();
});
it("local fallback never silently selects a remote browser voice", async () => {
  const speak = vi.fn();
  vi.stubGlobal("speechSynthesis", {
    getVoices: () => [
      { lang: "de-DE", localService: false, voiceURI: "remote" },
    ],
    speak,
  });
  const result = await new LocalSpeechOutput().speak("Hallo", options);
  expect(result).toContain("Text-only");
  expect(speak).not.toHaveBeenCalled();
});
it("cancels an outstanding client request without sending synthesis", async () => {
  const request = vi.fn(
    (_url, init) =>
      new Promise<Response>((_, reject) =>
        init.signal.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        ),
      ),
  );
  const provider = new ElevenLabsSpeechOutput(() => true, request);
  const pending = provider.speak("Hallo", options);
  provider.stop();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(request).toHaveBeenCalledTimes(1);
});
