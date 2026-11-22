import { useEffect, useState } from "react";
import { useSettings } from "./preferences";
import { browserSpeechProvider } from "./providers";
import { sounds } from "./sounds";
export function AudioSetup({ onSettings }: { onSettings: () => void }) {
  const { settings, update } = useSettings();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const refresh = () =>
      setVoices(browserSpeechProvider.voices().filter((v) => v.localService));
    refresh();
    if (typeof speechSynthesis === "undefined") return;
    speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, []);
  return (
    <details className="audio-setup">
      <summary>Audio setup check · sounds, voice & microphone</summary>
      <p>
        Sound effects:{" "}
        {typeof AudioContext === "undefined"
          ? "Unavailable"
          : settings.sfx && !settings.muted
            ? "Available"
            : "Off"}
        .
      </p>
      <button
        onClick={() => {
          update({ sfx: true, muted: false });
          setNotice("Sounds enabled. Press Test speaker to check your output.");
        }}
      >
        Enable gentle sounds
      </button>{" "}
      <button
        onClick={async () =>
          setNotice(
            (await sounds.play("success", settings))
              ? "Speaker tone played; check your device volume."
              : "Sound is off, unavailable or suspended. Enable sounds, then click Test speaker to resume audio.",
          )
        }
      >
        Test speaker
      </button>
      <p>
        Voice output:{" "}
        {!voices.length
          ? "Unavailable — No German voice found"
          : !settings.voiceEnabled
            ? "Off"
            : "Available — select a local voice in Settings"}
        . Text always works.
      </p>
      <p>
        Microphone input:{" "}
        {typeof navigator.mediaDevices?.getUserMedia === "function" &&
        typeof MediaRecorder !== "undefined"
          ? "Available — permission required"
          : "Unavailable"}
        . Recording is a local diagnostic.
      </p>
      <p>
        Speech recognition: Not connected. No automatic transcription or
        pronunciation grading.
      </p>
      <button onClick={onSettings}>Open voice & microphone settings</button>
      {notice && <p role="status">{notice}</p>}
    </details>
  );
}
