# Step 5 — saved voice and safe fallback

## Scope and preservation audit

Review branch: `feature/m2-5-voice-fallback`, based on main `8e6e0d3`. Related: Issue #7. PR #5 commits `16ca617` and `54a8fa6` were cherry-picked, retaining main's README and merged PR #3 classroom. Neither existing PR branch was rewritten. Steps 6–11 remain out of scope.

The three existing project checkouts were clean. No saved audio or persistent voice cache was found in their project directories, including ignored files (excluding dependencies, Git internals and generated test/build artifacts). The existing M1.2 private configuration was preserved. The owner confirmed permanent generation/cache had never been verified. No Downloads search, deletion, reset, migration of recordings, or alteration of existing browser progress was performed. No running classroom was available for a progress export; that export is NOT RUN. A fourth, isolated worktree contains this implementation. Its new ignored configuration keeps live synthesis off, the key blank and reuse off; only the selected voice identity was copied privately.

## Behavior

A voice button uses the selected provider:

1. Frau Helga: matching browser-saved audio first, then private server saved audio, then consented ElevenLabs, then installed LOCAL German speech, then text.
2. Installed German: local speech only, no voice HTTP requests.
3. Text: no audio or voice HTTP requests.

No request occurs on page load or consent-toggle. Read-only cache requests never call ElevenLabs. Browser cache hits use no network; private server cache hits use only loopback HTTP, bypass provider preflight and quota reservation. The original allowlist excludes learner answers and microphone recordings. Unlisted word-help text uses local speech/text. A missing or corrupt cache does not trigger an uncontrolled retry. Ambiguous synthesis failures are not retried for that phrase during the current visit. Stop can abort playback/request delivery but cannot refund already-submitted synthesis.

Settings retain voice choice, local voice, speed, volume, mute, and browser-save preference. ElevenLabs consent resets on reload. Remote browser voices are excluded even if a legacy setting previously allowed them. Speaker effects, voice and microphone checks stay separate. Compact classroom, grading, progress, weekly assessments and microphone consent remain intact.

## Private persistence and limits

- Server: ignored `private/voice-cache-v1/<opaque voice-model hash>/`, one exclusive-create JSON audio record per normalized original text hash. Audio is base64 with SHA-256 integrity checking, not encryption. No credentials, voice ID or learner text is stored in records or exposed in browser metadata. Protect the OS account/disk; this is not public hosting authentication.
- Reuse requires `VOICE_CACHE_REUSE_ALLOWED=true` after the owner verifies permission/license to retain and replay the selected voice's output. It defaults false. Changing voice/model selects a separate namespace and leaves existing files untouched. With reuse off, old files remain but are not read/countable/cleared through the app.
- Browser: separate IndexedDB `frau-helga-saved-voice-v1`; opt-in saves only original clips. Download standard lesson clips copies already-saved server clips and never generates missing ones. Offline playback uses the last downloaded library; refresh/download after a private voice change. Browser storage can be evicted/cleared by Firefox and is origin-specific; disk cache is the durable local source.
- Limits: 2 MB audio per clip, 50 MB decoded audio per server namespace and 50 MB/64 clips in browser. Disk JSON/base64 takes approximately one-third more space; displayed MB is audio payload usage. Historical namespaces remain until deliberately reviewed by the owner. In-memory cache is bounded to 12 clips.
- Confirmed Clear saved audio removes only owned browser records and validated records in the active server namespace. It never clears learner progress, recordings, unknown files, other namespaces or quota counters. Corrupt files fail closed and remain for manual review. If the server is unavailable, the UI reports browser-only clearing and unknown server state.
- The backend remains single-process loopback-only with exact Origin/Host, custom header, random session token and bounded bodies. Cache routes need the token; clearing additionally needs confirmation. A local session grants no consent to synthesize. Private/source/build routes are blocked by Vite.
- Free-tier checks from PR #5 remain: explicit zero `max_credit_limit_extension`, no paid/extendable tier or contradictory deprecated fields, model/voice eligibility and remaining free credits. Missing/unknown critical billing fields fail closed. Caps are 300 characters/request, 600/session, 1200/day, 3000/month, six synthesis requests/minute, 15-second upstream timeout and a 100-character free-credit buffer. Reservations precede synthesis and survive restart. App caps do not guarantee provider account billing controls.

## Windows launch and authorized future test

Use Node 22.12+ and keep the same Firefox profile, hostname and port as existing progress. Export progress from Settings before changing origins. The export does not contain audio. Existing checkouts remain available for rollback.

```powershell
git switch feature/m2-5-voice-fallback
npm.cmd ci
npm.cmd run dev
```

Open `http://127.0.0.1:5173` in Firefox. Local German/text fallback needs no key or server. For private saved-cache playback, in a second terminal at the same checkout:

```powershell
# Only if private/.env.voice does not already exist:
New-Item -ItemType Directory -Path private -Force | Out-Null
if (-not (Test-Path private/.env.voice)) {
  Copy-Item server/.env.example private/.env.voice
}
npm.cmd run voice:server
```

Leave `ELEVENLABS_LIVE_ENABLED=false` and the API key blank for this review. New production caches are empty: mock test clips are isolated test artifacts, not real Frau Helga recordings. No bulk generation is implemented or run.

For a separately authorized live test: confirm the selected voice's free-account availability and storage license, disabled paid overages/billing and available free credits in the provider account. Put the selected voice ID and restricted API key only in ignored `private/.env.voice`; never use VITE variables. Set reuse true only with permission; set live true only for the authorized test and restart the local server. In Settings explicitly consent for that visit and press Test Frau Helga's voice once. Inspect account usage, then disable live and restart; repeat playback to verify a saved hit. Enable browser saving and download to verify offline replay. If billing metadata cannot be verified, the app must block synthesis. No such live test was performed here.

Rollback: stop the new server/dev process and launch the preserved main checkout on the original origin. Do not delete private caches, configuration, quota ledger or learner storage. Return to this branch to access its saved-audio controls.

## Verification

- Dependency install: PASS, locked `npm.cmd ci`.
- Frontend and voice-server typechecks: PASS.
- Unit tests: PASS, 136 tests including unchanged free-tier/deprecated-field cases, persistence, cache isolation, private-file preservation, zero-credit hits, consent, failures and cancellation.
- Firefox: PASS, 35 tests including all compact classroom/progress/grading cases.
- Process persistence proof: a real child Node server generated one mock clip; a fresh process with live disabled replayed it with total mock synthesis count still one. Download, browser reload and offline replay produced zero voice requests. Confirm/cancel clearing and local-only voice selection passed.
- Physical microphone, audible OS/ElevenLabs quality, installed dictionaries, live provider and billing: NOT RUN. Browser Audio/speech and provider responses are mocked; this is not an audible quality claim.
- Screenshots: `outputs/m2-step5/` beside the work directory, including compact classroom/feedback at 1100x650, 1280x720, 1366x768, 1920x1080 and 390x844, plus Settings. Earlier classroom evidence remains untouched.

Production build: PASS. Client bundle secret scan: PASS, including the locally configured private voice identity. Dependency audit: PASS, zero vulnerabilities. Remote CI status is recorded in the PR handoff after pushing. No merge, deployment, external generation, real email or paid activation occurred. Next separate ticket: Step 6 German speech-to-text with explicit per-use consent, editable transcript and independent free-tier protection.
