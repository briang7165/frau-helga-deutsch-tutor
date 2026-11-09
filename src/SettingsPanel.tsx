import { useState } from "react";
import { useSettings, validateSettings } from "./preferences";
import { decodeState } from "./persistence";
import type { State } from "./domain";
import { VoiceControls, MicrophoneControls } from "./SpeechControls";
import { sounds } from "./sounds";
import { ExternalVoiceSettings } from "./external-voice/controls";
export function SettingsPanel({
  state,
  onImport,
  onDelete,
}: {
  state: State;
  onImport: (s: State) => boolean;
  onDelete: () => void;
}) {
  const { settings: s, update, reset, settingsWarning } = useSettings();
  const [notice, setNotice] = useState("");
  function download() {
    const safe = decodeState(JSON.stringify(state));
    const blob = new Blob(
      [
        JSON.stringify(
          { version: 1, settings: validateSettings(s), progress: safe },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "frau-helga-local-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      "Exported structured outcomes and settings only. Keep your progress backup private.",
    );
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw Error("File is too large");
      const raw = JSON.parse(await file.text());
      if (raw.version !== 1) throw Error("Unsupported backup version");
      const progress = decodeState(JSON.stringify(raw.progress));
      const settings = validateSettings(raw.settings);
      if (
        !window.confirm(
          "Import this validated backup? Existing lessons are merged by ID; existing records win conflicts. Settings will be replaced.",
        )
      )
        return;
      const ids = new Set(state.history.map((h) => h.id));
      const merged = {
        ...state,
        history: [
          ...state.history,
          ...progress.history.filter((h) => !ids.has(h.id)),
        ].sort(
          (a, b) => Date.parse(a.completedAt!) - Date.parse(b.completedAt!),
        ),
        current: state.current ?? progress.current,
      };
      if (!onImport(merged))
        throw Error(
          "Browser storage refused the import; existing data is unchanged",
        );
      update(settings);
      setNotice("Backup imported. Existing progress was preserved.");
    } catch (error) {
      setNotice(
        `Import rejected: ${error instanceof Error ? error.message : "Invalid file"}`,
      );
    }
  }
  return (
    <section className="card settings">
      <ExternalVoiceSettings
        options={{
          enabled: s.voiceEnabled,
          volume: s.voiceVolume,
          rate: s.rate,
          voiceURI: s.voiceURI,
        }}
      />
      <h2>Settings</h2>
      <p>Changes apply immediately and stay on this device.</p>
      {settingsWarning && <p role="alert">{settingsWarning}</p>}
      <fieldset>
        <legend>Sound</legend>
        <label>
          <input
            type="checkbox"
            checked={s.sfx}
            onChange={(e) => update({ sfx: e.target.checked })}
          />
          Enable sound effects (off by default)
        </label>
        <label>
          <input
            type="checkbox"
            checked={s.muted}
            onChange={(e) => update({ muted: e.target.checked })}
          />
          Mute sound effects
        </label>
        <label>
          Sound effects volume: {s.sfxVolume}%
          <input
            type="range"
            min="0"
            max="100"
            value={s.sfxVolume}
            onChange={(e) => update({ sfxVolume: +e.target.value })}
          />
        </label>
        <button onClick={() => void sounds.play("success", s)}>
          Test sound
        </button>
        <label>
          <input
            type="checkbox"
            checked={s.voiceEnabled}
            onChange={(e) => update({ voiceEnabled: e.target.checked })}
          />
          Enable spoken voice
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
      </fieldset>
      <fieldset>
        <legend>Voice & microphone</legend>
        <p>
          Local German voices are preferred. Remote browser voices may send
          spoken text to the browser vendor; no external voice is enabled
          automatically.
        </p>
        <label>
          <input
            type="checkbox"
            checked={s.allowRemote}
            onChange={(e) => {
              if (
                !e.target.checked ||
                window.confirm(
                  "Allow explicitly selected remote browser voices to process spoken text outside this device?",
                )
              )
                update({ allowRemote: e.target.checked });
            }}
          />
          Allow selected remote browser voices
        </label>
        <VoiceControls
          text="Guten Tag. Wir lernen Schritt für Schritt."
          preview
        />
        <MicrophoneControls />
      </fieldset>
      <fieldset>
        <legend>Learning</legend>
        <label>
          Daily target (minutes)
          <input
            type="number"
            min="5"
            max="90"
            value={s.targetMinutes}
            onChange={(e) => {
              const n = +e.target.value;
              if (Number.isInteger(n) && n >= 5 && n <= 90)
                update({ targetMinutes: n });
            }}
          />
        </label>
        <p>
          Difficulty: A2 self-assessed. Explanation language: English. Other
          levels and explanation languages need future lesson content.
        </p>
        <label>
          Correction detail
          <select
            value={s.detail}
            onChange={(e) =>
              update({ detail: e.target.value as "brief" | "detailed" })
            }
          >
            <option value="brief">Brief</option>
            <option value="detailed">Detailed rubric</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={s.helpOpen}
            onChange={(e) => update({ helpOpen: e.target.checked })}
          />
          Keep word lookup open in new activities
        </label>
        <label>
          Open section review every N activities
          <select
            value={s.reviewEvery}
            onChange={(e) => update({ reviewEvery: +e.target.value })}
          >
            {[1, 2, 3, 6].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={s.assessmentEnabled}
            onChange={(e) => update({ assessmentEnabled: e.target.checked })}
          />
          Show progress-check reminder
        </label>
        <label>
          Assessment after calendar days
          <input
            type="number"
            min="1"
            max="30"
            value={s.assessmentDays}
            onChange={(e) => {
              const n = +e.target.value;
              if (Number.isInteger(n) && n >= 1 && n <= 30)
                update({ assessmentDays: n });
            }}
          />
        </label>
        <label>
          Or completed lessons
          <input
            type="number"
            min="1"
            max="20"
            value={s.assessmentLessons}
            onChange={(e) => {
              const n = +e.target.value;
              if (Number.isInteger(n) && n >= 1 && n <= 20)
                update({ assessmentLessons: n });
            }}
          />
        </label>
        <p>
          Whichever comes first. Only an in-app banner; no notifications or
          forced interruptions.
        </p>
      </fieldset>
      <fieldset>
        <legend>Display & accessibility</legend>
        <label>
          Text size: {s.textSize}%
          <input
            type="range"
            min="90"
            max="140"
            step="10"
            value={s.textSize}
            onChange={(e) => update({ textSize: +e.target.value })}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={s.reducedMotion}
            onChange={(e) => update({ reducedMotion: e.target.checked })}
          />
          Reduce motion
        </label>
        <label>
          <input
            type="checkbox"
            checked={s.highContrast}
            onChange={(e) => update({ highContrast: e.target.checked })}
          />
          High contrast
        </label>
        <details>
          <summary>Keyboard help</summary>
          <p>
            Tab moves through controls. Enter checks an answer when its button
            is focused. Space/Enter held on the microphone records; release
            stops. Escape closes word help. All word lookup features have a
            typed-input alternative.
          </p>
        </details>
      </fieldset>
      <fieldset>
        <legend>Spelling</legend>
        <label>
          <input
            type="checkbox"
            checked={s.germanSpellcheck}
            onChange={(e) => update({ germanSpellcheck: e.target.checked })}
          />
          German answer spellcheck
        </label>
        <label>
          <input
            type="checkbox"
            checked={s.englishSpellcheck}
            onChange={(e) => update({ englishSpellcheck: e.target.checked })}
          />
          English answer/help spellcheck
        </label>
        <p>
          Firefox needs an installed German dictionary. Setting lang="de-DE"
          cannot install one. In Firefox, right-click an answer field →
          Languages → Add Dictionaries. Select German, or turn this switch off
          to avoid English red squiggles. Instructions are read-only English
          text.
        </p>
      </fieldset>
      <fieldset>
        <legend>Data & privacy</legend>
        <p>
          {state.history.length} completed sessions;{" "}
          {state.current?.attempts.length ?? 0} current attempt outcomes. No raw
          responses, recordings, credentials, or recipient addresses are stored.
          M1 data is retained until you explicitly delete progress.
        </p>
        <button onClick={download}>Export settings and progress</button>
        <label>
          Import local backup
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => void upload(e.target.files?.[0])}
          />
        </label>
        <button onClick={onDelete}>Delete progress</button>
        <button
          onClick={() => {
            if (
              window.confirm(
                "Restore default settings? Your progress will be kept.",
              )
            ) {
              reset();
              setNotice("Default settings restored. Progress preserved.");
            }
          }}
        >
          Restore defaults
        </button>
      </fieldset>
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
