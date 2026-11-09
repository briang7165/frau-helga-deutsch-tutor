# Codex — M1.2 optional ElevenLabs voice integration (not started)

**Voice selected by user:** configure the selected ElevenLabs voice ID in private runtime config as `ELEVENLABS_VOICE_ID`; do **not** commit the literal voice ID or any API keys to this public GitHub repository. The owner will provide the voice ID through a private Codex instruction or local config, **not** through the repository files.

## Starting conditions
- M1.1 [PR #3](https://github.com/briang7165/frau-helga-deutsch-tutor/pull/3) is currently under user review. **Do not merge it automatically.**
- Ideally start from latest approved `main` *after* PR #3 is approved and merged. If working before that, separate the work in a new branch and PR, avoiding conflicts and any automatic merge.
- Read `AGENTS.md`, `docs/VOICE_DESIGN_FRAU_HELGA.md`, `docs/SECURITY_PRIVACY_COST.md`, and current voice/settings code.

## Goal
Add an explicitly user-enabled **ElevenLabs text-to-speech option**, with Frau Helga's custom voice, without exposing API keys, changing microphone transcription behavior, consuming credits automatically, or enabling billing.

## Plan
1. Define `SpeechOutputProvider` with implementations: local Firefox browser TTS (existing), external ElevenLabs TTS, and silent/text-only fallback.
2. Build an **authenticated or local-loopback-only Node server API** for local development, and a separate production Cloudflare Worker adapter design for later. Send `POST /api/voice/speak` only to own server; server calls `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream` with `xi-api-key` from secret environment. Model default `eleven_multilingual_v2` (verify voice/model support, language support and actual account before live request).
3. Secrets in server-only env vars, e.g. `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`. Never send key to browser, commit keys/voice ID to repo, use `VITE_*` variables, print secret in logs, or put key in query URL.
4. Add clear user opt-in in Settings before first remote synthesis; show that sentence text is sent to ElevenLabs and uses account credits, with `Test Frau Helga's voice` button. Default external TTS OFF. Keep existing installed voice fallback and text-only fallback. Include Stop/Pause/volume and explicit error states (offline, quota, authorization, unsupported voice).
5. Strong quotas: request length cap (e.g. 300 characters per request), per-session and daily character cap, only allow selected voice and model, bounded timeout, safe request validation and rate limits. Prior to live calls, inspect ElevenLabs subscription/quota if available; warn and disable rather than incur billing. Do NOT treat app caps as equivalent to provider billing cap. The user prefers $0, permits at most $5 monthly *after explicit approval*; do not enable PAYG or any paid plan.
6. Avoid retransmitting exact same original instructional prompts when possible: ephemeral memory cache of generated lesson prompts for a session, no persistent user free-text/audio caching by default. Don't persist raw audio or text in public repo.
7. Synthesis does not grade the user's pronunciation or transcribe microphone audio. Keep those features labeled separate and manual until authorized.
8. Build unit tests for opt-in state, fallback, invalid voice or auth, quota exhaustion, request bounds, and no secret in client bundle. Use mocked ElevenLabs responses for automated tests; no live API calls by default. Provide manual end-to-end smoke test using a user-owned restricted API key configured locally.
9. Run typecheck, unit tests, build, Firefox E2E, audit. Open PR to approved base without merging/deploying; report actual results, cost estimate and remaining work.

## Deployment caution
The current app runs in Firefox through Vite on localhost, without a backend. **Voice ID alone is not sufficient** to call ElevenLabs. A secure proxy + account API key are required to use the custom voice live. The owner must explicitly authorize sending lesson text to ElevenLabs. Test with original short German phrases; check latency, accent clarity, quotas and licensing.

## Official references
- https://elevenlabs.io/docs/api-reference/text-to-speech/stream
- https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/streaming
- https://elevenlabs.io/docs/overview/administration/billing
