# Frau Helga — Deutsch Coach

A local German tutor for a self-assessed A2 learner. Frau Helga is strict but kind, precise and quietly funny. Milestone 1 is approved and merged. **Milestone 1.1 is implemented on `feature/m1-1-learning-ux` and awaits pull-request review.** No deployment or live services.

## Run locally on Windows

Use Node.js 22.12+ and npm. From your repository folder:

```powershell
git fetch origin
git switch feature/m1-1-learning-ux
npm.cmd ci
npm.cmd run dev
```

Open the local Vite URL in Firefox, normally `http://127.0.0.1:5173`. Keep the same browser profile, host and port you used for M1 to preserve access to its localStorage. `localhost` and `127.0.0.1` are different storage origins. No credentials or environment variables are needed. `npm.cmd` and `npx.cmd` work when PowerShell policy blocks `.ps1` wrappers.

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npx.cmd playwright install firefox
npm.cmd run test:firefox
npm.cmd audit
```

Firefox tests start their own local server on port **4173**, independently of your normal app on 5173. They use isolated fictional browser data. If you set `PLAYWRIGHT_BROWSERS_PATH` for installation, use the same value for tests.

## M1.1 learning experience

- Six original daily activities cover vocabulary, reading, writing, listening and speaking. Prominent English instructions explain the response language and scoring before each question. The daily target defaults to 30 minutes and is adjustable; active time is measured, not fabricated.
- First-attempt rubrics award partial credit. In constrained writing, meaning contributes 40 points, verb/tense 25, word order 20, and articles/case/spelling 15. A wrong article with otherwise correct wording earns 90%. Known variants and selected spelling errors are recognized. Unknown plausible answers are **Needs review — unscored**, not automatically zero. Skips and review items are excluded from averages, with denominators shown.
- Help explains grammar concepts or a selected German word. Keyboard lookup, article/plural/form information, short original examples and optional pronunciation are available. Full passages and tested answer terms are not translated or supplied. Hints are marked assisted without a score penalty.
- Settings persist: sound/voice volume and rate, daily target, correction detail, review frequency, assessment cadence, help visibility, spelling, text size, contrast, reduced motion and privacy choices. A2 and English are the supported content modes. Restore defaults keeps progress.
- Earn XP, Goldsterne and practice badges; see streaks and a weekly challenge. XP never changes grades. Skipping every activity earns no XP. Original synthesized effects are off/muted by default, have global mute/volume controls, and respect the user's sound choice. Motion respects both app and system preferences.
- Optional progress checks become due after seven calendar days or five lessons by default. Four original deterministic forms rotate across the five skills. Comparisons show assessed coverage and skill-specific needs; results remain self-assessed/non-certified.
- Firefox recording includes permission/device diagnostics, input level and duration, local replay with consent, and explicit discard. Hold with the pointer or Space/Enter; release stops recording. Clips are memory-only, discarded on pause/navigation/tab departure, and never uploaded. **There is no automatic transcription or pronunciation assessment.** Manual text is always available.
- German voice discovery includes de-DE, de-AT and de-CH. Local/remote labels, persisted selection and preview controls are available. Remote browser voices are blocked unless deliberately selected and explicitly allowed in Settings. No Gemini, ElevenLabs or paid provider is configured.
- German spellcheck and English spellcheck have separate controls. Firefox needs an installed dictionary; the input language attribute cannot install it. Turn German spellcheck off if English red squiggles are distracting.
- Every completed session has an outcome-based **PREVIEW — NOT SENT** report, with assessed and unassessed work clearly separated. Nothing is emailed.

## Existing data is preserved

M1's `frau-helga-m1-v1` key is retained unchanged during migration. M1.1 writes validated outcomes to `frau-helga-progress-v2`; settings use `frau-helga-settings-v1`. Historical assessed grades are retained. Old unrecognized/skipped zeroes become unscored, with the original value retained as migration metadata. Completed lessons, elapsed time, dates and paused lesson position survive.

Unknown/corrupt saved progress is not silently overwritten. Export/import validates and reconstructs allowed data fields; imports merge completed lessons by ID and retain existing records on conflicts. Explicit progress deletion removes both progress versions after confirmation. Backups contain structured learner outcomes and preferences, never raw responses, clips, accounts or secrets, and should still be kept private.

## Review and boundaries

See [M1.1 acceptance report](docs/M1_1_ACCEPTANCE_REPORT.md) for the changed-file list, exact test results, migration details and manual Firefox checklist. The [M1.1 requirements](docs/M1_1_PRODUCT_ENHANCEMENTS.md) and [task prompt](CODEX_MILESTONE_1_1_PROMPT.md) define this milestone.

The local dictionary and grading rules are deliberately bounded. Other valid wording may need review; no live reviewer or AI receives it. Assessment forms eventually repeat. Real microphone quality, audible voice quality and installed spellcheck dictionaries need a check on your device. Free-text drafts are not persisted; abrupt closure can lose the last partial second of elapsed time.

M2+ authentication, live AI, real audio transcription, authorized email/feedback, cloud storage, OneDrive and Android work remain unstarted. No merge or deployment without user review. A future $5/month ceiling is not permission to activate billing.

## Development and privacy

### M1.2 optional voice (separate review)

The `feature/m1-2-elevenlabs-tts` branch adds a loopback-only Node speech proxy and explicit ElevenLabs opt-in, disabled by default. Credentials and the selected voice ID stay in ignored private server configuration. Existing progress and microphone behavior are unchanged. See [local setup and authorized live-test steps](docs/M1_2_ELEVENLABS_SETUP.md) and the [future Worker design](docs/M1_2_WORKER_DESIGN.md). This work depends on pending PR #3; no merge, live test, billing or deployment is authorized by the implementation.

Verification: 67 unit tests and 23 Firefox tests PASS; application and server typechecks, production build, client secret scan and dependency audit PASS (0 vulnerabilities). The disabled compiled server starts successfully on loopback. Live ElevenLabs synthesis and real voice quality are NOT RUN; automated provider responses and browser audio are mocked.

Read `AGENTS.md`, `CODEX_MILESTONE_1_1_PROMPT.md`, the M1.1 requirements and the architecture/persona/privacy documents before editing. Work on `feature/m1-1-learning-ux` from main and open a PR for review.

This repository is public by user choice. Never commit learner records, transcripts, microphone recordings, family email addresses, credentials, private messages, OneDrive exports or copyrighted textbooks. The original specification example JSON is fictional, and its illustrative scores are never imported as learner achievements.
