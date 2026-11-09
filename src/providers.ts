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
  evaluate(activity: Activity, answer: string, assisted?: boolean): Attempt;
}
export interface TranscriptionProvider {
  transcribe(
    audio: Blob | null,
    manualText: string,
  ): Promise<{ text: string; source: "manual"; notice: string }>;
}
export interface SpeechProvider {
  voices(): SpeechSynthesisVoice[];
  speak(
    text: string,
    voiceURI: string,
    options?: {
      allowRemote: boolean;
      volume: number;
      rate: number;
      enabled: boolean;
    },
  ): boolean;
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
export { storageKey, parseState, localProgressRepository } from "./persistence";
export const browserSpeechProvider: SpeechProvider = {
  voices: () =>
    typeof speechSynthesis === "undefined"
      ? []
      : speechSynthesis
          .getVoices()
          .filter((v) => /^de(?:[-_]|$)/i.test(v.lang)),
  speak(
    text,
    voiceURI,
    options = { allowRemote: false, volume: 70, rate: 0.85, enabled: true },
  ) {
    const voice = this.voices().find((v) => v.voiceURI === voiceURI);
    if (
      !options.enabled ||
      !voice ||
      (!voice.localService && !options.allowRemote) ||
      typeof SpeechSynthesisUtterance === "undefined"
    )
      return false;
    this.stop();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = options.rate;
    utterance.volume = options.volume / 100;
    try {
      speechSynthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  },
  stop() {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  },
};
