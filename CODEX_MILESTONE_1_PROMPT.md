# Codex task — Milestone 1: Local Firefox prototype
Act as lead full-stack developer for **Frau Helga — Deutsch Coach**. Read AGENTS.md, README.md, docs/, examples/lesson_and_report.json. Build M1 only on branch feature/m1-local-prototype. Do not merge or deploy.

## Required deliverable
- Working React + TypeScript + Vite app with polished responsive desktop classroom UI (warm cream, ink typography, muted forest green; accessible contrast and keyboard controls). No dependency on generated images.
- Dashboard with A2 starting level marked self-assessed, progress, streaks and recent lessons (fictional demo data labeled).
- Start a 30-minute-target lesson composed of original A2 reading, writing, listening, vocabulary and speaking exercises; show estimated target and actual elapsed time, not a fake timer.
- Pause/resume; reload while in progress without losing completed answers. Persist non-sensitive demo state in localStorage or IndexedDB.
- Deterministic grading based on attempted answers with major grammar mistakes corrected immediately, minor mistakes summarized at section end and alternative explanation after repeated errors.
- Scripted conversation with Frau Helga using typed dialogue choices and user text input.
- Firefox push-to-talk controls: check microphone permission, record/cancel in memory with getUserMedia and MediaRecorder; manual transcript input if microphone unavailable. Do NOT use SpeechRecognition. Audio is never uploaded or persisted; true transcription is future M3.
- Optional in-browser German speechSynthesis, with installed de-DE voice selector. If unavailable, display text without breaking lesson.
- Show completion dashboard and detailed **PREVIEW — NOT SENT** spouse report (real scores from actual demo attempts, strengths, mistakes, corrections, next goals). No actual email.
- Define typed adapters LessonProvider, TranscriptionProvider, SpeechProvider, ProgressRepository and ReportDispatcher with deterministic M1 mock implementations.
- Unit tests for score calculations, report generator and remediation; Playwright Firefox E2E tests for start, complete, reload/resume, mic denial fallback. Provide clear npm scripts.

## Explicit exclusions
No live Gemini API calls, Cloudflare deployment, D1 provisioning, Google OAuth, Gmail sends, OneDrive sync, paid services or real secrets. No copyrighted textbook copying; no arbitrary pronunciation score, certified CEFR claim or fabricated progress. Do not implement M2+.

## Acceptance report
Run npm install (or npm ci where lockfile exists), typecheck, build, unit tests and Playwright Firefox tests where feasible. Record PASS/FAIL/NOT RUN and exact reason. Include local launch instructions and changed-file list. Stop and request review before M2.
