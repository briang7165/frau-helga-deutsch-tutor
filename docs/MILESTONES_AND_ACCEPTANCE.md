# Milestones and acceptance gates
## M1 — local Firefox-first prototype
Required: React/TypeScript/Vite; teacher persona; A2 demo; reading, writing, listening, vocabulary and scripted speaking; skill scores from actual answers; major/minor correction policies; local persistence; pause/reload/resume; 30-minute target; microphone feature detection and manual fallback; de-DE TTS voice selection; spouse report preview NOT SENT; typed mock provider adapters; unit + Playwright Firefox tests.

M1 acceptance:
1. Fresh install starts in mock mode without credentials.
2. Learner can start, answer, pause and resume after browser reload.
3. Representative wrong answers show appropriate feedback and remediation.
4. App supports keyboard operation and clear semantics.
5. Mic permission denial does not block completion; manual transcript remains available.
6. No microphone audio uploads or persistence.
7. Completion report derives data from actual lesson attempts and says PREVIEW — NOT SENT.
8. No network calls to Gemini/Gmail/Cloudflare, no billing or deployment.
9. Typecheck/build/unit/Firefox E2E tests reported as PASS, FAIL or NOT RUN with evidence.
10. Stop; do not merge to main without explicit review.

## M2
Authenticated Cloudflare foundation and Gemini text, only after review and clear service/cost opt-in. Server-side authorization tested.

## M3
True audio transcription and authorized Gmail send/reply feedback with provenance, deduplication and safe parser. Use test mail first.

## M4
Mastery model, spaced repetition, analytics, optional OneDrive export once access/consent is approved.

## M5
PWA on Android; APK packaging if needed and economically justified.
