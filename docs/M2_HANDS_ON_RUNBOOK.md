# Frau Helga — Hands-on Runbook: Step 5 to Private Beta

As of 2026-11-22. For exact scope see `docs/M2_STEPS_5_TO_11_EXECUTION.md`. **Only M1.1 is merged.** PR #5 remains draft and conflicting; persistent saved audio, real speech transcription, and a hosted site are NOT established by GitHub. Do not blindly merge/overwrite local changes. The user reports earlier voice/cache work completed locally; audit it first.

## 0 — Back up the current classroom BEFORE branch changes

1. In Firefox open `http://127.0.0.1:5173` with the existing local server running.
2. Select **Settings** in the classroom navigation.
3. Scroll to **Data & privacy** and select **Export settings and progress**. Keep the downloaded JSON privately, outside public GitHub. Do not select **Clear local progress**.
4. In PowerShell:
   ```powershell
   cd "$env:USERPROFILE\Documents\Frau-Helga-Local"
   git status --short
   git branch --show-current
   git fetch origin
   ```
   If the path does not exist, use original Codex checkout path, or locate the checked-out repository. If `git status --short` shows modified/unknown files, do NOT reset, clean, or switch branches until backed up.

## 5 — Start implementation of automatic voice fallback

1. Open **Codex** desktop/website, select the existing **Frau Helga repository** project/chat (not a new unrelated repo), paste:
   ```text
   Work in briang7165/frau-helga-deutsch-tutor.
   Read AGENTS.md, docs/M2_STEPS_5_TO_11_EXECUTION.md,
   CODEX_M2_STEP5_VOICE_FALLBACK_PROMPT.md and Issue #7.
   Audit existing private audio/cache and local uncommitted changes first.
   Preserve them and all 2026-11-15 M1.1 classroom fixes.
   Reconcile draft PR #5 against current main, without blindly overwriting.
   Implement the Step 5 saved clip -> consented ElevenLabs -> strictly
   local German voice -> text-only fallback, status messages and settings.
   Build tests and run npm.cmd ci, typecheck, voice:typecheck, test,
   build, test:voice-bundle, test:firefox, audit.
   Push a reviewable feature/m2-5-voice-fallback branch and PR.
   Do not merge, deploy, enable billing or make live provider calls.
   ```
2. When Codex reports the PR, open that PR in GitHub **Files changed** and **Checks**. Do not merge if checks fail, branch conflicts, or tests are missing. Use actual branch name printed by Codex.
3. In PowerShell, after a clean working tree:
   ```powershell
   git fetch origin
   git switch feature/m2-5-voice-fallback
   npm.cmd ci
   npm.cmd run typecheck
   npm.cmd test
   npm.cmd run voice:typecheck
   npm.cmd run build
   npm.cmd run test:voice-bundle
   npm.cmd run test:firefox
   npm.cmd audit
   ```
4. If voice server is present, use `New-Item -ItemType Directory -Force private`, and only if missing `private/.env.voice`, copy `server/.env.example` to `private/.env.voice`. Use Notepad locally; keep `ELEVENLABS_LIVE_ENABLED=false` for offline test.
5. In two PowerShell terminals from the feature checkout: first `npm.cmd run voice:server`, second `npm.cmd run dev`; open the **same** Firefox origin `http://127.0.0.1:5173`.
6. Settings should display preferred speaker, **Test speaker** (no paid API), **Test Frau Helga voice** (consent-gated) and **Test microphone** (recording diagnostic, not grading), plus cache count/delete after implementation. Use mute/volume/stop. Disconnect Wi-Fi/stop voice server to test fallback. Expect a local German voice if Firefox exposes one, otherwise legible text.
7. Optional local fallback voice: Windows `Win + Ctrl + N` → Narrator voices → **Add legacy voices** → **Manage voices** → **Add voices** → **German (Germany)**, then restart Firefox. The voice must appear in Firefox's voice selector; if it doesn't, keep text fallback. See Microsoft support documentation.
8. Live voice test (optional after code review): ElevenLabs app → profile/account → **API keys** → create **restricted key** with text-to-speech and needed read permissions and small credit quota. Confirm a free account and overages disabled. Paste into private file `ELEVENLABS_API_KEY=` along with `ELEVENLABS_VOICE_ID=` selected voice privately. Set `ELEVENLABS_LIVE_ENABLED=true`; restart voice server. In Firefox Settings, explicitly opt in and click **Test Frau Helga's voice** once; inspect account credit usage. Restore enabled=false afterward. Never put key in chat, Github, screenshots or client source. This test consumes provider free credits if it runs.

## 6 — Codex: real German microphone transcription

After Step 5 passes review/merges, open Codex and instruct it to implement Step 6 in `feature/m2-6-german-stt`: `MediaRecorder` recorded clip ≤20 sec → replay → explicit **Transcribe** consent → server-side Scribe/Gemini/local provider → editable `de-DE` transcript → grade text → continue. No claim of phonetic/pronunciation scoring. Audio/keys not persisted or sent without consent. Mocks + Firefox tests; restricted free quota; PR only, not auto-merge.
When finished, check out the PR branch and start the app as for Step 5. In Firefox: lesson → speaking → hold record → say `Ich fahre am Samstag mit dem Zug.` → stop → replay → click Transcribe → edit if necessary. Confirm microphone stops, audio deleted, no surprise credits. If API is still mocked, real transcription should be marked NOT RUN.

## 7 — Codex: meaningful answer grading

After Step 6, ask Codex in a separate PR `feature/m2-7-feedback` to add server-side semantic feedback with strict JSON schema, transparent partial credit, offline fallback and grammar/meaning/task compliance explanations; protect user text/keys. Test Nora/Bonn example, negation, alternative responses, case/articles and unscored unknown cases. In Firefox, submit `Ich gehe mit mein Freund in den Park` and confirm targeted dative correction and justified partial points; no pronunciation score from text.

## 8 — Codex: repeatable daily lessons

Ask Codex for `feature/m2-8-lessons`: original A2 lesson bank with at least 3 genuinely distinct sessions, daily 30-minute target, reading/writing/listening/speaking, selected-word help, spaced review from past error tags, weekly checks, Goldsterne, English directions. Check three consecutive sessions for new content and useful review. No copyrighted textbook passages.

## 9 — Codex: settings, progress and spouse preview

Ask Codex for `feature/m2-9-settings`: persist audio preferences, independent effects/voice volume, privacy/consent, German spellcheck guidance, compact layout, lesson goal, weekly self-check; validate local progress export/import. Use Firefox Settings → **Data & privacy → Export settings and progress**, keep private JSON, test a clean-browser import (not destructive overwrite). Keep spouse report **PREVIEW — NOT SENT**. Future email requires separate approval.

## 10 — Codex/Cloudflare: protect, then publish

**Do not publish until the hosted Worker with authenticated user identity, protected assets/API, secrets, durable quota and logout is implemented and reviewed.**

1. Open https://dash.cloudflare.com and log in. Verify Workers Free plan and that no paid billing/overages are activated.
2. Ask Codex for a private Cloudflare Worker + assets, separate `feature/m2-10-private-beta` PR, with no deployment before review. Require Cloudflare Access `ctx.access` authorization, fail-closed no-identity state, account owner allowlist, durable usage ledger (DO/D1), server-only API keys, static assets and API behind Access. Code must include correct `wrangler` configuration and a runbook.
3. After reviews and a deployment approval, connect Cloudflare locally via PowerShell `npx.cmd wrangler login` (requires browser login), but do not issue `wrangler deploy` until deployment is specifically approved, free-tier and Access controls are ready.
4. In Cloudflare dashboard: **Workers & Pages → your Worker → Access → Protect this Worker behind Access → All traffic → Authentication policy** limited to the owner. Verify the specific Worker is restricted, including previews and every hostname. This control is available in the 2026 Cloudflare Workers UI. Where feasible set policy before allowing external traffic, and deploy only a non-secret denial-by-default version first.
5. Test an anonymous/incognito visitor cannot load either the app or any `/api/*` endpoint. Test permitted owner sign-in. Only after verified protection, install keys using **Worker secrets** according to the Codex runbook, never public Environment Variables, source, or `VITE_` variables.
6. Import localhost progress via the app's Data & privacy import; local `127.0.0.1:5173` history is not automatically available on the new site.
7. Test from Windows Firefox and Pixel over HTTPS. Confirm audio permission, login/logout, offline fallback, credit quotas, and zero unexpected fees.

## 11 — Beta acceptance

1. Log in to protected site; verify anonymous browser blocked.
2. Complete a 20–30 min daily lesson: read/listen, type, record, transcribe/verify, get feedback, continue, finish, see reward and report preview.
3. Repeat a known audio phrase after restart to verify persistent cache; confirm provider credits unchanged for cache hit.
4. Disable internet, revoke microphone permission, exhaust/mock quota and confirm lessons remain usable.
5. Export progress, close/reopen browser and confirm saved outcomes/Settings; check mobile narrow view and high contrast.
6. Review provider usage dashboards. Do not enable paid subscription or send real spouse email by default.

**Repository references:** `docs/M2_STEPS_5_TO_11_EXECUTION.md`, `CODEX_M2_STEP5_VOICE_FALLBACK_PROMPT.md`, [Step 5 issue #7](https://github.com/briang7165/frau-helga-deutsch-tutor/issues/7).
