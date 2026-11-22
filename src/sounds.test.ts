import { afterEach, expect, it, vi } from "vitest";
import { SoundPlayer } from "./sounds";
import { defaults } from "./preferences";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it("bounds a hung Firefox audio resume and never plays a late tone", async () => {
  vi.useFakeTimers();
  let finish!: () => void;
  const oscillator = vi.fn();
  vi.stubGlobal(
    "AudioContext",
    class {
      state = "suspended";
      createOscillator = oscillator;
      resume() {
        return new Promise<void>((r) => {
          finish = r;
        });
      }
    },
  );
  const player = new SoundPlayer();
  const pending = player.play("success", {
    ...defaults,
    sfx: true,
    muted: false,
  });
  await vi.advanceTimersByTimeAsync(1500);
  expect(await pending).toBe(false);
  finish();
  await Promise.resolve();
  expect(oscillator).not.toHaveBeenCalled();
});
