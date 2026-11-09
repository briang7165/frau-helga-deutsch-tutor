import type { Settings } from "./preferences";
export type SoundEvent = "success" | "completion" | "badge" | "incorrect";
export class SoundPlayer {
  private context: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private generation = 0;
  stop() {
    this.generation++;
    try {
      this.oscillator?.stop();
    } catch {
      /* already stopped */
    }
    this.oscillator = null;
  }
  async play(event: SoundEvent, s: Settings) {
    this.stop();
    if (
      !s.sfx ||
      s.muted ||
      s.sfxVolume === 0 ||
      typeof AudioContext === "undefined"
    )
      return false;
    try {
      const token = this.generation;
      this.context ??= new AudioContext();
      await this.context.resume();
      if (token !== this.generation || !this.context) return false;
      const oscillator = this.context.createOscillator(),
        gain = this.context.createGain();
      this.oscillator = oscillator;
      const t = this.context.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(
        { success: 660, completion: 784, badge: 880, incorrect: 220 }[event],
        t,
      );
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime((0.08 * s.sfxVolume) / 100, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start(t);
      oscillator.stop(t + 0.24);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      return true;
    } catch {
      return false;
    }
  }
  close() {
    this.stop();
    void this.context?.close();
    this.context = null;
  }
}
export const sounds = new SoundPlayer();
