# Frau Helga — ElevenLabs voice design and integration brief

**Status:** Voice identity specification approved for design. No ElevenLabs voice has been generated, saved or connected yet. This document contains no credentials or private learner information.

## Identity
**Voice name:** Frau Helga — Die Lehrerin

**Persona:** A fictional native German schoolteacher aged around 56–60, experienced, warm beneath a disciplined demeanor. Her precise pronunciation helps an A2 German learner. Delivery is authentic and natural, never caricatured, shrill or intimidating.

### Voice Design prompt (copy verbatim)

> Native German (Germany), standard Hochdeutsch. Female, 56–60 years old. Studio-quality natural voice. Persona: experienced, respected German schoolteacher. Emotion: warmly authoritative, composed, patient, quietly amused. A mature, medium-low feminine pitch with gentle natural vocal texture, grounded resonance, and crisp articulation. Speaks at a measured, moderately slow teaching pace, with intentional pauses and clear emphasis on important words. Her discipline comes through in confident intonation, never anger. When correcting a student, she is firm and precise; when praising effort, a genuine warmth and subtle smile enter her voice. Refined, traditional classroom manner with understated dry humor. Natural contemporary German pronunciation, no regional dialect, no exaggerated accent, no theatrical caricature.

### Test script (German; original content)

> Guten Morgen! Ich bin Frau Helga, und heute lernen wir gemeinsam Deutsch. Zuerst eine kleine Regel: Nach „mit“ steht immer der Dativ. Ja, auch heute noch! Nun versuchen Sie es bitte selbst. Keine Angst vor Fehlern. Ich bin streng, aber gerecht. Und wenn Sie sich Mühe geben, werden wir beide sehr zufrieden sein. Also, noch einmal, bitte.

## Voice selection
1. Open ElevenLabs account, `Voices → My Voices → Add a new voice → Voice Design`. Paste the voice prompt and test script.
2. Generate three candidates. Try at least two original classroom scripts involving a correction, warm praise, and an A2 question. Evaluate native German quality and clarity in standard pronunciation, mature timbre, normal pacing, dry humor, firmness without harshness, consistency between clips.
3. Save selected candidate as `Frau Helga — Die Lehrerin`. Obtain the saved **voice ID** from ElevenLabs UI. Do not publish API keys or sensitive account details. A voice ID is an identifier, not an API key, but store it in private runtime configuration until integration is approved.
4. Note service usage cost. ElevenLabs Voice Design generates three candidates and consumes preview text credits, even if no candidate is saved. Free plan is currently listed with 10k credits/month (verify live account remaining credits).

## Future code integration — separate M1.2 milestone only
- Existing Vite app currently uses browser SpeechSynthesis. ElevenLabs TTS would be an additional **opt-in** provider: browser/local speech fallback → ElevenLabs custom voice via authenticated server proxy.
- Do NOT call ElevenLabs directly from React/Firefox with an `xi-api-key`; no keys in `VITE_*`, source code, localStorage, test snapshots or public GitHub. Keep secret in Cloudflare Worker secrets or another access-controlled backend (or a local server config only for developer testing).
- Never give browser clients arbitrary control of upstream model, voice ID, request length, destinations or monthly quota. Authenticate requests and restrict to this user; validate allowed German text, length, request frequency and budget.
- TTS route proposed: `POST /api/voice/speak` -> user auth -> quota checks -> server-side ElevenLabs API `/v1/text-to-speech/{voice_id}/stream` -> browser audio playback (ephemeral). Avoid retaining spoken-text payloads unnecessarily. Test a short UI preview prior to integrating lessons.
- Plan `VoiceProvider` for `speak(text, voiceStyle)`, `stop()`, `isAvailable()`, respecting global voice enabled/volume/rate and privacy consent. TTS voice personality depends on stable voice identity plus text content; do not promise an exact 58-year-old voice.
- Keep remote voice off until user explicitly opts in to sending lesson text to ElevenLabs. Explain that user text could be processed externally.
- This **does not** solve microphone transcription or grading. Separate SpeechToTextProvider (e.g. Gemini) is required to score spoken content. Neither inferred tone nor transcript-only text establishes pronunciation accuracy.
- Scope: personal, non-commercial practice; confirm ElevenLabs plan rights and rate limits before public deployment. Existing budget is $0 preferred, $5/month hard preference. ElevenLabs Starter listed at $6/month recurring (outside preference), so do not upgrade or enable paid API calls without explicit approval.
- Public repository: avoid keys, private learner transcripts, spouse email, copyrighted sources, account data.
- User approved keeping PR #3 **unmerged** until post-test classroom fixes. Do not combine voice integration with PR #3 or deploy it.

## Source documentation (current 2026; recheck before activation)
- https://elevenlabs.io/docs/eleven-creative/voices/voice-design
- https://elevenlabs.io/docs/eleven-api/guides/how-to/voices/voice-design
- https://elevenlabs.io/docs/api-reference/text-to-speech/stream
- https://elevenlabs.io/pricing
