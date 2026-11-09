# Milestone 1.1 — implementation and review

Branch: `feature/m1-1-learning-ux`, based on approved M1 on `main`.
This milestone remains a local React/TypeScript/Vite application. No Gemini, ElevenLabs, Gmail, Cloudflare, billing, deployment, OAuth, or real email integration was activated.

## Implemented behavior

| Requirement | Implementation |
| --- | --- |
| English-first lessons | An English instruction panel precedes every question. It explains input language, scoring and speech limitations. German content is visually distinct. Help and Settings are always accessible. |
| Contextual word help | Selected-word and keyboard lookup, a curated local dictionary, grammar/form information, original examples, optional pronunciation, Escape/close handling, and an instruction-concept explanation. Multiword sentences and tested answer terms are withheld. Hints never submit answers or lower grades. |
| Fair grading | Activity-specific deterministic rubrics accept known variants/synonyms and give partial credit for case, missing articles, verb errors, word order, capitalization and selected spelling errors. A single wrong article in the writing task earns 90%, rather than zero. Unknown plausible wording is **needs review / unscored**. |
| Transparent reports | First attempts stay fixed. Assessed denominators, missing/skipped work, needs-review counts, assistance, rubric components, confidence and error tags are visible. Reports remain **PREVIEW — NOT SENT**. |
| Persistent Settings | Independent SFX and spoken voice controls; global effects mute/volume; daily target; correction detail and review frequency; assessment cadence; help visibility; text size, reduced motion and high contrast; spelling controls; data deletion, validated export/import and defaults restoration. |
| Rewards | XP, Goldsterne, practice stars, streaks, a three-session weekly challenge and a restrained animated star. Original synthesized tones are off/muted by default, volume-adjustable, cancellable and non-overlapping. Rewards never change proficiency scores. System reduced-motion preferences are respected. |
| Progress checks | Optional reminder after seven local calendar days or five completed lessons by default, adjustable in Settings. Four deterministic original forms cover all five skills and rotate in order. Reports show assessed denominators, overall and per-skill prior results, error categories and study recommendations. No notifications or forced interruption. |
| Recording | Hold with pointer/Space/Enter; permission and device diagnostics; live input meter where supported; elapsed timer; 60-second clip limit; consent-gated local replay; explicit discard. Pause, navigation, tab departure, cancellation and delayed permission cleanup stop tracks and revoke clip URLs. |
| Voices | Discover all German locales, including de-AT/de-CH; show local/remote labels; persist selection; preview; explain unavailable voices. Only local voices are eligible by default. A remote browser voice requires both deliberate selection and explicit Settings consent. No third-party TTS integration exists. |
| Spellcheck | German-answer/lookup fields use de-DE; English answers use en; listening allows input-language selection. Both spellcheck switches persist. The app explains that Firefox dictionaries must be installed independently. |

## Progress preservation and privacy

- The original `frau-helga-m1-v1` key is read but **never overwritten during migration**. New outcomes are written to `frau-helga-progress-v2`. Settings use `frau-helga-settings-v1`.
- M1 IDs, elapsed time, completion dates, position and attempts are preserved. Historical assessed scores stay as recorded. Old `unrecognized` and `skipped` zeroes become unscored; their original numeric values remain in `legacyScore`. Old answers were never stored, so old grammar scores cannot responsibly be regraded.
- Invalid/unreadable progress is not silently overwritten. A warning appears and automatic saves are blocked until an explicit validated import or deletion.
- Imports validate versions, ranges, IDs, lesson positions, rubric totals and outcome types. They reconstruct whitelisted records, stripping unknown/raw fields and regenerating rubric messages. Histories merge by session ID; existing records win conflicts, and an existing current session is preserved.
- Export contains only structured outcomes and preferences. Learner progress should still be treated as private and not committed. Free text and recorded audio never enter saved state.
- Browser storage belongs to an **origin**. Use the same host and port as before to see your previous progress. `localhost` and `127.0.0.1`, or different ports, have separate storage. The development server does not need to change; browser tests use an isolated origin on port 4173.

## Validation

Run on Windows with Node 22.14.0 and npm 10.9.2, November 7, 2026:

| Check | Status | Evidence |
| --- | --- | --- |
| `npm.cmd ci` | PASS | Existing lockfile installed; no dependency changes required |
| `npm.cmd run typecheck` | PASS | No TypeScript errors |
| `npm.cmd test` | PASS | 37 unit cases: rubric variants, privacy/migration, schema rejection, schedules, trends, rewards, word help, sound mute and voice policy |
| `npm.cmd run test:firefox` | PASS | 19 browser cases: complete/reload/pause; instructions; partial/unscored results; help selection/keyboard; settings reload; sound/motion; spellcheck attributes; assessments/trends; recording/replay/discard; denial/late permission; voice discovery; migration/import/export; storage failures; keyboard/mobile layout |
| `npm.cmd run build` | PASS | Production Vite bundle generated |
| `npm.cmd audit` | PASS | Zero vulnerabilities |
| Visual inspection | PASS | Firefox desktop and 390px mobile screenshots inspected; mobile overflow assertion passes |
| Real microphone, audible voice quality, installed spellcheck dictionary | NOT RUN | Automated tests use simulated streams/voices or capability fallbacks, not physical hardware |

The first browser run reused a different M1 development server on port 5173. Tests now start their own server on port 4173 and refuse to reuse an unrelated server. Subsequent testing caught accessible-name mismatches in the start/voice controls; those were fixed. Unit testing caught overly restrictive contextual-word filtering; it was fixed. No unresolved automated failures remain.

## Manual Firefox checklist

1. Use your existing origin and confirm previous history and any paused lesson remain. Optionally export a private backup before reviewing.
2. Start a lesson and inspect the English instructions. Try the wrong-case writing answer, a different valid phrasing, a hint, and a skip. Confirm reports distinguish partial credit from unscored/missing work.
3. Install/select a German Firefox dictionary if desired; check German/English input-language selection and both off switches. A `lang` attribute alone cannot install a dictionary. See [Mozilla's spellchecker guide](https://support.mozilla.org/en-US/kb/how-do-i-use-firefox-spell-checker).
4. In Settings, choose an installed local German voice and preview it. Change volume/rate and disable speech. If silent or unavailable, verify the text fallback. Remote voices remain off unless deliberately selected and allowed; labels follow the browser's [localService flag](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService).
5. Request microphone access, hold/release using pointer and keyboard, watch the input meter/timer, allow diagnostic replay, replay and discard. Repeat with permission denied. Pause/navigate away while recording and verify Firefox's microphone indicator turns off.
6. Turn effects on, unmute, lower volume and test the tone. Mute immediately. Enable reduced motion and high contrast; inspect text size. Reload to verify persistence.
7. Run a progress check from My progress. Inspect skill denominators, recommendations and later-check comparisons. Four forms rotate; repeated forms are not a new certified placement test.

## Known boundaries

- Grading is a transparent, bounded local rubric, not general German-language understanding. Unsupported but plausible responses remain unscored and require later review. They are not automatically sent to anyone for review.
- The dictionary is deliberately modest. Full translations, automatic transcription, pronunciation assessment and live conversation remain later work.
- Four assessment forms eventually repeat; comparisons are descriptive and may reflect different questions or assistance. They are not certified CEFR estimates.
- A2 difficulty and English explanations are the only implemented content modes and are clearly identified as such. Other levels/languages require future lesson content.
- Replay and input-level metering depend on browser/device support. Native voice availability and quality are device-dependent. Remote browser voices are a separate explicit privacy opt-in, not a configured paid service.
- Only outcome records are durable. An unfinished typed draft is not persisted; an abrupt close can lose the most recent partial second of active time.

## Files

`src/App.tsx`, `src/content.ts`, `src/engine.ts`, `src/domain.ts`, `src/persistence.ts`, `src/preferences.tsx`, `src/SettingsPanel.tsx`, `src/WordHelp.tsx`, `src/SpeechPanel.tsx`, `src/SpeechControls.tsx`, `src/sounds.ts`, `src/providers.ts`, `src/main.tsx`, `src/styles.css`, `src/domain.test.ts`, `tests/lesson.spec.ts`, `tests/enhancements.spec.ts`, `playwright.config.ts`, `README.md`, and this report.

Stop at M1.1. Review this pull request before merging. No M2 work has begun.
