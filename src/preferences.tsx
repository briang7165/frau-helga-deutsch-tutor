import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
export type Settings = {
  version: 1;
  sfx: boolean;
  muted: boolean;
  sfxVolume: number;
  voiceEnabled: boolean;
  voiceVolume: number;
  rate: number;
  voiceURI: string;
  allowRemote: boolean;
  targetMinutes: number;
  difficulty: "A2";
  explanationLanguage: "English";
  detail: "brief" | "detailed";
  helpOpen: boolean;
  reviewEvery: number;
  assessmentDays: number;
  assessmentLessons: number;
  assessmentEnabled: boolean;
  textSize: number;
  reducedMotion: boolean;
  highContrast: boolean;
  germanSpellcheck: boolean;
  englishSpellcheck: boolean;
  replayConsent: boolean;
};
export const settingsKey = "frau-helga-settings-v1";
export const defaults: Settings = {
  version: 1,
  sfx: false,
  muted: true,
  sfxVolume: 20,
  voiceEnabled: true,
  voiceVolume: 70,
  rate: 0.85,
  voiceURI: "",
  allowRemote: false,
  targetMinutes: 30,
  difficulty: "A2",
  explanationLanguage: "English",
  detail: "detailed",
  helpOpen: false,
  reviewEvery: 1,
  assessmentDays: 7,
  assessmentLessons: 5,
  assessmentEnabled: true,
  textSize: 100,
  reducedMotion: false,
  highContrast: false,
  germanSpellcheck: true,
  englishSpellcheck: true,
  replayConsent: false,
};
export function validateSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== "object")
    throw Error("Settings must be an object");
  const x = raw as Record<string, unknown>;
  const s = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof Settings)[]) {
    if (!(key in x)) continue;
    const v = x[key];
    if (typeof v !== typeof defaults[key]) throw Error(`Invalid ${key}`);
    Object.assign(s, { [key]: v });
  }
  for (const [key, min, max] of [
    ["sfxVolume", 0, 100],
    ["voiceVolume", 0, 100],
    ["rate", 0.5, 1.5],
    ["targetMinutes", 5, 90],
    ["reviewEvery", 1, 6],
    ["assessmentDays", 1, 30],
    ["assessmentLessons", 1, 20],
    ["textSize", 90, 140],
  ] as const)
    if (!Number.isFinite(s[key]) || s[key] < min || s[key] > max)
      throw Error(`Invalid ${key}`);
  for (const key of [
    "targetMinutes",
    "reviewEvery",
    "assessmentDays",
    "assessmentLessons",
  ] as const)
    if (!Number.isInteger(s[key])) throw Error(`Invalid ${key}`);
  if (
    s.version !== 1 ||
    s.difficulty !== "A2" ||
    s.explanationLanguage !== "English" ||
    !["brief", "detailed"].includes(s.detail) ||
    s.voiceURI.length > 500
  )
    throw Error("Unsupported settings");
  return s;
}
type Context = {
  settings: Settings;
  update: (s: Partial<Settings>) => void;
  reset: () => void;
  settingsWarning: string;
};
const SettingsContext = createContext<Context>(null!);
export const useSettings = () => useContext(SettingsContext);
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(settingsKey);
      return {
        value: raw ? validateSettings(JSON.parse(raw)) : { ...defaults },
        warning: "",
      };
    } catch {
      return {
        value: { ...defaults },
        warning:
          "Settings could not be loaded. Defaults are active; saved data is untouched until you change or restore settings.",
      };
    }
  });
  const [settings, setSettings] = useState(initial.value);
  const [settingsWarning, warn] = useState(initial.warning);
  function update(patch: Partial<Settings>) {
    const next = validateSettings({ ...settings, ...patch });
    try {
      localStorage.setItem(settingsKey, JSON.stringify(next));
      warn("");
    } catch {
      warn("Settings work for this visit but cannot be saved.");
    }
    setSettings(next);
  }
  useEffect(() => {
    document.documentElement.dataset.motion = settings.reducedMotion
      ? "reduced"
      : "system";
    document.documentElement.dataset.contrast = settings.highContrast
      ? "high"
      : "normal";
    document.documentElement.style.fontSize = `${settings.textSize}%`;
    return () => {};
  }, [settings]);
  return (
    <SettingsContext.Provider
      value={{
        settings,
        update,
        reset: () => update({ ...defaults }),
        settingsWarning,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
