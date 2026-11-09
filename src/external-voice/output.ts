import {
  voiceMessages,
  type VoiceErrorCode,
} from "../../shared/voice-contract";
export type SpeechOptions = {
  enabled: boolean;
  volume: number;
  rate: number;
  voiceURI: string;
};
export interface SpeechOutputProvider {
  speak(text: string, options: SpeechOptions): Promise<string>;
  stop(): void;
  pause(): void;
  resume(): Promise<void>;
  setVolume(volume: number): void;
}
export class SilentSpeechOutput implements SpeechOutputProvider {
  async speak() {
    return "Text-only fallback. Read the visible lesson text.";
  }
  stop() {}
  pause() {}
  async resume() {}
  setVolume() {}
}
export class LocalSpeechOutput implements SpeechOutputProvider {
  async speak(text: string, options: SpeechOptions) {
    if (!options.enabled || typeof speechSynthesis === "undefined")
      return new SilentSpeechOutput().speak();
    const voices = speechSynthesis
      .getVoices()
      .filter((v) => /^de(?:[-_]|$)/i.test(v.lang) && v.localService);
    const voice =
      voices.find((v) => v.voiceURI === options.voiceURI) ?? voices[0];
    if (!voice) return new SilentSpeechOutput().speak();
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.volume = options.volume / 100;
      u.rate = options.rate;
      speechSynthesis.speak(u);
      return "Using an installed local German voice instead. No text was sent by this fallback.";
    } catch {
      return new SilentSpeechOutput().speak();
    }
  }
  stop() {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }
  pause() {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.pause();
  }
  async resume() {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.resume();
  }
  setVolume() {
    this.stop();
  }
}
export class ExternalVoiceFailure extends Error {
  constructor(public code: VoiceErrorCode) {
    super(voiceMessages[code]);
  }
}
async function check(response: Response) {
  if (response.ok) return;
  let code: VoiceErrorCode = "unavailable";
  try {
    const body = await response.json();
    if (Object.hasOwn(voiceMessages, body.code)) code = body.code;
  } catch {
    /* Never expose upstream error text */
  }
  throw new ExternalVoiceFailure(code);
}
export class ElevenLabsSpeechOutput implements SpeechOutputProvider {
  private audio: HTMLAudioElement | null = null;
  private url = "";
  private abort: AbortController | null = null;
  private generation = 0;
  constructor(
    private consent: () => boolean,
    private request: typeof fetch = (...args) => fetch(...args),
  ) {}
  async speak(text: string, options: SpeechOptions) {
    this.stop();
    if (!this.consent() || !options.enabled)
      throw new ExternalVoiceFailure("consent_required");
    const generation = this.generation;
    const abort = new AbortController();
    this.abort = abort;
    const timeout = setTimeout(() => abort.abort(), 20000);
    const headers = {
      "Content-Type": "application/json",
      "X-Frau-Helga": "voice-v1",
    };
    try {
      const session = await this.request("/api/voice/session", {
        method: "POST",
        headers,
        body: JSON.stringify({ consent: true }),
        signal: abort.signal,
        cache: "no-store",
      });
      await check(session);
      const data = await session.json();
      if (!data.enabled) throw new ExternalVoiceFailure("disabled");
      if (!data.configured) throw new ExternalVoiceFailure("configuration");
      if (typeof data.token !== "string")
        throw new ExternalVoiceFailure("authorization");
      if (!this.consent() || generation !== this.generation)
        throw new DOMException("Cancelled", "AbortError");
      const response = await this.request("/api/voice/speak", {
        method: "POST",
        headers: { ...headers, "X-Voice-Session": data.token },
        body: JSON.stringify({ text, consent: true }),
        signal: abort.signal,
        cache: "no-store",
      });
      await check(response);
      if (!response.headers.get("content-type")?.startsWith("audio/"))
        throw new ExternalVoiceFailure("unavailable");
      const blob = await response.blob();
      if (blob.size > 2_000_000) throw new ExternalVoiceFailure("unavailable");
      if (!this.consent() || generation !== this.generation)
        throw new DOMException("Cancelled", "AbortError");
      this.url = URL.createObjectURL(blob);
      this.audio = new Audio(this.url);
      this.audio.volume = options.volume / 100;
      this.audio.playbackRate = options.rate;
      this.audio.onended = () => this.release();
      await this.audio.play();
      return response.headers.get("X-Voice-Cache") === "hit"
        ? "Playing the session-cached voice clip; no repeat synthesis."
        : "Playing Frau Helga’s ElevenLabs voice. Account credits may have been used.";
    } catch (error) {
      this.release();
      if (generation !== this.generation)
        throw new DOMException("Cancelled", "AbortError");
      if (error instanceof ExternalVoiceFailure) throw error;
      if (abort.signal.aborted) throw new ExternalVoiceFailure("timeout");
      throw new ExternalVoiceFailure("offline");
    } finally {
      clearTimeout(timeout);
      if (this.abort === abort) this.abort = null;
    }
  }
  private release() {
    this.audio?.pause();
    this.audio = null;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = "";
  }
  stop() {
    this.generation++;
    this.abort?.abort();
    this.abort = null;
    this.release();
  }
  pause() {
    this.audio?.pause();
  }
  async resume() {
    try {
      await this.audio?.play();
    } catch {
      throw new ExternalVoiceFailure("unavailable");
    }
  }
  setVolume(volume: number) {
    if (this.audio) this.audio.volume = volume / 100;
  }
}
