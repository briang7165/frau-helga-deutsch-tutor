# Codex task — Milestone 1.1: Frau Helga classroom polish and learning experience

Target repo: briang7165/frau-helga-deutsch-tutor
Base: main (Milestone 1 is APPROVED and merged)
New branch: feature/m1-1-learning-ux

## Read before coding
1. AGENTS.md and README.md
2. docs/M1_1_PRODUCT_ENHANCEMENTS.md (**primary source for this milestone**)
3. docs/PRODUCT_REQUIREMENTS.md, docs/FRAU_HELGA_PERSONA.md, docs/SYSTEM_ARCHITECTURE.md, docs/SECURITY_PRIVACY_COST.md
4. src/App.tsx, src/domain.ts, src/providers.ts, src/SpeechControls.tsx and existing unit / Firefox E2E tests

## Assignment
Implement the entire Milestone 1.1 local prototype, in a coherent series of testable commits:
1. Clear and prominent English instructions on every question, language-specific inputs (German/English), unambiguous scoring expectations; Firefox spellcheck controls.
2. Accessible small selection/lookup popup for a chosen German word, with a curated local word-help dictionary and an optional audio button. Never reveal the full answer or translate a whole exercise.
3. Explainable, **less harsh** partial-credit rubrics with correctness confidence; accept valid variants, do not count valid but unmatched answers automatically as zero. Preserve first-attempt policy and distinguish unscored from wrong. Refactor reports and skill grades.
4. Persistent Settings page for sound/voice, lesson target, assessment cadence, spelling, display, accessibility and privacy. Migrate earlier localStorage progress safely.
5. Restrained rewards (XP/stars/badges/streaks), toggleable quiet Web Audio feedback and subtle animations. Immediately adjustable global mute and sound volume.
6. Weekly/5-lessons progress check using multiple original, offline A2 question variants, descriptive trend reporting, self-assessed/non-certified label.
7. Record button diagnostics: visible state, mic meter and timer, a local replay option and explicit discard; never upload or persist audio. Broaden German voice discovery, show all available German locale voices with local/remote labels and explicit privacy choice. Add voice preview and device fallback UI.

Keep Frau Helga's firm-but-kind personality and polished visual style. Make current learner data safe: no destructive migrations or accidental raw text/audio storage. M1.1 remains fully LOCAL with mocked AI, **NOT real speech recognition**. Do not simulate that audio was transcribed or pronunciation was assessed.

## Scope and release gate
- Do not use ElevenLabs/Gemini/Cloudflare, real Gmail, Google OAuth, paid APIs, or OneDrive integration.
- Do not merge, deploy, publish anything private, or activate paid services.
- Add / update unit tests and Firefox Playwright tests for every major behavior in the specification.
- Run typecheck, tests, build and dependency audit. Report exact PASS/FAIL/NOT RUN results, known limits, changed files, Windows PowerShell launch commands (use npm.cmd if script execution policy blocks npm.ps1) and manual Firefox voice/microphone testing checklist.
- Open a PR from feature/m1-1-learning-ux to main and stop for review.
- If a requirement cannot reasonably be delivered, make a working partial version and list what remains; do not claim completion for unimplemented features.
