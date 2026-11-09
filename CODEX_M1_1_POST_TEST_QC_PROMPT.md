# Codex task: revise PR #3 following actual user Firefox test

Continue in the **existing** repository `briang7165/frau-helga-deutsch-tutor`, branch `feature/m1-1-learning-ux`. PR #3 is open and awaiting approval. **Do not create a new base branch or merge.**

## Read
- docs/M1_1_POST_TEST_QC.md (primary acceptance criteria — actual user findings)
- docs/M1_1_PRODUCT_ENHANCEMENTS.md
- docs/M1_1_ACCEPTANCE_REPORT.md
- AGENTS.md; README.md; current src/App.tsx, src/styles.css, src/engine.ts, src/SpeechPanel.tsx, src/preferences.tsx, src/sounds.ts, and relevant tests.

## Do the work (prioritized)
1. Compact responsive classroom for split-screen Firefox: collapsible sidebar, compact teacher drawer, less redundant header, clear task-and-answer visual hierarchy. Feedback must not jump the page or hide the Continue action. Fit a typical short exercise in 1100x650 if feasible without tiny text or clipping. Keep keyboard, zoom and mobile access.
2. **Intent-aware English-first grading/feedback for the exact r1 case**, which asks `Wohin fährt Nora am Samstag?`. Original passage: `Am Samstag fährt Nora mit dem Zug nach Bonn. Sie besucht ihren Bruder. Am Nachmittag gehen sie am Rhein spazieren.`. User's example reply: `On Saturday Nora goes by train to Bonn. She visits her brother. At night she goes to the Rhein Space.` The response is a partial English translation rather than a German destination answer. It contains correct evidence (Bonn, train, brother), wrong detail (afternoon ≠ night; walking by Rhine ≠ “Rhein Space”), wrong response language, wrong task. Give transparent justified partial credit **only for what can be validated**, plus short meaningful corrective feedback. Don't pretend to universally understand English/German free text with local regex. Contradictions or negation must not get credit simply for mentioning Bonn. Unknown cases may still be unscored with actionable feedback.
3. Make screen flow effortless: short clear English directions in 1–2 lines, expected language visible, compact rubric initially collapsed, easy retry/continue buttons, live-region feedback and focus, practice can progress without reading lengthy policy text.
4. Add first-run sound and voice diagnostics. Existing sound settings default `sfx:false` and `muted:true`; expose easy explicit enable/test sound, with volume and user gesture for WebAudio. Check installed German voice options and user-selected remote voice consent; say clearly if no TTS voice exists. Clearly distinguish microphone diagnostic recording from actual speech transcription/grading. Do not fake transcript or spoken feedback.
5. Add regression/acceptance tests, including Firefox screenshots at **1100x650** (before and after answer), 1280x720, and 390px mobile, and tests for fixed grading edge cases and microphone/no-voice/silent-sfx UX.

## Rules and handoff
- All work must remain local. No Gemini, ElevenLabs, Cloudflare, Gmail, external API keys, billing or external audio uploads.
- Preserve current data and migration; no surprises to original M1 user profile or settings.
- Run npm.cmd ci; npm.cmd run typecheck; npm.cmd test; npm.cmd run build; npm.cmd run test:firefox; npm.cmd audit. Record exact results and known limitations.
- Commit/push changes to `feature/m1-1-learning-ux` so PR #3 updates automatically. Add new review details to docs/M1_1_ACCEPTANCE_REPORT.md.
- Report concise user-facing list: changes, test results, instructions to run locally, whether a physical audio test was performed, screenshot paths, what remains for live AI/voice.
- Stop for review and **DO NOT merge/deploy**. 
