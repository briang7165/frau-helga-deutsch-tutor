import { activities } from "../src/content.js";
export const VOICE_TEST_TEXT = "Guten Tag. Wir lernen Schritt für Schritt.";
export const VOICE_LIMITS = {
  request: 300,
  session: 600,
  day: 1200,
  month: 3000,
  perMinute: 6,
  timeoutMs: 15000,
  audioBytes: 2_000_000,
  cacheEntries: 12,
} as const;
export const normalizeVoiceText = (text: string) =>
  text.normalize("NFC").trim().replace(/\s+/gu, " ");
// Only repository-authored instructional material is eligible for external TTS.
// Learner answers, microphone data and arbitrary free text are deliberately not supported.
const original = [
  VOICE_TEST_TEXT,
  ...activities.flatMap((a) => [
    a.text ?? "",
    ...(a.skill === "vocabulary" ? [] : [a.model]),
  ]),
  ...["Köln", "Trier", "Leipzig", "Dresden"].map(
    (town) => `Ich fahre morgen nach ${town}.`,
  ),
  ...["Käse", "Milch", "Tomaten", "Kartoffeln"].map(
    (food) => `Heute kaufe ich ${food} und eine Zeitung.`,
  ),
];
export const originalVoiceTexts = new Set(
  original.filter(Boolean).map(normalizeVoiceText),
);
export type VoiceErrorCode =
  | "disabled"
  | "consent_required"
  | "authorization"
  | "unsupported_voice"
  | "unsupported_text"
  | "invalid_request"
  | "quota"
  | "rate_limit"
  | "busy"
  | "timeout"
  | "offline"
  | "unavailable"
  | "configuration";
export const voiceMessages: Record<VoiceErrorCode, string> = {
  disabled:
    "External voice is disabled on the server. Local voice and text still work.",
  consent_required: "Enable ElevenLabs for this visit before sending text.",
  authorization:
    "Voice authorization failed. Check the restricted server-side key and permissions.",
  unsupported_voice:
    "The selected voice or model is not available for this free account.",
  unsupported_text:
    "This text is not an approved original lesson prompt. Use local speech or text.",
  invalid_request: "The voice request is invalid or too long.",
  quota:
    "A usage limit or the free-account safety check blocked this request. No paid fallback is used.",
  rate_limit: "Too many voice requests. Wait one minute before trying again.",
  busy: "A voice request is already running. Wait for it to finish.",
  timeout:
    "The voice request timed out. Stop does not refund credits already consumed.",
  offline:
    "The local voice server is unavailable. Start it locally, or use the installed voice.",
  unavailable:
    "Voice synthesis or playback is unavailable. Use local speech or text.",
  configuration:
    "The private voice configuration or usage ledger needs attention. Live calls are blocked.",
};
