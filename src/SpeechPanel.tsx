import { useEffect, useId, useRef, useState } from "react";
import { browserSpeechProvider as speech } from "./providers";
import { useSettings } from "./preferences";
import { clock } from "./domain";
import { ExternalSpeechControls } from "./external-voice/controls";
export function VoiceControls({
  text,
  preview = false,
}: {
  text: string;
  preview?: boolean;
}) {
  const { settings: s, update } = useSettings();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const refresh = () => setVoices(speech.voices());
    refresh();
    if (typeof speechSynthesis !== "undefined")
      speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => {
      speech.stop();
      if (typeof speechSynthesis !== "undefined")
        speechSynthesis.removeEventListener("voiceschanged", refresh);
    };
  }, []);
  useEffect(() => {
    speech.stop();
  }, [s.voiceEnabled, s.voiceVolume, s.rate, s.voiceURI, s.allowRemote]);
  const chosen =
    voices.find((v) => v.voiceURI === s.voiceURI) ??
    (!s.voiceURI ? voices.find((v) => v.localService) : undefined);
  return (
    <div className="voice-controls">
      {!preview && (
        <ExternalSpeechControls
          text={text}
          options={{
            enabled: s.voiceEnabled,
            volume: s.voiceVolume,
            rate: s.rate,
            voiceURI: s.voiceURI,
          }}
        />
      )}
      <label>
        German voice
        <select
          aria-label="German voice"
          value={chosen?.voiceURI ?? ""}
          onChange={(e) => update({ voiceURI: e.target.value })}
        >
          <option value="">Choose a German voice</option>
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} · {v.lang} ·{" "}
              {v.localService ? "local" : "REMOTE — requires consent"}
            </option>
          ))}
        </select>
      </label>
      {!voices.length && (
        <p>
          No German voice found. Text always works. In Windows Settings → Time &
          language → Speech, install a German voice, then restart Firefox.
          Availability depends on Firefox and the operating system.
        </p>
      )}
      {s.voiceURI && !chosen && (
        <p>
          Your saved voice is unavailable on this device. Choose another voice
          or use text.
        </p>
      )}
      {chosen && !chosen.localService && (
        <p className="warning">
          Remote browser voice: text may leave this device. It is blocked unless
          you explicitly allow remote voices in Settings.
        </p>
      )}
      <button
        type="button"
        disabled={
          !chosen || !s.voiceEnabled || (!chosen.localService && !s.allowRemote)
        }
        onClick={() =>
          setNotice(
            speech.speak(text, chosen?.voiceURI ?? "", {
              allowRemote: s.allowRemote,
              volume: s.voiceVolume,
              rate: s.rate,
              enabled: s.voiceEnabled,
            })
              ? "Voice requested. If silent, try another installed voice or use text."
              : "Voice unavailable. Use the visible text.",
          )
        }
      >
        {preview ? "Preview German voice" : "Listen in German"}
      </button>
      <button type="button" onClick={() => speech.stop()}>
        Stop voice
      </button>
      {!s.voiceEnabled && <p>Spoken voice is off in Settings.</p>}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
export function MicrophoneControls() {
  const { settings, update } = useSettings();
  const id = useId();
  const [status, setStatus] = useState(
    "Ready. No transcription provider enabled. Type a manual transcript; audio is never scored.",
  );
  const [active, setActive] = useState(false);
  const [asking, setAsking] = useState(false);
  const [duration, setDuration] = useState(0);
  const [level, setLevel] = useState(0);
  const [meterOK, setMeterOK] = useState(true);
  const [clip, setClip] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [device, setDevice] = useState("");
  const [permission, setPermission] = useState("not checked");
  const r = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    context = useRef<AudioContext | null>(null),
    held = useRef(false),
    request = useRef(0),
    generation = useRef(0),
    mounted = useRef(true),
    url = useRef(""),
    animation = useRef(0),
    timer = useRef<ReturnType<typeof setInterval> | null>(null),
    audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (!settings.replayConsent) audio.current?.pause();
  }, [settings.replayConsent]);
  function clearClip() {
    audio.current?.pause();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = "";
    if (mounted.current) setClip("");
  }
  function stop(keep = false) {
    held.current = false;
    request.current++;
    if (!keep) {
      generation.current++;
      clearClip();
    }
    if (r.current && r.current.state !== "inactive")
      try {
        r.current.stop();
      } catch {
        /* failed recorder */
      }
    r.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    cancelAnimationFrame(animation.current);
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    void context.current?.close().catch(() => {});
    context.current = null;
    if (mounted.current) {
      setActive(false);
      setAsking(false);
      setLevel(0);
    }
  }
  useEffect(() => {
    mounted.current = true;
    const interrupt = () => {
      stop();
      if (mounted.current)
        setStatus(
          "Recording stopped; clip discarded. Manual transcript remains available.",
        );
    };
    const hidden = () => {
      if (document.hidden) interrupt();
    };
    window.addEventListener("blur", interrupt);
    window.addEventListener("pagehide", interrupt);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      mounted.current = false;
      stop();
      window.removeEventListener("blur", interrupt);
      window.removeEventListener("pagehide", interrupt);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  async function diagnostics() {
    try {
      if (navigator.permissions) {
        const p = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        if (mounted.current) setPermission(p.state);
      }
    } catch {
      setPermission(
        "Browser does not expose permission status; the recording request will ask.",
      );
    }
    try {
      const list = await navigator.mediaDevices?.enumerateDevices();
      if (mounted.current)
        setDevices(list?.filter((d) => d.kind === "audioinput") ?? []);
    } catch {
      setStatus(
        "Device list unavailable. The default microphone can still be requested.",
      );
    }
  }
  async function start() {
    if (held.current) return;
    stop();
    held.current = true;
    const token = ++request.current;
    const clipGeneration = ++generation.current;
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      held.current = false;
      setStatus("Microphone unavailable. Use the manual transcript below.");
      return;
    }
    setAsking(true);
    setStatus(
      "Requesting microphone access. Hold again if the permission dialog interrupts.",
    );
    try {
      const input = await navigator.mediaDevices.getUserMedia({
        audio: device ? { deviceId: { exact: device } } : true,
      });
      if (!mounted.current || request.current !== token || !held.current) {
        input.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = input;
      setPermission("granted");
      setAsking(false);
      setDuration(0);
      const started = performance.now();
      const recorder = new MediaRecorder(input);
      r.current = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size && generation.current === clipGeneration)
          chunks.push(e.data);
      };
      recorder.onstop = () => {
        if (
          mounted.current &&
          generation.current === clipGeneration &&
          chunks.length
        ) {
          clearClip();
          url.current = URL.createObjectURL(
            new Blob(chunks, { type: recorder.mimeType || "audio/webm" }),
          );
          setClip(url.current);
          setStatus(
            "Recording stopped. Clip is in memory only. No transcription provider enabled.",
          );
        }
        chunks.length = 0;
      };
      recorder.onerror = () => {
        stop();
        if (mounted.current)
          setStatus("Recording failed. Use the manual transcript below.");
      };
      recorder.start();
      setActive(true);
      setStatus(
        "Recording… release to stop. Replay is a diagnostic, not a grade.",
      );
      timer.current = setInterval(() => {
        const elapsed = performance.now() - started;
        setDuration(elapsed);
        if (elapsed >= 60000) {
          stop(true);
          setStatus("60-second diagnostic limit reached. Recording stopped.");
        }
      }, 200);
      try {
        const ctx = new AudioContext();
        context.current = ctx;
        await ctx.resume();
        if (context.current !== ctx) return;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(input).connect(analyser);
        const bytes = new Uint8Array(analyser.fftSize);
        setMeterOK(true);
        const meter = () => {
          analyser.getByteTimeDomainData(bytes);
          setLevel(
            Math.min(
              1,
              Math.sqrt(
                bytes.reduce((n, b) => n + ((b - 128) / 128) ** 2, 0) /
                  bytes.length,
              ) * 4,
            ),
          );
          animation.current = requestAnimationFrame(meter);
        };
        meter();
      } catch {
        setMeterOK(false);
      }
    } catch {
      if (mounted.current && request.current === token) {
        stop();
        setPermission("denied or unavailable");
        setStatus(
          "Microphone access denied or unavailable. Use the manual transcript below.",
        );
      }
    }
  }
  function release() {
    if (!held.current) return;
    const wasRecording = !!r.current;
    stop(true);
    setStatus(
      wasRecording
        ? "Recording stopped. Preparing a local clip; type your transcript separately."
        : "No clip recorded. Hold again after permission is granted.",
    );
  }
  return (
    <div className="microphone">
      <p>
        <strong>Microphone diagnostic</strong> · {clock(duration)} ·{" "}
        {active ? "Recording" : asking ? "Asking permission" : "Stopped"}
      </p>
      <label>
        Input level{" "}
        <meter
          min={0}
          max={1}
          value={level}
          aria-label="Microphone input level"
        />
      </label>
      {!meterOK && (
        <small>Level meter unavailable; recording may still work.</small>
      )}
      <div className="actions">
        <button
          type="button"
          className={active ? "recording" : ""}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            void start();
          }}
          onPointerUp={release}
          onPointerCancel={() => stop()}
          onLostPointerCapture={() => {
            if (held.current) release();
          }}
          onBlur={() => {
            if (held.current) stop();
          }}
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
          aria-describedby={id}
        >
          {active ? "Recording — release to stop" : "Hold to talk"}
        </button>
        <button
          type="button"
          onClick={() => {
            stop();
            setStatus("Recording cancelled. Clip discarded.");
          }}
        >
          Cancel recording
        </button>
      </div>
      <p id={id} role="status">
        {status}
      </p>
      <small>
        Hold with mouse, Space, or Enter. All tracks stop on release. Clips are
        discarded on pause, activity change, leaving the tab, or explicit
        discard.
      </small>
      {clip && (
        <div className="replay">
          <label>
            <input
              type="checkbox"
              checked={settings.replayConsent}
              onChange={(e) => update({ replayConsent: e.target.checked })}
            />
            Allow local replay of my diagnostic clips
          </label>
          <audio ref={audio} src={clip} preload="none" />
          <button
            type="button"
            disabled={!settings.replayConsent}
            onClick={() => {
              audio.current
                ?.play()
                .catch(() =>
                  setStatus(
                    "Playback unavailable. You can discard the clip and continue typing.",
                  ),
                );
            }}
          >
            Replay my last clip
          </button>
          <button
            type="button"
            onClick={() => {
              clearClip();
              setStatus("Clip discarded.");
            }}
          >
            Discard clip
          </button>
        </div>
      )}
      <details>
        <summary>Microphone permission & device</summary>
        <p>Permission: {permission}</p>
        <button type="button" onClick={() => void diagnostics()}>
          Check devices and permission
        </button>
        <label>
          Input device
          <select
            value={device}
            onChange={(e) => {
              stop();
              setDevice(e.target.value);
            }}
          >
            <option value="">System default microphone</option>
            {devices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label ||
                  `Microphone ${i + 1} (allow access to reveal label)`}
              </option>
            ))}
          </select>
        </label>
      </details>
    </div>
  );
}
