# Milestone 1.1 — Usability, rewards, grading, help, settings and speech diagnostics

Status: APPROVED REQUIREMENTS / NOT YET IMPLEMENTED. Follow the original A2 + teacher-persona requirements. M1 passed on main. This milestone is local/offline only, no new cloud or paid service.

## 1. English-first instructions and layout
- Every activity must have a prominent **INSTRUCTIONS (ENGLISH)** panel immediately above the question/input. Clearly specify the task ("Translate into German", "Read and answer in German", "Listen and answer in English or German", "Speak and type what you said"), the expected response language, what is scored, whether multiple answers are valid, and whether speaking is actually transcribed.
- Differentiate German reading/listening material visually from English instructions. A user shouldn't have to infer what to do from a German question alone.
- Use examples only when they do not reveal the graded answer. Keep prompts accessible and keyboard friendly.
- Add persistent 'Help' control beside each activity plus a clearly identifiable Settings tab in main navigation.

## 2. Contextual word help, without solving the whole problem
- User can select a single German word or short phrase in visible lesson text, then click “Ask Frau Helga about this”. Also allow keyboard-friendly word lookup input / click-a-word alternative.
- For the selected term only, show short English meaning, part of speech, article/plural or relevant verb form, one short original example and optional German pronunciation via the available speech provider. When spelling is ambiguous, identify context or ask clarification.
- Do **not** translate the entire paragraph, reveal the full correct answer, complete the exercise, auto-submit, or alter its score. A hint must be pedagogical, context-bound, and accessible.
- Add a 'What does this instruction mean?' help button for complex grammar terminology; explain the concept, not the answer.
- M1.1 uses a modest curated dictionary of original/local content only. Define a WordHelpProvider interface so a secure Gemini-backed provider may replace it later.

## 3. Partial-credit grading
- Replace binary 100/0 grading for free-text exercises with an explainable, deterministic rubric. Grades should award demonstrated knowledge and distinguish valid variants, minor spelling/capitalization, grammar/case/word-order errors, and incorrect meaning.
- Track at least {score: 0..100, status: correct|partial|incorrect|needs_review|skipped, rubric_parts: [{criterion, awarded, possible, message}], error_tags:[], assisted:boolean}. Preserve the existing first-attempt score policy; later retry attempts do not overwrite it.
- E.g. appropriate writing components: meaning 40%, core verb and tense 25%, word order 20%, case/articles and orthography 15%. Use activity-specific rubrics and deterministic checks, not a universal substring score. One wrong article with otherwise correct meaning should NOT be zero. Spelling/capitalization mistakes are minor, not wholesale failure.
- The existing exact-answer matcher is limited. If an answer is plausible but outside known patterns, mark **Needs review — unscored** rather than claiming a 0/100 incorrect grade. Explain what was recognized and what wasn't; do not fabricate precision or use “unrecognized=0” in overall averages. Exclude needs_review from assessed averages and report their count separately.
- Exercises with known incompatible meaning should receive low/zero credit; skipped work marked missing rather than treated as demonstrated zero knowledge. Assessment and skill reports should show denominators and “not graded” status transparently.
- Keep answer privacy: do not persist raw free-text by default; save structured rubric outcomes/error tags and data versions. Clear distinction between vocabulary multiple choice, comprehension, constrained grammar writing and free conversation.
- Support robust unit tests for variants and partial-credit cases: one missing article, wrong case only, capitalization only, synonym, unknown plausible sentence, clear wrong meaning, skip, retry, and summary averages.

## 4. Gentle gamification
- Add teacher-themed XP/Goldsterne, practice streak, mastery badges, weekly challenge, progress bar and subtle confetti/visual micro-celebration on genuine achievement. Focus rewards on progress/consistency/effort, not punitive penalties for requesting help.
- Give friendly Frau Helga reward messages; keep them age-appropriate, restrained and not distracting. Separate earned XP from proficiency scores so practice/repeats can't manufacture skill mastery.
- Play short, low-volume **original synthesized** UI sounds on success, lesson completion, badge earned, and optionally incorrect answer. Use Web Audio API, unlocked from a user gesture; no third-party music or copyrighted audio.
- Sound effects default to user choice, independently switchable at any time (global button and Settings), volume 0–100, muted state persisted; respect prefers-reduced-motion for animations. Sound events should be cancellable and not overlap aggressively.

## 5. Robust Settings panel (persistent)
Organize into sections, accessible from every screen:
- **Sound:** SFX enabled, SFX volume, test sound; separate spoken-voice enabled and volume/speaking rate controls.
- **Voice & microphone:** all discoverable voices with language/localService labels, voice preview button, German-only preferred, no suitable voice explanation; recording diagnostics/test, microphone permission state, selected device if browser exposes it, playback consent and cleanup.
- **Learning:** daily target (default 30m), difficulty target (A2 self-assessed), explanation language (default English), correction detail level, help accessibility, review frequency and weekly assessment preference.
- **Display & accessibility:** text size, reduced motion, high contrast, keyboard help.
- **Spelling:** German-answer spellcheck controls and English instruction/help spellcheck. Set input lang to de-DE for German answers and en for English, and spellCheck based on selected preference. Explicitly explain that Firefox spellcheck dictionaries are installed in Firefox/OS and lang alone cannot add a missing German dictionary; offer a clear off switch to avoid English red squiggles.
- **Data & privacy:** local data summary, delete progress with confirmation, reset settings with confirmation, export/import non-sensitive settings/progress after validation (no secrets/audio/raw responses). Use versioned localStorage keys, preserve existing M1 progress by migration with tests. Fail gracefully if storage unavailable.
- Include 'Restore defaults' and settings persistence across browser reload, navigation and new lesson; settings changes should apply immediately.

## 6. Weekly progress assessment
- Offer a weekly short diagnostic, either after seven calendar days since first completed lesson/last assessment OR five completed lessons, whichever comes first; one reminder/banner, no forced interruption and no scheduled notification.
- Include unseen/original A2 questions across the five skills. Distinguish diagnostic from daily practice; generate multiple deterministic local variants/seeded questions. Track trend against prior assessments, skill-specific needs, error categories and personalized study recommendations. Show “A2 self-assessed — progress check, not a certified CEFR exam.”
- Do not claim to grade actual pronunciation until a genuine voice assessor exists. Use manual transcript text for spoken content only and label it.

## 7. Recording behavior and voice fallback
### Current code audit finding
- Existing src/SpeechControls.tsx records audio via MediaRecorder for a hold, but **discards it on release**. src/providers.ts mockTranscriptionProvider ignores audio; user must type a transcript. This is by design in M1, but the UI must make it unmistakable.
- Existing browserSpeechProvider.voices filters /^de[-_]DE$/ and localService, which can exclude usable browser voices.
### M1.1 improvements
- Expose clear states: mic unavailable, asking permission, recording, recording stopped, no transcription provider enabled, and failed. Add small live input-level meter (AudioContext/AnalyserNode if permitted) and elapsed duration. No remote audio processing.
- User-controlled **Replay my last clip** for the current exercise in-memory only, with discard button. Default: discard clip on activity change, pause, closing tab or explicit delete. No persistent storage or upload. Audio replay must be labeled as a diagnostic, NOT scoring.
- Correct pointer and keyboard hold behavior; prevent stuck microphone recording, release all tracks/object URLs and audio contexts, handle permission-denied and delayed permissions. Add simple microphone test in settings.
- Voice provider: list all voices for languages starting with de (de-DE, de-AT, de-CH, etc.), optionally remote voices marked clearly as such and OFF by default unless selected; no assumption that the browser has any German voice. Persist voice preference and provide test button.
- If no German voice is usable, show clear guidance for installing a compatible German voice in Windows/Firefox; text fallback always works. **Do not secretly use external TTS**. Define a replaceable TTS provider interface for future ElevenLabs.
### Future milestone, NOT M1.1
- True automatic transcription and meaningful conversational response via Gemini audio API, using short clips uploaded only with explicit consent and a server-side API key; discard server audio after processing, retain transcripts/corrections with consent. ElevenLabs is OPTIONAL voice synthesis only, behind provider selection and quota/billing controls.

## 8. Tests and acceptance
- Run npm ci, npm run typecheck, npm test, npm run build, npm run test:firefox.
- Add browser tests for: English instructions location; word-level help doesn't reveal answer; partial credit variants and unknown answers; settings changes + reload; muted sound + reward event; reduced motion; German input lang/spellcheck; weekly assessment scheduling and trend; microphone denied/record/replay/discard with mocked streams; voice discovery with local de-DE, remote de-AT and none; old local data migration; non-persistence of raw audio; report preview includes assessed/not-assessed breakdown.
- Test and document any real-hardware limitation. Don't claim a physical voice/mic PASS from mock-only tests.
- Branch: feature/m1-1-learning-ux. Open a PR against main; no merge until user approves.
- No Gemini credentials/calls, Cloudflare provisioning, live report sends, ElevenLabs API requests, paid activation or public personal records in M1.1.
