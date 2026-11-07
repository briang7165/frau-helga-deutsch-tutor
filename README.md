# Frau Helga — Deutsch Coach

A personal, adaptive German tutor for a self-assessed A2 learner, targeting B1 and beyond. Frau Helga is a fictional older German teacher: strict but kind, dryly funny, precise, and consistent in lessons, dialogue, corrections, and reports.

**Status:** Milestone 1 local prototype approved and merged to `main` via PR #1. No deployment or live services. Real microphone and installed voice quality still require a local hardware check.

## Run the local prototype

Use Node.js 22.12+ and npm. In the repository folder:

```powershell
git switch main
git pull
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`) in Firefox. No environment variables, credentials, or account setup are required. The server binds to loopback only.

```powershell
npm run typecheck
npm test
npm run build
npx playwright install firefox
npm run test:firefox
```

Playwright starts a temporary local Vite server. If using a custom browser cache, set `PLAYWRIGHT_BROWSERS_PATH` to that directory for both installation and testing. See [Playwright's browser installation documentation](https://playwright.dev/docs/browsers).

### What M1 does

- Original six-activity A2 lesson: vocabulary, reading, dative writing, listening, sentence repetition, and scripted dialogue. The target is 30 minutes of deliberate practice, not a minimum duration or a countdown.
- Pause/resume and reload recovery. Reloads and background tabs pause the lesson. Active time is checkpointed every second; an abrupt close can lose the last partial second.
- Scores use the first submitted answer per activity; skips and unrecognized answers receive zero. Repetition is practice and never inflates grades. Minor capitalization corrections appear in section review; known grammar errors receive immediate feedback and an alternative explanation after two errors.
- Deterministic pattern matching, not general AI assessment. Other valid German answers may be unrecognized. Read the model answers and rubric limitations. Speaking scores assess manual text only, never pronunciation.
- Hold-to-talk using `getUserMedia` / `MediaRecorder`. Release, cancel, pause, navigation, or leaving the tab releases tracks and discards audio. There is no automatic transcription. Manual transcript input always works without microphone permission.
- Optional installed, **local-only de-DE** speech synthesis voices. No suitable voice means text fallback; no remote speech service is used.
- Recent local lesson history, streaks, skill scores, and a factual **PREVIEW — NOT SENT** spouse report. No recipient settings and no email delivery.
- Saves only outcome codes, scores, timestamps, and elapsed time under `frau-helga-m1-v1` in localStorage. Free-text answers and audio are never persisted. Use **Clear local progress** to remove saved demo state. Storage failure shows a warning and does not block practice.

The example JSON is a fictional specification fixture; its illustrative scores are not imported as learner achievements. The dashboard starts at zero. Each completed practice session adds actual outcomes from the local demo. A2 is self-assessed and no certified CEFR result is inferred.

Implementation and verification details: [M1 acceptance report](docs/M1_ACCEPTANCE_REPORT.md).

## User-approved requirements

- PC/Firefox first; mobile-friendly web UI and later PWA/Android option.
- Flexible 30-minute daily lessons with pause/resume, covering reading, writing, listening, vocabulary and speaking.
- Hybrid structured lessons and AI conversations; skill mix adapts to weak areas.
- Immediate correction for major errors, deferred review for minor ones.
- Personal progress, streaks, scores, CEFR estimates clearly labeled as non-certified, and spaced repetition.
- Detailed report after each lesson to spouse, with strengths, mistakes, objectives. Spouse can reply to email or use a simple feedback form. Valid suggestions may influence future lessons.
- A dedicated Gmail sender has been selected; store its literal address **only in private configuration**, not in this public repository.
- Gemini free-tier-first; Cloudflare Workers + D1 for a future authenticated deployment.
- Google account sign-in is planned for later; no credentials in Milestone 1.
- $0 preferred; **$5/month ceiling** for future authorized services, never automatic permission to enable billing.
- OneDrive backup planned later; copyrighted textbooks remain outside GitHub, with topic maps and original exercises only.
- No lesson reminder requirement; users open lessons when ready.

## Milestones

1. **M1 — Local prototype:** React, TypeScript, Vite, fully local with deterministic mock data and adapters. Firefox-first classroom UI, demo A2 lesson, scripted conversation, microphone controls and manual transcript fallback, German speech synthesis if available, scoring based on actual attempts, local saved progress and spouse report **PREVIEW / NOT SENT**. Unit + Playwright Firefox tests.
2. **M2 — Hosted foundation:** Google sign-in allowlist, Cloudflare Worker + D1, secure persistence, Gemini text calls; only after review.
3. **M3 — Real speech and communication:** Gemini-based audio transcription, voice adapter, Gmail sender and validated spouse feedback; only after explicit authorization.
4. **M4 — Adaptive curriculum:** mastery tracking, review scheduling, trends, export/authorized OneDrive backups.
5. **M5 — Android:** installable PWA, optional Android APK with shared backend.

## Development instructions

Read `AGENTS.md`, `CODEX_MILESTONE_1_PROMPT.md`, all files in `docs/`, and `examples/lesson_and_report.json`. Implement **only M1** on branch `feature/m1-local-prototype`. Do not merge, deploy, send email, call Gemini, provision Cloudflare, or add billing without a separate user request.

## Privacy

This code repository is **public by user choice**, but learner records, transcripts, microphone audio, family email addresses, Google OAuth secrets, API keys, OneDrive data and copyrighted book files are not public. Do not commit or publish them.
