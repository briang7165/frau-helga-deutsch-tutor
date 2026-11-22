import { useEffect, useState, useSyncExternalStore } from "react";
import { useSettings } from "../preferences";
import { VOICE_TEST_TEXT } from "../../shared/voice-contract";
import {
  SpeechOutputCoordinator,
  voiceAPI,
  type OutputOptions,
  type SessionInfo,
} from "./coordinator";
import { savedClips } from "./saved";
let consent = false;
const listeners = new Set<() => void>();
export const speechOutput = new SpeechOutputCoordinator(() => consent);
function useConsent() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => consent,
  );
}
function changeConsent(value: boolean) {
  consent = value;
  speechOutput.stop();
  listeners.forEach((l) => l());
}
function useOutputOptions(): OutputOptions {
  const { settings: s } = useSettings();
  return {
    enabled: s.voiceEnabled,
    volume: s.voiceVolume,
    rate: s.rate,
    voiceURI: s.voiceURI,
    preference: s.voiceProvider,
    muted: s.voiceMuted,
    saveAudio: s.saveLessonAudio,
  };
}
export function VoicePlayback({
  text,
  test = false,
}: {
  text: string;
  test?: boolean;
}) {
  const options = useOutputOptions();
  const on = useConsent();
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    speechOutput.stop();
    setLoading(false);
    setPaused(false);
  }, [
    options.enabled,
    options.muted,
    options.preference,
    options.voiceURI,
    options.rate,
    on,
  ]);
  useEffect(() => speechOutput.volume(options.volume), [options.volume]);
  useEffect(() => {
    const stop = () => {
      speechOutput.stop();
      setLoading(false);
      setPaused(false);
    };
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      speechOutput.stop();
      window.removeEventListener("pagehide", stop);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [text]);
  return (
    <div className="voice-controls">
      {(typeof speechSynthesis === "undefined" ||
        !speechSynthesis
          .getVoices()
          .some((v) => v.localService && /^de(?:[-_]|$)/i.test(v.lang))) && (
        <p>
          No German voice found locally. Saved Frau Helga audio or text still
          works.
        </p>
      )}
      <button
        type="button"
        disabled={
          !options.enabled || options.muted || options.volume === 0 || loading
        }
        onClick={async () => {
          setLoading(true);
          setPaused(false);
          setStatus("Checking saved audio…");
          try {
            setStatus(await speechOutput.speak(text, options));
          } finally {
            setLoading(false);
          }
        }}
      >
        {test ? "Test Frau Helga's voice" : "Listen in German"}
      </button>
      <button
        type="button"
        onClick={() => {
          speechOutput.stop();
          setLoading(false);
          setPaused(false);
          setStatus(
            "Voice stopped. Submitted synthesis may still consume credits; no retry was made.",
          );
        }}
      >
        Stop voice
      </button>
      <button
        type="button"
        disabled={!options.enabled || options.muted}
        onClick={async () => {
          if (paused) {
            try {
              await speechOutput.resume();
            } catch {
              setStatus("Playback unavailable; use text.");
            }
          } else speechOutput.pause();
          setPaused(!paused);
        }}
      >
        {paused ? "Resume voice" : "Pause voice"}
      </button>
      {status && <p role="status">{status}</p>}
    </div>
  );
}
export function ExternalVoiceSettings() {
  const { settings: s, update } = useSettings();
  const on = useConsent();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [info, setInfo] = useState({ count: 0, bytes: 0 });
  const [server, setServer] = useState<SessionInfo | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const refresh = () =>
      setVoices(
        typeof speechSynthesis === "undefined"
          ? []
          : speechSynthesis
              .getVoices()
              .filter((v) => /^de(?:[-_]|$)/i.test(v.lang) && v.localService),
      );
    refresh();
    if (typeof speechSynthesis !== "undefined")
      speechSynthesis.addEventListener("voiceschanged", refresh);
    const refreshCache = () => {
      void savedClips
        .info()
        .then(setInfo)
        .catch(() =>
          setNotice(
            "Browser audio storage unavailable. Local voice/text still work.",
          ),
        );
    };
    refreshCache();
    window.addEventListener("frau-helga-cache-changed", refreshCache);
    return () => {
      window.removeEventListener("frau-helga-cache-changed", refreshCache);
      if (typeof speechSynthesis !== "undefined")
        speechSynthesis.removeEventListener("voiceschanged", refresh);
    };
  }, []);
  async function manage(action: "refresh" | "download" | "clear") {
    if (
      action === "clear" &&
      !window.confirm(
        "Clear app-managed saved Frau Helga audio in this browser and the connected private server? Learner progress, recordings, unknown files and quota counters are preserved.",
      )
    )
      return;
    speechOutput.stop();
    setBusy(true);
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 20000);
    let localCleared = false;
    try {
      if (action === "clear") {
        await savedClips.clear();
        localCleared = true;
      }
      const session = await voiceAPI.session(abort.signal);
      setServer(session);
      const response = await voiceAPI.post(
        action === "clear" ? "cache/clear" : "cache/info",
        action === "clear" ? { confirm: true } : {},
        abort.signal,
        session.token,
      );
      const data = (await response.json()) as {
        count: number;
        bytes: number;
        texts: string[];
        namespace: string;
      };
      if (action === "download") {
        if (!s.saveLessonAudio) throw Error("Saving is off");
        await savedClips.select(data.namespace);
        for (const text of data.texts) {
          const clip = await voiceAPI.audio(
            "cache/read",
            text,
            session,
            abort.signal,
          );
          await savedClips.put(text, data.namespace, clip.audio);
        }
      }
      setNotice(
        `${action === "clear" ? "Managed saved audio cleared. " : action === "download" ? "Saved standard lesson clips downloaded; no synthesis. " : ""}Private server: ${data.count} clips, ${(data.bytes / 1_000_000).toFixed(2)} MB. Live account credits are not queried by this check.`,
      );
    } catch {
      setNotice(
        `${localCleared ? "Browser saved audio cleared. " : ""}Private cache/server unavailable or storage blocked. Other existing files are unchanged. No live request was made.`,
      );
    } finally {
      clearTimeout(timer);
      setBusy(false);
      try {
        setInfo(await savedClips.info());
      } catch {}
    }
  }
  return (
    <fieldset className="audio-voice-settings">
      <legend>Audio & Voice</legend>
      <label>
        Preferred speaker
        <select
          value={s.voiceProvider}
          onChange={(e) =>
            update({ voiceProvider: e.target.value as typeof s.voiceProvider })
          }
        >
          <option value="helga">
            Frau Helga — saved → consented ElevenLabs → local → text
          </option>
          <option value="local">Installed German — local only</option>
          <option value="text">Text only</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={s.voiceEnabled}
          onChange={(e) => update({ voiceEnabled: e.target.checked })}
        />
        Enable spoken voice
      </label>
      <label>
        <input
          type="checkbox"
          checked={s.voiceMuted}
          onChange={(e) => update({ voiceMuted: e.target.checked })}
        />
        Mute voice
      </label>
      <label>
        Voice volume: {s.voiceVolume}%
        <input
          type="range"
          min="0"
          max="100"
          value={s.voiceVolume}
          onChange={(e) => update({ voiceVolume: +e.target.value })}
        />
      </label>
      <label>
        Speaking rate: {s.rate}
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.05"
          value={s.rate}
          onChange={(e) => update({ rate: +e.target.value })}
        />
      </label>
      <label>
        German voice
        <select
          aria-label="German voice"
          value={s.voiceURI}
          onChange={(e) => update({ voiceURI: e.target.value })}
        >
          <option value="">Automatic installed German voice</option>
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} · {v.lang} · local
            </option>
          ))}
        </select>
      </label>
      {!voices.length && (
        <p>
          No German voice found. Text always works. Install a German voice in
          Windows Settings → Time & language → Speech, then restart Firefox.
          Remote browser voices are never used.
        </p>
      )}
      {s.voiceURI && !voices.some((v) => v.voiceURI === s.voiceURI) && (
        <p>
          The saved voice is unavailable or not local. Choose an installed
          German voice; otherwise use text.
        </p>
      )}
      <label>
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => changeConsent(e.target.checked)}
        />
        Enable ElevenLabs for this visit — I consent to sending original lesson
        text and using free credits when I press a voice button
      </label>
      <p>
        Live synthesis is off by default and separately gated on the server.
        Saving/replaying clips uses no credits. Text sent to ElevenLabs is
        subject to its retention policy. Microphone audio is never sent.
      </p>
      <label>
        <input
          type="checkbox"
          checked={s.saveLessonAudio}
          onChange={(e) => update({ saveLessonAudio: e.target.checked })}
        />
        Save permitted original lesson audio in this browser (never learner
        recordings)
      </label>
      <p>
        Server reuse also requires the owner's private licensing/reuse switch.
        Browser saved clips use the last downloaded voice library when offline;
        refresh/download after changing the private server voice.
      </p>
      <VoicePlayback text={VOICE_TEST_TEXT} test />
      <p>
        Stored Frau Helga audio in browser: {info.count} clips,{" "}
        {(info.bytes / 1_000_000).toFixed(2)} MB (50 MB maximum).
      </p>
      <button disabled={busy} onClick={() => void manage("refresh")}>
        Refresh saved audio & credit status
      </button>{" "}
      <button
        disabled={busy || !s.saveLessonAudio}
        onClick={() => void manage("download")}
      >
        Download standard lesson clips
      </button>{" "}
      <button disabled={busy} onClick={() => void manage("clear")}>
        Clear saved audio
      </button>
      <p>
        {server
          ? `Live server: ${server.enabled ? "enabled" : "disabled"}; key/config: ${server.configured ? "present" : "missing"}; reserved this server session: ${server.sessionUsed}/${server.limits.session} characters. Daily cap ${server.limits.day}; monthly cap ${server.limits.month}. Account credits are unverified until an authorized synthesis preflight.`
          : "Credit status: not checked. No provider request on load. App caps are not provider billing caps."}
      </p>
      {notice && <p role="status">{notice}</p>}
    </fieldset>
  );
}
