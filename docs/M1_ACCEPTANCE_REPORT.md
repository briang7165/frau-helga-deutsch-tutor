# Milestone 1 acceptance report

Branch: `feature/m1-local-prototype`. Scope: local React / TypeScript / Vite prototype only. No merge, deployment, account integration, billing, or real emails.

## Implementation

- `src/App.tsx`: responsive classroom, local dashboard, resume flow, scripted dialogue, correction review, report preview, and data deletion.
- `src/styles.css`: cream and forest-green design, system typography, visible keyboard focus, responsive mobile layout, and no external assets.
- `src/domain.ts`: six original activities totaling a 30-minute practice target, deterministic first-attempt scoring, bounded grammar rubric, remediation, reports, and local-calendar streak calculation.
- `src/providers.ts`: typed LessonProvider, TranscriptionProvider, SpeechProvider, ProgressRepository, and ReportDispatcher interfaces; mock lesson/transcription/report adapters, browser speech and local storage adapters; saved-state validation.
- `src/SpeechControls.tsx`: installed local German voice selection, text fallback, microphone hold/release/cancel, and cleanup even when permission resolves after cancellation.
- `src/domain.test.ts`: grading, score aggregation, skips, retries, remediation, factual report generation, state validation, streaks, and manual transcription tests.
- `tests/lesson.spec.ts`: Firefox lesson completion, reload/resume, wrong answers, mic denial, voice absence, recording cleanup, delayed permission, storage failure, mobile sizing, and keyboard flows.
- Root tooling: `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `index.html`, and `src/main.tsx`.
- `README.md`: launch commands, verification commands, privacy behavior, and known limitations.

## Verification

Validation on November 7, 2026, using Node 22.14.0 and npm 10.9.2 on Windows:

| Check | Result | Evidence |
| --- | --- | --- |
| Dependency installation | PASS | `npm install`; committed lockfile; final audit reports 0 vulnerabilities |
| Typecheck | PASS | `npm run typecheck`, no TypeScript errors |
| Unit tests | PASS | `npm test`, 10 tests passed |
| Production build | PASS | `npm run build`, Vite output generated successfully |
| Firefox E2E | PASS | `npm run test:firefox`, 8 tests passed using Firefox 159 / Playwright build 1572 |
| Visual review | PASS | Desktop classroom and 390px mobile screenshots inspected; no horizontal overflow |
| Physical microphone and voice listening | NOT RUN | Requires local hardware and installed voices; simulated stream lifecycle and denial tested |

The first unit run identified a capitalization issue for “Nach Bonn.”; it was corrected before final validation. An initial sandboxed Firefox run could not connect to its local server; after stopping it and running with local networking enabled, the suite passed. Initial dependency advisories were resolved by updating Vitest before final validation. No unresolved test failures remain.

Browser tests use fictional input only and assert no requests to external services during lesson completion. Test output and screenshots remain in ignored `test-results/`; no learner records are committed.

## Review limitations

1. This is one short deterministic lesson designed for repetition and deliberate practice within a 30-minute target. It does not force 30 minutes of screen time or generate a curriculum.
2. Pattern matching is deliberately bounded. Alternative correct free-text answers may score zero as **unrecognized**, explicitly distinguished from known grammar errors. No certified proficiency or pronunciation claim is made.
3. Real microphone hardware and installed voice quality require a local human check. Browser tests exercise denied/unavailable capabilities and simulated MediaRecorder stream lifecycle; they do not evaluate a physical microphone or audio intelligibility.
4. Outcome-only persistence preserves completed answers' grading, but discards original free text. The report shows topic corrections and model examples rather than retaining private transcripts. Abrupt termination can lose the last partial second of elapsed time.
5. Full mastery models, spaced review scheduling, live AI, authentication, email feedback, and cloud persistence remain in later milestones. The M1 report proposes goals from observed outcomes without claiming a full adaptive system.

## Review before M2

Try the lesson in your own Firefox installation, particularly microphone permission and local German voices. Review tone, accepted answer patterns, score policy, and report usefulness before authorizing any M2 work. M2 remains unstarted; service activation requires separate authorization.
