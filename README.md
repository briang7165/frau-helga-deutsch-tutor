# Frau Helga — Deutsch Coach

A personal, adaptive German tutor for a self-assessed A2 learner, targeting B1 and beyond. Frau Helga is a fictional older German teacher: strict but kind, dryly funny, precise, and consistent in lessons, dialogue, corrections, and reports.

**Status:** Project specifications uploaded. The app has not yet been implemented or deployed.

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