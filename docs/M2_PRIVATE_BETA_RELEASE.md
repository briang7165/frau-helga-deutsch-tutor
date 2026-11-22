# M2 — Private beta: custom voice, spoken answers and protected web access

**Status:** planned, not yet deployed. Milestone 1.1 (PR #3) was merged into `main` November 22, 2026. ElevenLabs TTS lives on draft PR #5 and needs reconciliation against current `main`. This document does not authorize any paid tier, PAYG, production data upload, public app without auth, or unreviewed API calls.

## Goal
A genuinely usable German tutor that the owner can test daily on Windows/Firefox (and optionally Pixel/Android), including:
- Frau Helga speaks original lesson prompts and corrections in the selected custom ElevenLabs voice (selected voice ID stored in private configuration, not source).
- Learner records a short answer, obtains a real **German transcript** automatically with visible confidence/uncertainty markers and can correct transcript before grading.
- Text content and grammar can be evaluated with meaningful, structured corrections. **Pronunciation score is always unavailable unless a separately validated acoustic scorer is implemented**.
- A **private, passwordless-login-protected** web link works from the user's own devices, with strict quotas, consent and no unapproved cost.

## Stages — do not collapse the safety gates

### Stage A — reconcile and test voice locally (no hosting)
1. Base all work on the now-merged M1.1 `main` (PR #3 merged at `6c903d13034fcb5194defc0f16b9ca32c0bcfd4d`). Reconcile the stacked M1.2 draft PR #5 (head began `54a8fa6`), preserving the 2026-11-15 compact classroom fixes, and re-run unit, Firefox, TypeScript, build, secret scan, audit.
2. Resolve conflicts rather than overwriting newer `App.tsx`, `SettingsPanel.tsx`, `SpeechPanel.tsx`, `preferences.tsx`, and tests. Verify original M1 and M1.1 local progress remains intact.
3. Original M1.2 local voice server remains disabled by default, requires server-only `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`, and offers explicit per-visit consent. Key and selected voice ID never go in public repo or `VITE_*`. Retain free-tier checks and requests caps; no cloud endpoints are provisioned.
4. Test a **single** 42-character original phrase only after the owner configures a restricted key in `private/.env.voice`, confirms current account free credits and provider-side overage off, and explicitly clicks Test. Log only sanitized status and total usage, no text/audio/secrets.
5. Confirm selected custom voice is actually accessible on the current plan, with German intelligibility, speed, latency and stop controls. Report NOT RUN if no private key/authorization. The Windows/Firefox native voice dropdown will NOT list an ElevenLabs voice: it is a separate provider in Settings.

### Stage B — speaking input and real feedback (initially local)
1. Define an `AudioTranscriptionProvider` with **one approved, supported real provider** and an offline/manual fallback. In Firefox, `getUserMedia`/`MediaRecorder` records after direct gesture and permission. A local transcription test can use ElevenLabs Scribe, Gemini, or local Whisper only after checking provider/plan/locale. Choose the least-cost/most-private workable option; document the final choice. Never assume browser `SpeechRecognition` works in Firefox.
2. Show **Record → Stop → Preview/Replay → Transcribe (explicit opt-in) → Editable German transcript → Check answer → Teacher corrections → Continue**. No automatic recording or external uploads; never silently transmit mic audio.
3. Restrictions: clips max 20 seconds in first beta (configurable), MIME allowlist, 1 MB default audio cap, audio-only, per-lesson/session daily caps and abort support. Streams must stop on pause/navigation/permission denial. Discard captured audio as soon as transcription completes or user discards; server must not store original clips or raw transcripts by default.
4. Track STT quota separately from ElevenLabs TTS (provider quota is shared if one ElevenLabs account). Provider pricing currently lists roughly 330 credits/minute for STT and ~1 credit/character TTS; **verify live before enabling**, reserve a conservative combined safety buffer, hard limit spending to verified free credits and provide clear usage/status indicators. Disallow paid/overage fallback.
5. Return transcript, language, confidence when supported, and clear processing status/errors. If confidence not supplied, do **not** invent it. Give learner a chance to edit mistakes before checking answers; text grading evaluates corrected transcript, not acoustic quality.
6. Reuse existing first-attempt, partial-credit, needs-review rubrics for structured questions and typed/spoken transcript. For open-form free responses, optionally add a **server-side Gemini evaluator** behind separate opt-in and validated JSON schema (task fit, meaning, grammar, examples, rubric, uncertainty). Guard against grading hallucinations, invented translation, or rewarding negated phrases containing correct keywords. Unknown outputs fall back to needs-review, not fabricated scores. Provide crisp English teaching feedback and one German improved sentence.
7. For genuine pronunciation coaching, display **'Transcript matches expected words'** only; label **'Pronunciation not assessed'** until approved phoneme/acoustic evaluation exists. Do not treat transcript similarity as accent accuracy.
8. Demonstrate Firefox microphone from an actual physical device, distinguishing mocked-browser tests from real-hardware test, and preserve keyboard/manual fallback.
9. Make user feedback useful and short: what they understood, what to change, one corrected German answer, repeat or continue. Keep concise flow within desktop classroom, expandable details.

### Stage C — protected web release (do not expose a public beta)
1. Prefer a $0 / free-tier Cloudflare Worker + static assets deployment (or Pages + Worker only when compatible) protected by Cloudflare Access on `workers.dev` or a controlled custom domain. Configure **deny by default**, user-owned sign-in/allowlist, session expiry, and test no anonymous access from an incognito browser. Access policy must cover **every hostname and route** (both static assets and `/api/voice/*`, `/api/transcribe/*`, `/api/evaluate/*`).
2. Hosted Worker must verify Access JWT signature, issuer, audience, expiry and authorized user identifier before any API operation. Never trust unverified headers, query parameters or a client-provided email. Add CSRF protections, strict CORS/origin allowlist, backend rate limits and input size caps.
3. Store ElevenLabs and any AI key in Worker secrets (never client). M1.2's local Node server, filesystem quota ledger and in-memory session token must not simply be exposed to the internet. Replace ledger with an atomic durable quota mechanism (D1 transactions or Durable Object), keyed to authenticated user; no shared mutable in-memory quota.
4. Keep app offline/local fallback if cloud speech service is down, quota is depleted or user refuses remote processing. Optional PWA installation for Pixel, but don't rely on PWA for desktop readiness.
5. **Progress migration:** existing progress lives in localStorage scoped to `127.0.0.1:5173`; a new public origin starts blank. Present 'Export local backup' then 'Import' on private beta via existing validated records. No automatic access to local origin data. Keep private learner data out of GitHub.
6. Add manual deployment workflow ONLY with GitHub Actions environment protection, scoped Cloudflare token, preview environment and no secret echo; leave deployment OFF until account, access policy, secrets, zero-billing gates and owner approval are confirmed. Never silently create a public Pages site.
7. Test load from Windows/Firefox and Pixel; cross-origin signed-in session, privacy gate, audio permission under HTTPS, restart durability, voice quota and rollback. Include an offline route showing what remains usable without providers.
8. Confirm Cloudflare Free plan Workers request/CPU/storage quotas, Access eligibility and all provider prices from current official docs. Set spend/budget alerts and provider-side PAYG/overages OFF; if technical zero-dollar cap is impossible, disable paid provider and explain.
9. Cloudflare integration credentials and user account connection are not available inside the present ChatGPT tool session. Stop at a ready-to-review deployment PR and documented account steps if access is missing; do not claim a live URL.

## Acceptance test script (short, real voice / mic)
1. Open private beta with authorized login. Verify anonymous browser is denied.
2. Click 'Test Frau Helga's voice': hear "Guten Tag. Wir lernen Schritt für Schritt." with the selected upper-50s German voice; verify stop/volume/usage, cache.
3. Open speaking task; click record, say "Ich fahre am Samstag mit dem Zug"; stop; replay; explicitly consent to transcription; check editable German transcript.
4. Correct recognized text if necessary; grade sentence content and case/grammar; see targeted correction plus "Pronunciation not assessed".
5. Test one intentionally wrong response; ensure reasonable partial credit, fair correction, 1-click Continue; inspect credits before/after.
6. Test denied microphone, unsupported audio format, remote provider unavailable, quota exhausted, no German OS voice, reduced motion, no paid fallback, and no raw audio persisted.
7. Back up current localhost progress and restore it in the private beta.

## Release gates and reports
- CI job: Node22, typecheck, unit, build, Playwright Firefox, audit, optional server typecheck/secret scan. The repo now includes `.github/workflows/ci.yml` for independent checks.
- PR #5 currently old stacked voice branch; **must reconcile** with merged PR #3 before merge. Require a fresh diff, local tests and review.
- Separate PR for STT/feedback; separate PR for hosted auth/deployment. No unattended or unreviewed paid calls. Run real device tests; report NOT RUN if no physical hardware.
- Real provider calls require explicit user gesture and account settings; zero automatic usage on load/build/CI.
- Do not merge a hosted site before authorization, access-control tests and free-quota audit.
