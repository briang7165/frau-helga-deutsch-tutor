# Architecture — staged, security-oriented
## M1 local app
Frontend React + TypeScript + Vite, browser-based lesson engine and typed interfaces. Local demo persistence for fictional/own non-sensitive lesson state. Separate lesson content, grading, remediation, persona, report generator and UI; deterministic mock provider outputs. No server, no remote services, no keys.

## Interfaces
- LessonProvider: lesson plan / questions / structured feedback, mock now; Gemini adapter later.
- TranscriptionProvider: voice segment -> transcript with error state; M1 manual simulated transcript only, no upload.
- SpeechProvider: de-DE speechSynthesis voice selection plus text fallback.
- ProgressRepository: durable lesson attempts and skill profiles; M1 local, D1 later.
- ReportDispatcher: preview mode in M1, Gmail authorized dispatch later.

## Planned production deployment (M2+)
Cloudflare Pages or Workers for frontend, Cloudflare Worker for secure API endpoints, D1 relational database for progress, Gemini accessed server-side via secrets only. Google OAuth / Google Identity Services sign-in with server-side ID-token validation, issuers/audience/expiry checks and allowlisted immutable sub, server-side sessions and per-user authorization.

## Planned email loop (M3)
Gmail/Apps Script in a dedicated authorized sender mailbox. Send completed-lesson report with unique report and lesson ID. Check only labeled report threads for replies, validate sender and deduplicate message IDs. Strip quoted message history and treat text as untrusted feedback suggestions. Signed service-to-service requests, strong replay protection; allow spouse feedback to affect pedagogical plan only.

## Android pathway
PWA manifest/service worker after core app is stable; phone UI reuses TypeScript lesson logic. APK packaging later if useful. No assumption that PWA provides full offline live-AI capabilities.

## Failure behavior
No microphone -> manual transcript entry. No German TTS -> text only. API limit or unavailable -> fail gracefully or use cached/static exercises, never surprise charges. Never claim an exercise was evaluated when it was not.
