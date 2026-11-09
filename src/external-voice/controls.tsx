import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { VOICE_LIMITS, VOICE_TEST_TEXT } from "../../shared/voice-contract";
import {
  ElevenLabsSpeechOutput,
  LocalSpeechOutput,
  type SpeechOptions,
} from "./output";
// Deliberately memory-only: reload requires new consent, without changing M1.1 settings schema.
let enabled = false;
const listeners = new Set<() => void>();
function setEnabled(value: boolean) {
  enabled = value;
  listeners.forEach((l) => l());
}
function useExternalEnabled() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => enabled,
  );
}
export function ExternalVoiceSettings({ options }: { options: SpeechOptions }) {
  const on = useExternalEnabled();
  return (
    <fieldset>
      <legend>Optional ElevenLabs voice</legend>
      <p>
        Off by default. Enabling permits original lesson sentences to be sent to
        ElevenLabs when you press its voice button. This uses account credits.
        Audio and text may be retained by the provider under its account policy;
        local-only storage is not a promise of provider zero retention.
      </p>
      <label>
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Enable ElevenLabs for this visit — I consent to sending lesson text and
        using available free credits
      </label>
      <p>
        Maximum {VOICE_LIMITS.request} characters/request,{" "}
        {VOICE_LIMITS.session}/server session, {VOICE_LIMITS.day}/UTC day,{" "}
        {VOICE_LIMITS.month}/month; {VOICE_LIMITS.perMinute} requests/minute.
        Server checks may impose stricter limits. These app limits are not a
        provider billing cap.
      </p>
      <ExternalSpeechControls text={VOICE_TEST_TEXT} options={options} test />
      <p>
        Requires the local voice server and private credentials. A voice ID
        alone is insufficient. No transcription or pronunciation grading is
        added.
      </p>
    </fieldset>
  );
}
export function ExternalSpeechControls({
  text,
  options,
  test = false,
}: {
  text: string;
  options: SpeechOptions;
  test?: boolean;
}) {
  const on = useExternalEnabled();
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const external = useRef<ElevenLabsSpeechOutput | null>(null);
  const fallback = useRef<LocalSpeechOutput | null>(null);
  external.current ??= new ElevenLabsSpeechOutput(() => enabled);
  fallback.current ??= new LocalSpeechOutput();
  const ticket = useRef(0);
  function stop() {
    ticket.current++;
    external.current?.stop();
    fallback.current?.stop();
    setLoading(false);
    setPaused(false);
  }
  useEffect(() => {
    if (!on || !options.enabled) stop();
  }, [on, options.enabled]);
  useEffect(() => {
    external.current?.setVolume(options.volume);
  }, [options.volume]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      ticket.current++;
      external.current?.stop();
      fallback.current?.stop();
      window.removeEventListener("pagehide", stop);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [text]);
  async function speak() {
    stop();
    const current = ++ticket.current;
    setLoading(true);
    setNotice("Requesting voice from the local server…");
    try {
      const message = await external.current!.speak(text, options);
      if (ticket.current === current) setNotice(message);
    } catch (error) {
      if (ticket.current !== current) return;
      const reason =
        error instanceof Error ? error.message : "Voice unavailable.";
      const local = await fallback.current!.speak(text, options);
      if (ticket.current === current) setNotice(`${reason} ${local}`);
    } finally {
      if (ticket.current === current) setLoading(false);
    }
  }
  if (!on && !test) return null;
  return (
    <div className="voice-controls">
      <button
        type="button"
        disabled={!on || !options.enabled || loading}
        onClick={() => void speak()}
      >
        {test
          ? "Test Frau Helga's voice"
          : "Speak with Frau Helga (ElevenLabs)"}
      </button>
      <button
        type="button"
        onClick={() => {
          stop();
          setNotice(
            "Voice stopped. A request already accepted by ElevenLabs may still consume credits.",
          );
        }}
      >
        Stop custom voice
      </button>
      <button
        type="button"
        disabled={!on || loading}
        onClick={() => {
          if (paused) {
            void external.current
              ?.resume()
              .catch(() =>
                setNotice("Playback unavailable. Use local speech or text."),
              );
            void fallback.current?.resume();
          } else {
            external.current?.pause();
            fallback.current?.pause();
          }
          setPaused(!paused);
        }}
      >
        {paused ? "Resume custom voice" : "Pause custom voice"}
      </button>
      {test && !on && (
        <p>
          External voice is off. No request is made until you enable it and
          press Test.
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
