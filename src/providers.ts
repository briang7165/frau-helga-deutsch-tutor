import {
  activities,
  emptyState,
  grade,
  report,
  type Activity,
  type Attempt,
  type Session,
  type State,
} from "./domain";
export interface LessonProvider {
  getActivities(): Activity[];
  evaluate(activity: Activity, answer: string): Attempt;
}
export interface TranscriptionProvider {
  transcribe(
    audio: Blob | null,
    manualText: string,
  ): Promise<{ text: string; source: "manual"; notice: string }>;
}
export interface SpeechProvider {
  voices(): SpeechSynthesisVoice[];
  speak(text: string, voiceURI: string): boolean;
  stop(): void;
}
export interface ProgressRepository {
  load(): State;
  save(state: State): boolean;
  clear(): boolean;
}
export interface ReportDispatcher {
  preview(session: Session): ReturnType<typeof report>;
}
export const mockLessonProvider: LessonProvider = {
  getActivities: () => activities,
  evaluate: grade,
};
export const mockTranscriptionProvider: TranscriptionProvider = {
  transcribe: async (_audio, manualText) => ({
    text: manualText,
    source: "manual",
    notice: "Manual transcript only. Audio was not analyzed.",
  }),
};
export const mockReportDispatcher: ReportDispatcher = { preview: report };
export const storageKey = "frau-helga-m1-v1";
function validSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;
  const s = value as Session;
  return (
    typeof s.id === "string" &&
    Number.isInteger(s.index) &&
    s.index >= 0 &&
    s.index < activities.length &&
    Number.isFinite(s.elapsedMs) &&
    s.elapsedMs >= 0 &&
    (!s.completedAt ||
      (typeof s.completedAt === "string" &&
        Number.isFinite(Date.parse(s.completedAt)))) &&
    Array.isArray(s.attempts) &&
    s.attempts.length <= 1000 &&
    s.attempts.every(
      (t) =>
        t &&
        activities.some((a) => a.id === t.activityId) &&
        ["correct", "minor", "major", "unrecognized", "skipped"].includes(
          t.kind,
        ) &&
        t.score ===
          { correct: 100, minor: 90, major: 0, unrecognized: 0, skipped: 0 }[
            t.kind
          ],
    )
  );
}
export function parseState(raw: string | null): State {
  if (!raw) return emptyState();
  try {
    const value = JSON.parse(raw) as State;
    if (
      value.version !== 1 ||
      !(value.current === null || validSession(value.current)) ||
      !Array.isArray(value.history) ||
      !value.history.every((s) => validSession(s) && !!s.completedAt)
    )
      return emptyState();
    return value;
  } catch {
    return emptyState();
  }
}
export const localProgressRepository: ProgressRepository = {
  load() {
    try {
      return parseState(localStorage.getItem(storageKey));
    } catch {
      return emptyState();
    }
  },
  save(state) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  },
  clear() {
    try {
      localStorage.removeItem(storageKey);
      return true;
    } catch {
      return false;
    }
  },
};
export const browserSpeechProvider: SpeechProvider = {
  voices: () =>
    typeof speechSynthesis === "undefined"
      ? []
      : speechSynthesis
          .getVoices()
          .filter((v) => /^de[-_]DE$/i.test(v.lang) && v.localService),
  speak(text, voiceURI) {
    const voice = this.voices().find((v) => v.voiceURI === voiceURI);
    if (!voice || typeof SpeechSynthesisUtterance === "undefined") return false;
    this.stop();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = "de-DE";
    utterance.rate = 0.85;
    speechSynthesis.speak(utterance);
    return true;
  },
  stop() {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  },
};
