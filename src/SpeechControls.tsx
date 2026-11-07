import { useEffect, useRef, useState } from "react";
import { browserSpeechProvider as speech } from "./providers";
export function VoiceControls({ text }: { text: string }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const update = () => {
      const list = speech.voices();
      setVoices(list);
      setVoice((old) =>
        list.some((v) => v.voiceURI === old) ? old : (list[0]?.voiceURI ?? ""),
      );
    };
    update();
    if (typeof speechSynthesis !== "undefined")
      speechSynthesis.addEventListener("voiceschanged", update);
    return () => {
      speech.stop();
      if (typeof speechSynthesis !== "undefined")
        speechSynthesis.removeEventListener("voiceschanged", update);
    };
  }, []);
  return (
    <div className="voice-controls">
      {voices.length ? (
        <>
          <label>
            German voice
            <select value={voice} onChange={(e) => setVoice(e.target.value)}>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() =>
              setNotice(
                speech.speak(text, voice)
                  ? "Playing with an installed German voice."
                  : "Speech is unavailable. Please use the text.",
              )
            }
          >
            Listen in German
          </button>
          <button type="button" onClick={() => speech.stop()}>
            Stop voice
          </button>
        </>
      ) : (
        <p>
          No installed offline de-DE voice found. Read the text below instead.
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
export function MicrophoneControls() {
  const [status, setStatus] = useState(
    "Audio stays in memory and is discarded. M1 does not transcribe or grade pronunciation.",
  );
  const [active, setActive] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const held = useRef(false);
  const request = useRef(0);
  const mounted = useRef(true);
  function stop() {
    held.current = false;
    request.current++;
    if (recorder.current && recorder.current.state !== "inactive")
      recorder.current.stop();
    recorder.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (mounted.current) setActive(false);
  }
  useEffect(() => {
    mounted.current = true;
    const interrupt = () => {
      stop();
      if (mounted.current)
        setStatus("Recording stopped. Enter a manual transcript below.");
    };
    window.addEventListener("blur", interrupt);
    document.addEventListener("visibilitychange", interrupt);
    return () => {
      mounted.current = false;
      stop();
      window.removeEventListener("blur", interrupt);
      document.removeEventListener("visibilitychange", interrupt);
    };
  }, []);
  async function start() {
    if (held.current) return;
    held.current = true;
    const token = ++request.current;
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      held.current = false;
      setStatus("Microphone unavailable. Use the manual transcript below.");
      return;
    }
    setStatus(
      "Requesting microphone access. Keep holding to record after permission is granted.",
    );
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || token !== request.current || !held.current) {
        input.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = input;
      const recording = new MediaRecorder(input);
      recorder.current = recording;
      recording.onerror = () => {
        stop();
        if (mounted.current)
          setStatus("Recording failed. Use the manual transcript below.");
      };
      // No data is uploaded, persisted, or retained after stop.
      recording.start();
      setActive(true);
      setStatus(
        "Recording… release to discard audio, then enter your manual transcript.",
      );
    } catch {
      if (mounted.current && token === request.current) {
        stop();
        setStatus(
          "Microphone access denied or unavailable. Use the manual transcript below.",
        );
      }
    }
  }
  function release() {
    stop();
    setStatus("Audio discarded. Enter your manual transcript below.");
  }
  return (
    <div className="microphone">
      <div className="actions">
        <button
          type="button"
          className={active ? "recording" : ""}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            void start();
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              void start();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              release();
            }
          }}
          aria-describedby="mic-status"
        >
          {active ? "Recording — release to stop" : "Hold to talk"}
        </button>
        <button
          type="button"
          onClick={() => {
            stop();
            setStatus("Recording cancelled. Audio discarded.");
          }}
        >
          Cancel recording
        </button>
      </div>
      <p id="mic-status" role="status">
        {status}
      </p>
      <small>
        Hold with your mouse, Space, or Enter. If the permission prompt
        interrupts recording, hold again after allowing access.
      </small>
    </div>
  );
}
