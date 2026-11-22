# Frau Helga — Execution Plan Starting at Step 5

**Status as of November 22, 2026**
- User reports Steps 1–4 (voice test, reusable phrases, persistent cache, and live-on-demand usage) as completed in their working environment. **Do not erase or redo those assets.** However, current public GitHub shows M1.1 merged into `main`; M1.2 ElevenLabs PR #5 remains draft/unmerged and still contains a session-memory-only cache. First audit any extra local/off-repo work and reconcile it with GitHub before making claims about persistent cache or voice test results.
- Selected custom ElevenLabs voice is stored **privately** in server config. Do not put the selected ID or API key in public source or `VITE_*`. All new work must preserve offline safety, user consent, learner progress and $0 preference; $5/month is NOT purchase authorization.
- The local classroom is already A2 with compact layout, English directions, a partial-credit demo, word help, weekly progress check, rewards and local microphone replay. These remain regression requirements.

## Step 5 — Make voice fallback automatic and reliable (CURRENT FIRST TASK)

### User experience
- One simple **Audio & Voice** Settings area with provider preference `Frau Helga / Installed German / Text only`; volume, speed, mute, test, output status, and clear credit/data indicators. Do not conflate mic input, sound effects, native TTS and ElevenLabs TTS.
- At playback time use this deterministic precedence:
  1. A matching permitted, previously generated **local/persistently cached clip** of the selected voice (no credits and no network).
  2. An explicitly consented ElevenLabs request **only** if online, a restricted private key/server are available and free-credit provider/budget checks pass; persist newly generated original nonpersonal lesson clips if Stage 1–4 cache is operational and legally permitted. No retries after ambiguous upstream failures unless validated not charged.
  3. A locally installed German system voice (`de-DE`, `de-AT`, `de-CH`) selected by the user; never silently use a remote OS/browser voice that could transmit text.
  4. Text displayed immediately and fully usable if no voice. No blocking modal, disabled lesson or lost score.
- A quiet, plain-English status: `Playing saved Frau Helga clip`, `Using installed German voice — no credits`, or `No voice available — lesson continues in text`. Explain the cause (server off, offline, permissions, quota, selected voice unavailable) without leaking keys or upstream response bodies.
- A concise `Test speaker` action separate from `Test Frau Helga` and `Test microphone`. Test speaker requires no external API and checks browser audio. Respect persistent voice-enabled, volume, sound-effect toggles, rate, keyboard access, and reduced motion. Stop/Pause/Resume always free hardware resources.
- Settings page adds `Stored Frau Helga audio: N clips, X MB`, `Clear saved audio` confirm, and `Download standard lesson clips` opt-in, if persistent cache is available. Never cache private learner speech or personalized feedback by default. If persistent cache was not actually built, say so and implement/test it as dependency rather than claiming it complete.

### Engineering + acceptance
- Reconcile PR #5 (older M1.1 stack) against now-merged `main` BEFORE adding changes; do not overwrite compact classroom or intent-aware grading. Preserve all existing privacy and origin storage migrations. No automatic PR merge or public deploy.
- One `SpeechOutputCoordinator` chooses cached → consented ElevenLabs → native local voice → text-only. Robust timeouts/cancel, avoid repeat charges, no implicit remote voice, prevent double playback. When no German OS voice exists, fallback to readable text, not English-accented German.
- CI/manual matrix: offline; voice server down; key missing; quota depleted; remote TTS throws; no local German voice; local German voice present; cache hit after restart; audio muted; user cancels before playback; privacy consent off/on; Firefox microphone unaffected. Test no upstream calls for all blocked/fallback cases. Verify cached clips exist at rest under intended private storage only.
- When a live provider test is not run, label **NOT RUN** even if mocks pass. Work first on `feature/m2-5-voice-fallback` *after* safe M1.2 reconciliation; open PR and stop for owner review.
- Existing free-tier protections and active locally cached speech must not silently change when implementing this step.

## Step 6 — Make speaking practice real (German speech to text)
- The classroom record flow is `Record (up to 20 seconds) → Stop → Replay → Transcribe German (explicit upload consent) → Editable transcript → Check answer → Continue`. Provide clear mic access indicator and simple permission diagnosis; stop tracks and discard audio on pause/navigation/tab exit.
- Compare ElevenLabs Scribe (supports German; same account/credit pool as Frau Helga TTS), Gemini speech features, and a wholly local speech-to-text alternative. Choose a verified provider based on available free-tier credits, privacy terms, accuracy and Firefox audio format support. A server-only key, restricted route, rate/quota caps and explicit per-clip consent are mandatory for hosted STT. No browser API key, and no audio uploaded automatically.
- Never persist raw microphone audio/server transcript by default. If transcription returns uncertainty, expose it; don't invent a confidence number when provider returns none. Allow transcript corrections by learner before grading; offer manual typing if STT fails. Keep a 1 MB/20-second starting cap, refine after format/accuracy tests.
- Reuse known short audio first: "Ich fahre am Samstag mit dem Zug." and an intentional wrong sentence. Test German umlauts, capitalization, silence, noisy clip, denial, quota exhausted, slow requests and retries.
- After transcript, display **`Pronunciation not assessed`**. Transcript quality and grammatical accuracy do not validate German accent or individual phonemes.

## Step 7 — Meaningful German grading and feedback
- Keep the local structured rubric when offline; optionally add server-side semantic assessment only on explicit opt-in. Never send credentials, household details or learner recordings to public repos. Keep raw free text private by default and show who processes it.
- Build validated response JSON: question intent, expected answer language, semantic correctness, vocabulary, verb/tense, case/articles, word order, spelling, task-following, rubric parts, confidence and plain-English feedback. Model is advisory; reject malformed/inconsistent outputs and fall back to `Needs review`, not false 0 or 100.
- Output three short parts: `What you understood`, `What to correct`, `Better German answer`, with a 1-click **Try again / Continue** flow. Preserve first-attempt score, disclose assisted grading, and avoid duplicate credit on retry.
- Regression: learner reads a passage in English instead of answering the German destination question; still recognize Bonn comprehension but explain the task mismatch and correct afternoon/walk-by-Rhine errors. Test negation/counterexamples, alternative correct phrases, wrong articles and mixed German/English.
- No numerical pronunciation grades until a separately validated audio-based assessor exists. Permit **Listen to my clip** and self-review.

## Step 8 — Turn the demo into a daily tutor
- Retain compact lesson layout tested at 1100×650, mobile reflow, optional teacher help drawer, obvious English instructions, accessible selected-word help, German spellcheck and muted-by-default mild synthesized rewards.
- Expand beyond the same six static activities with a safe bank of original A2 content by skill/theme; rotate and revisit missed concepts. Allow practical conversations (relatives, shopping, train travel, work, German life); support a flexible 30-minute target and pause/resume. Add at least 3 distinct lesson variants for beta acceptance; specify milestone for larger generative curriculum.
- Incorporate optional weekly/after-five-lessons self-check, skill trend and spaced review. Display `A2 self-assessed — not a certified CEFR test`. Neither XP nor lesson repeats should inflate mastery scores.
- Keep Frau Helga firm but kind with mature dry humor, audio cues restrained, help without revealing whole exercise. Offline path still works with original content.

## Step 9 — Settings, records, and spouse-report preview
- Confirm all settings persist: preferred voice/output source; TTS/STT consent (per visit/clip, no permanent silent consent), spoken-voice/SFX independent volumes and mute; speech speed; offline status; access/credit totals; text size/high-contrast/reduced motion; spellcheck for German answers with Firefox dictionary guidance; 30-minute target; weekly progress check; delete/backup/restore with confirmation.
- Export and import outcomes across local `127.0.0.1:5173` and a future protected domain; no assumption localStorage migrates by itself. Preserve saved attempts, dates, reports and first-attempt assessment; do not save raw audio.
- Keep spouse report in **PREVIEW — NOT SENT** state until explicitly authorized. Later allow an opted-in secure sender and spouse feedback that influences lesson plans but cannot change existing grades. Store real email addresses privately, not in a public repo.

## Step 10 — Publish PRIVATE protected beta (not a public page)
- Use Cloudflare Worker + static assets, a verified Cloudflare Access policy attached to the entire Worker (all hostnames, previews and API routes), and verify JWT server-side before any billable endpoint. Owner allowlist, CSRF, short sessions, denial by default, account and HTTP rate limiting.
- Secrets live in Worker secret bindings; replace Node-local quota ledger with atomic Durable Object/D1 reservations so simultaneous requests cannot overspend. Cloud hosting **must not** expose `127.0.0.1:8787` Node server or private audio cache on public endpoints.
- Build/test on staging; automated tests verify anonymous user blocked, logged-in owner allowed, logs contain no private content, voice and STT fail closed if free caps are exhausted. Do not deploy before explicit authorization and account verification.
- Transfer progress by validated export/import. Test Firefox Windows and Pixel Android on real HTTPS, microphone permissions, logout and revocation, offline fallback and rollback.
- $0 preferred, $5/month ceiling only if separately approved. Disable PAYG and provider billing overages; inspect current plans/credit rules and licensing. No surprising subscription or public URL. Status: planned, no published site yet.

## Step 11 — Beta acceptance and later features
- Manual 20–30 minute session across vocabulary, reading, writing, listening, real spoken answers, feedback, adaptive review, weekly check, audio output and reward sounds.
- Confirm stable browser performance and no unnecessary scroll; clear errors and short onboarding, ability to mute/switch voice, keyboard and accessible mobile UI.
- Verify provider usage before/after test, persistence after restart, secrets out of build output, and no real email sent. Record PASS / FAIL / NOT RUN with Firefox screenshots and known limitations.
- Defer fully automated spouse email, advanced pronunciation/phoneme grading, complete B1 curriculum, push reminders, Android native package, and integrations with copyrighted book libraries until separately authorized.

## Official sources to verify at implementation time
- ElevenLabs speech-to-text: https://elevenlabs.io/docs/overview/capabilities/speech-to-text
- ElevenLabs API transcript: https://elevenlabs.io/docs/api-reference/speech-to-text/convert
- ElevenLabs TTS streaming: https://elevenlabs.io/docs/eleven-api/guides/how-to/text-to-speech/streaming
- Cloudflare Worker Access: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
- Cloudflare protected workers.dev routes: https://developers.cloudflare.com/workers/configuration/routing/workers-dev/

## Nonnegotiable
No published public site, billable API activation, API credentials/voice ID in public GitHub, deletion of user data, or merge of conflicting M1.2 PR #5 without review. Ask before an external paid or privacy-sensitive action; complete mock/local stages first.
