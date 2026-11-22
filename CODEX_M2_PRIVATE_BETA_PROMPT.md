# Codex handoff — M2 real voice + speaking + private release

Repository: briang7165/frau-helga-deutsch-tutor

## Status
- **M1.1 PR #3 has now been merged into main** (merge commit `6c903d13034fcb5194defc0f16b9ca32c0bcfd4d`). It contains the improved compact classroom and intent-aware grading released in November 2026.
- **M1.2 draft PR #5** is based on older M1.1 and **conflicts with current main**. It contains restricted local ElevenLabs TTS server code, consent/quotas, tests. Do not overwrite newer M1.1 files or blindly merge it.
- Read `AGENTS.md`, `docs/M2_PRIVATE_BETA_RELEASE.md` (the primary specification), `docs/VOICE_DESIGN_FRAU_HELGA.md`, `docs/M1_1_ACCEPTANCE_REPORT.md`, `docs/M1_2_ELEVENLABS_SETUP.md` from the existing PR #5, `docs/SECURITY_PRIVACY_COST.md`, and current source/tests.
- A new GitHub CI workflow is in `main`. Let CI report results; fix any real failures without weakening tests.

## Proceed incrementally in three reviewable PRs, in order

1. **Reconcile PR #5 with current main**. Preserve all M1.1 compact UI/feedback behavior and tests, and all secure M1.2 opt-in/secret/quota behavior. Rerun full tests. Update the existing PR rather than mixing an unrelated feature. Keep it draft until clean review. No external API call without explicit owner consent.
2. **New PR: German microphone transcription and feedback.** Firefox MediaRecorder → local secure server or authenticated Worker → explicitly consented short German audio → real STT provider (choose and verify economical, supported provider; no paid credit activation) → editable German transcript → content/grammar grading → concise correction. No fabricated pronunciation score. Provide manual fallback, error states and mocked tests. Use provider credentials in private secrets only. Stage a simulated provider/demo first; no live calls on build, app load, tests or without owner permission. Guard shared ElevenLabs credits if selecting Scribe STT.
3. **New PR: protected Cloudflare private beta**. Use a Worker/static assets, Cloudflare Access or equivalent proper auth; verify JWT, deny anonymous access to site and API, durable quota, CSRF, request limits, provider secret storage, user progress import. Prepare deployment config and review checklist, but **do not deploy publicly until owner account access, no-billing gates, access tests and separate explicit authorization**. Don't expose local Node service on the internet. No raw audio/logged transcripts.

## Acceptance script
- Desktop Firefox 1100×650 includes Check/Continue without excess scrolling; existing local progress preserved.
- Custom Frau Helga German voice works with a restricted server-side API key only when clicked and opted in.
- Record `Ich fahre am Samstag mit dem Zug` → replay → consent and transcribe → visible editable German transcript → targeted answer feedback. Say `Pronunciation not assessed`, unless separate validated acoustic analysis exists.
- Authenticated owner can open the private website; anonymous visitor cannot. Provider errors/credit exhaustion fail back to offline exercise; no fees.

## Deliverables
- Post a concise plan in GitHub Issue #6; implement all locally feasible changes and test them.
- Write exact setup commands for Windows PowerShell using `npm.cmd` because npm.ps1 is blocked, and screenshots from Firefox.
- Tests: `npm.cmd ci`, typecheck, voice:typecheck if present, unit, build, test:voice-bundle if present, test:firefox, npm audit. GitHub CI should also run.
- Report PASS/FAIL/NOT RUN accurately; physical mic and live provider tests are NOT RUN until actually executed.
- Do not merge or deploy unreviewed work. No credentials, personal email, user audio/transcripts, or payment details committed to this public GitHub repo.
