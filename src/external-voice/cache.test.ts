import { it, expect, vi } from "vitest";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileSavedAudio } from "../../server/saved-audio";
import { VoiceService, MODEL } from "../../server/voice-core";
import { VOICE_TEST_TEXT } from "../../shared/voice-contract";
it("private audio survives a new service/cache instance, even disabled and without key; no provider or quota reservation", async () => {
  const dir = mkdtempSync(join(tmpdir(), "helga-cache-"));
  try {
    const cache = new FileSavedAudio(dir, "fictionalVoice123", MODEL, true);
    cache.put(VOICE_TEST_TEXT, new Uint8Array([73, 68, 51]));
    const restarted = new FileSavedAudio(dir, "fictionalVoice123", MODEL, true),
      upstream = vi.fn(),
      reserve = vi.fn();
    const service = new VoiceService(
      { enabled: false, apiKey: "", voiceId: "fictionalVoice123" },
      { reserve },
      upstream,
      undefined,
      restarted,
    );
    expect(
      (await service.speak({ text: VOICE_TEST_TEXT, consent: true })).cached,
    ).toBe(true);
    expect(service.savedInfo()).toMatchObject({ count: 1, bytes: 3 });
    expect(Array.from(service.readSaved(VOICE_TEST_TEXT)!)).toEqual([
      73, 68, 51,
    ]);
    expect(upstream).not.toHaveBeenCalled();
    expect(reserve).not.toHaveBeenCalled();
    expect(
      new FileSavedAudio(dir, "anotherFictionalVoice", MODEL, true).get(
        VOICE_TEST_TEXT,
      ),
    ).toBeUndefined();
    expect(
      new FileSavedAudio(dir, "fictionalVoice123", MODEL, false).get(
        VOICE_TEST_TEXT,
      ),
    ).toBeUndefined();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
it("clear preserves unknown files and rejects personal/oversized input without changing existing clips", () => {
  const dir = mkdtempSync(join(tmpdir(), "helga-cache-"));
  try {
    const cache = new FileSavedAudio(dir, "fictionalVoice123", MODEL, true);
    cache.put(VOICE_TEST_TEXT, new Uint8Array([73, 68, 51]));
    const unknown = join(dir, cache.namespace, "my-recording.wav");
    writeFileSync(unknown, "private fixture");
    expect(() =>
      cache.put("My personal transcript", new Uint8Array([1])),
    ).toThrow();
    expect(() => cache.put("Nach Bonn.", new Uint8Array(2_000_001))).toThrow();
    cache.clear();
    expect(cache.info().count).toBe(0);
    expect(existsSync(unknown)).toBe(true);
    expect(readFileSync(unknown, "utf8")).toBe("private fixture");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
