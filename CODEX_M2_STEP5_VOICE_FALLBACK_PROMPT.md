# CODEX: Start at Step 5 — Reliable Frau Helga voice fallback

Existing repository: `briang7165/frau-helga-deutsch-tutor`
Current priority: [GitHub Issue #7](https://github.com/briang7165/frau-helga-deutsch-tutor/issues/7).

**Read in this order:**
1. `AGENTS.md`
2. `docs/M2_STEPS_5_TO_11_EXECUTION.md` (primary document, all upcoming steps)
3. `docs/M2_PRIVATE_BETA_RELEASE.md`
4. `docs/M1_1_ACCEPTANCE_REPORT.md` (compact classroom QA)
5. `docs/M1_2_ELEVENLABS_SETUP.md` from the draft PR #5 branch.
6. `server/voice-core.ts`, `server/http-server.ts`, `src/external-voice/output.ts`, `src/external-voice/controls.tsx`, `src/AudioSetup.tsx`, `src/SpeechPanel.tsx`, `src/SettingsPanel.tsx`, `src/App.tsx`, `src/preferences.tsx`, tests across the current main and voice branch.

The owner says Steps 1–4 have already been done. First AUDIT the implementation and persisted media; never destroy their work or assume a voice cache exists just because it was planned. Public GitHub still has **draft PR #5** stacked on older M1.1, whereas **PR #3 is now merged** on main and has the latest compact UI and intent-aware grading. No blind branch merge; resolve conflicts and preserve features. If worktree contains uncommitted files, do not reset or overwrite them.

## Implement only Step 5 first
- A reliable `SpeechOutputCoordinator` selection:
  1. matching local/private saved audio clip, if legal to reuse;
  2. ElevenLabs custom voice only with express consent, online voice server and free quota;
  3. native **local** German browser/OS TTS, never silently remote;
  4. text-only fallback, never blocking lessons.
- Explicit, clear provider/volume/mute/rate controls. Test speaker != Test Frau Helga voice != Test microphone. Display clear status and costs: saved clip / local OS / text-only / consumed remote credit. Allow instant Stop/Pause and error recovery.
- If existing permanent cache actually exists, reuse it and add tests. Otherwise implement a minimal safe local cache for nonpersonal original lesson audio, with clip count/size and confirmation to clear, without secrets or user speech. Preserve full original lesson prompts and user's private recordings. No unapproved remote generation.
- Preserve M1.1 compact interface, audio setup, no document scroll for normal exercise on 1100x650, intent-aware Nora/Bonn example, settings, A2 level, weekly checks, all progress. Do not put API key/voice ID in public code, React bundle, `VITE_*`, issue body or CI.
- Confirm `server/voice-core.ts` fails closed on unsafe/unknown provider billing metadata; API key only server side, paid overages off, requests bounded. App caps do not guarantee provider account cap.
- Write unit and Firefox tests for cached after restart, no network, server down, quota exhausted, no German voice, local voice, stop/pause, consent controls, speaker muted and no paid fallback. Mock provider in tests; physical audio remains NOT RUN until actual human check.

## Test and handoff
- npm.cmd ci; npm.cmd run typecheck; npm.cmd run voice:typecheck (if present); npm.cmd test; npm.cmd run build; npm.cmd run test:voice-bundle (if present); npm.cmd run test:firefox; npm.cmd audit.
- Report numbers, screenshot paths, real hardware not run, acceptance failures, GitHub CI state, local Windows setup and rollback.
- Work on a dedicated `feature/m2-5-voice-fallback` branch after safe PR #5 reconciliation; open a separate PR, or update PR #5 if isolated to that work and the diff remains reviewable. **Do not merge or deploy.**
- Do not implement Steps 6–11 yet. Provide a short recommendation for the next ticket: German STT / editable transcript / semantic corrections / protected hosting.
