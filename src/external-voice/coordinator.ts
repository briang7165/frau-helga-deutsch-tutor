import {
  normalizeVoiceText,
  originalVoiceTexts,
  voiceMessages,
} from "../../shared/voice-contract";
import {
  LocalSpeechOutput,
  ExternalVoiceFailure,
  type SpeechOptions,
} from "./output";
import { savedClips, type ClipStore } from "./saved";
export type OutputPreference = "helga" | "local" | "text";
export type OutputOptions = SpeechOptions & {
  preference: OutputPreference;
  muted: boolean;
  saveAudio: boolean;
};
export type SessionInfo = {
  token: string;
  enabled: boolean;
  configured: boolean;
  sessionUsed: number;
  cacheNamespace: string;
  limits: { session: number; day: number; month: number };
};
export class VoiceAPI {
  constructor(private request: typeof fetch = (...args) => fetch(...args)) {}
  async post(
    path: string,
    body: unknown,
    signal?: AbortSignal,
    token?: string,
  ) {
    const response = await this.request(`/api/voice/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Frau-Helga": "voice-v1",
        ...(token ? { "X-Voice-Session": token } : {}),
      },
      body: JSON.stringify(body),
      signal,
      cache: "no-store",
    });
    if (!response.ok) {
      let code: keyof typeof voiceMessages = "unavailable";
      try {
        const data = await response.json();
        if (Object.hasOwn(voiceMessages, data.code)) code = data.code;
      } catch {
        /* sanitized */
      }
      throw Object.assign(new ExternalVoiceFailure(code), {
        status: response.status,
      });
    }
    return response;
  }
  async session(signal?: AbortSignal): Promise<SessionInfo> {
    return (await this.post("session", { local: true }, signal)).json();
  }
  async audio(
    path: string,
    text: string,
    session: SessionInfo,
    signal: AbortSignal,
    consent = false,
  ) {
    const response = await this.post(
      path,
      { text, ...(consent ? { consent: true } : {}) },
      signal,
      session.token,
    );
    if (!response.headers.get("content-type")?.startsWith("audio/mpeg"))
      throw new ExternalVoiceFailure("unavailable");
    const reader = response.body?.getReader();
    if (!reader) throw new ExternalVoiceFailure("unavailable");
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let total = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > 2_000_000) {
          await reader.cancel();
          throw new ExternalVoiceFailure("unavailable");
        }
        chunks.push(new Uint8Array(value));
      }
    } finally {
      reader.releaseLock();
    }
    if (!total) throw new ExternalVoiceFailure("unavailable");
    return {
      audio: new Blob(chunks, { type: "audio/mpeg" }),
      cached: response.headers.get("X-Voice-Cache") === "hit",
    };
  }
}
export const voiceAPI = new VoiceAPI();
export class SpeechOutputCoordinator {
  private audio: HTMLAudioElement | null = null;
  private url = "";
  private generation = 0;
  private abort: AbortController | null = null;
  // Once a request may have reached synthesis, do not repeat it automatically
  // (even from another button) this visit. Local cache reads remain allowed.
  private uncertain = new Set<string>();
  constructor(
    private consent: () => boolean,
    private store: ClipStore = savedClips,
    private api: VoiceAPI = voiceAPI,
    private local = new LocalSpeechOutput(),
  ) {}
  stop() {
    this.generation++;
    this.abort?.abort();
    this.abort = null;
    this.audio?.pause();
    this.audio = null;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = "";
    this.local.stop();
  }
  pause() {
    if (this.abort) {
      this.stop();
      return;
    }
    this.audio?.pause();
    this.local.pause();
  }
  async resume() {
    await this.audio?.play();
    await this.local.resume();
  }
  volume(value: number) {
    if (this.abort || value === 0) {
      this.stop();
      return;
    }
    if (this.audio) this.audio.volume = value / 100;
    else this.local.setVolume();
  }
  private async play(audio: Blob, o: OutputOptions, generation: number) {
    if (generation !== this.generation)
      throw new DOMException("Cancelled", "AbortError");
    this.url = URL.createObjectURL(audio);
    this.audio = new Audio(this.url);
    this.audio.volume = o.volume / 100;
    this.audio.playbackRate = o.rate;
    this.audio.onended = () => {
      this.audio = null;
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = "";
    };
    await this.audio.play();
  }
  async speak(raw: string, o: OutputOptions) {
    this.stop();
    const generation = this.generation;
    const text = normalizeVoiceText(raw);
    if (!o.enabled || o.muted || o.volume === 0)
      return "Voice muted — lesson continues in text. No credits used.";
    if (o.preference === "text")
      return "Text-only — lesson continues in text. No credits used.";
    const fallback = async (reason: string) => {
      if (generation !== this.generation)
        return "Voice stopped. A submitted request may still consume credits.";
      try {
        return `${reason} ${await this.local.speak(text, o)}`;
      } catch {
        return `${reason} No local voice available — lesson continues in text.`;
      }
    };
    if (o.preference === "local") return fallback("");
    let saved;
    try {
      saved = await this.store.get(text);
    } catch {
      /* No storage: keep lesson usable. */
    }
    if (generation !== this.generation) return "Voice stopped.";
    if (saved) {
      try {
        await this.play(saved.audio, o, generation);
        return "Playing saved Frau Helga clip — no network, no credits.";
      } catch {
        if (generation !== this.generation) return "Voice stopped.";
        this.audio?.pause();
        this.audio = null;
        if (this.url) URL.revokeObjectURL(this.url);
        this.url = "";
        return fallback("Saved audio could not play; no paid retry.");
      }
    }
    if (!originalVoiceTexts.has(text))
      return fallback(
        "Only original standard phrases are eligible for Frau Helga audio.",
      );
    const abort = new AbortController();
    this.abort = abort;
    const timeout = setTimeout(() => abort.abort(), 18000);
    try {
      const session = await this.api.session(abort.signal);
      if (generation !== this.generation) return "Voice stopped.";
      // This request reads only private local storage, never the provider.
      let clip;
      try {
        clip = await this.api.audio("cache/read", text, session, abort.signal);
      } catch (error) {
        if (
          !(error instanceof ExternalVoiceFailure) ||
          (error as ExternalVoiceFailure & { status?: number }).status !== 404
        )
          throw error;
      }
      if (!clip) {
        if (!this.consent())
          return fallback("Live voice consent is off; no saved clip found.");
        if (!session.enabled) throw new ExternalVoiceFailure("disabled");
        if (!session.configured)
          throw new ExternalVoiceFailure("configuration");
        if (this.uncertain.has(text))
          return fallback(
            "A previous request may have consumed credits. No synthesis retry this visit; check provider usage before a new visit.",
          );
        if (generation !== this.generation || abort.signal.aborted)
          return "Voice stopped.";
        this.uncertain.add(text);
        clip = await this.api.audio("speak", text, session, abort.signal, true);
      }
      if (generation !== this.generation) return "Voice stopped.";
      let savedNote = "";
      if (o.saveAudio) {
        try {
          await this.store.put(text, session.cacheNamespace, clip.audio);
        } catch {
          savedNote = " Browser save unavailable or full.";
        }
      }
      if (generation !== this.generation) return "Voice stopped.";
      await this.play(clip.audio, o, generation);
      return (
        (clip.cached
          ? "Playing saved Frau Helga clip — no ElevenLabs request or credits."
          : "Playing Frau Helga via ElevenLabs — free credits may have been consumed. No automatic retry.") +
        savedNote
      );
    } catch (error) {
      if (generation !== this.generation) return "Voice stopped.";
      this.audio?.pause();
      this.audio = null;
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = "";
      return fallback(
        error instanceof ExternalVoiceFailure
          ? error.message
          : "Voice server offline or request/playback unavailable. No automatic retry.",
      );
    } finally {
      clearTimeout(timeout);
      if (this.abort === abort) this.abort = null;
    }
  }
}
