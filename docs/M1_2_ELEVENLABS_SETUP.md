# M1.2: optional local ElevenLabs speech

External speech is OFF by default. No key, voice ID, paid service, deployment, transcription, or real email is included in this public repository. The selected voice belongs in private runtime configuration only. A voice ID alone cannot synthesize speech.

This branch is stacked on the pending M1.1 PR #3 at `621e932`. It preserves that work and adds two small Settings/VoiceControls hooks plus isolated speech modules. Review M1.2's incremental diff against that commit; the PR against main also contains the still-pending M1.1 work. Neither PR should be merged automatically. Resolve any later PR #3 edits before approval.

## Local setup (no live calls)

Use Node 22.12 or later. From this repository in PowerShell:

```powershell
npm.cmd ci
New-Item -ItemType Directory -Force private
# Only for a fresh checkout; never overwrite an existing private configuration.
Copy-Item server/.env.example private/.env.voice
npm.cmd run voice:server
```

Leave `ELEVENLABS_LIVE_ENABLED=false`. In a second terminal run `npm.cmd run dev` and open `http://127.0.0.1:5173`. The voice server binds only to `127.0.0.1:8787`. Starting either server makes no ElevenLabs requests. With the server gate disabled, Test falls back to an installed local German voice or visible text.

In the prepared local worktree, `private/.env.voice` already contains the owner's selected voice ID, a blank API key, and the disabled flag. Do not overwrite it. The private directory is ignored by Git and explicitly blocked by Vite. Do not use `VITE_*` variables for credentials or move secrets into React, `.env` at the project root, screenshots, logs, or a PR.

Keep the browser origin used for existing lessons: progress and Settings are browser-origin-specific. If using `http://localhost:5173` instead, set `VOICE_APP_ORIGIN` to that exact origin before starting the voice server. Changing hostname or port does not migrate browser storage; use the existing backup export/import controls if needed. This milestone does not change storage schemas or delete progress.

## Authorized live smoke test — not performed automatically

1. Obtain explicit owner authorization to send the original test sentence to ElevenLabs and consume free account credits. Check voice access, licensing, German quality requirements, free quota, and provider-side spending controls in the owner's account. Keep paid plans, PAYG and automatic quota extensions disabled. Do not upgrade if this voice requires a paid tier.
2. Create a user-owned restricted API key with only the permissions needed for text-to-speech and reading subscription, models and the selected voice. Set a provider-side key quota where available. Never paste the key into GitHub or the browser. Put it in `ELEVENLABS_API_KEY` in `private/.env.voice`; set `ELEVENLABS_VOICE_ID` privately if this is a fresh checkout.
3. Only after authorization, change `ELEVENLABS_LIVE_ENABLED=true` and restart `npm.cmd run voice:server`. Run `npm.cmd run dev` separately. The default app origin is exactly `http://127.0.0.1:5173`; do not expose either server to the LAN or internet.
4. In Settings, enable spoken voice, then explicitly check **Enable ElevenLabs for this visit**. Enabling alone makes no API request. Press **Test Frau Helga's voice** once. The server checks subscription quota, German model support, and selected voice access before synthesis. Missing/ambiguous metadata, restricted-key failures, paid-tier accounts or insufficient free quota fail closed. Do not bypass those checks to make a test pass.
5. Listen for clear, calm German delivery of “Guten Tag. Wir lernen Schritt für Schritt.” Check volume, pause, resume, stop, latency and intelligibility in Firefox. Repeat the same test to verify the session cache; it should report no repeat synthesis. Check the provider's actual usage before testing another phrase. A failed or cancelled request may still consume credits.
6. Uncheck the enable switch, stop the server, and restore `ELEVENLABS_LIVE_ENABLED=false`. Revoke a temporary test key when finished. Reloading the app clears browser consent. Stopping the server clears audio cache, tokens and session state; it intentionally preserves daily/monthly counters.

No live test has been run. Account metadata, the selected voice's availability/licensing, real audio quality and latency remain unverified. The application supports only the original authored allowlist, not arbitrary learner text, books or microphone audio. The existing microphone/manual transcript behavior is unchanged.

## Limits and data handling

| Control | Bound |
| --- | --- |
| Request | 300 characters; authored text allowlist only |
| Server process session | 600 synthesis characters |
| UTC day / calendar month | 1,200 / 3,000 synthesis characters |
| Speech request rate | 6/minute, including cache hits |
| HTTP request rate | 20/minute, including session requests |
| Upstream timeout / audio | 15 seconds total / 2 MB |
| Ephemeral cache | 12 original prompt clips, server memory only |

Synthesis attempts reserve budget before sending upstream, including failures. A single server lock prevents concurrent processes from spending the same local ledger. The counters in `private/voice-usage.json` contain only dates and character totals; no text, audio, credentials or voice ID. Corruption or clock rollback blocks synthesis. Do not delete/edit the ledger or restart the server to evade caps. After an abnormal exit, remove a stale `private/voice-server.lock` only after confirming no voice server is running. These local controls are not tamper-proof against the machine owner or other applications spending from the same ElevenLabs account.

The first test is 42 characters and reserves 42 app characters. The model preflight permits only a known character multiplier at most 1, with at least 100 credits left beyond the request. Expected paid spend is $0 while the account remains on its verified free tier with extensions disabled; actual provider usage must be checked. App caps are **not** provider billing caps and are not a promise against concurrent usage elsewhere. No $5 allowance or paid fallback has been activated.

Only the server sends the key, via `xi-api-key`, to fixed ElevenLabs endpoints. The browser sends text and consent to its same-origin local proxy. Exact Origin/Host checks, a custom header and a server-session token protect the local API against cross-site requests. Errors omit upstream bodies. Audio is buffered within the bound before playback; this is not low-latency chunked browser streaming. Stop cancels client playback/request but cannot undo already accepted synthesis. Provider retention policies still apply: this implementation does not promise ElevenLabs zero retention.

The default model is `eleven_multilingual_v2`; `language_code` is intentionally omitted because that model does not support the parameter. There is no automatic model/voice substitution or retry. Offline, authorization, unsupported voice, quota and timeout errors explain the failure and use only an installed **local** German voice or text. Browser remote-voice permission is separate and is never used by this fallback.

## Verification

All external responses in automated tests are mocked. Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run voice:typecheck
npm.cmd run build
npm.cmd run test:voice-bundle
npm.cmd run test:firefox
npm.cmd audit
```

Install Playwright Firefox with `npx.cmd playwright install firefox` if absent. The bundle check rejects configured private secrets and server API markers in the generated client artifacts. It prints no secret values. The existing progress, assessment, microphone and lesson regression tests remain included.

Production hosting is out of scope. See [the Worker adapter design](M1_2_WORKER_DESIGN.md); no cloud resources are provisioned.

References: [streaming TTS](https://elevenlabs.io/docs/api-reference/text-to-speech/stream), [subscription metadata](https://elevenlabs.io/docs/api-reference/user/subscription/get), [models](https://elevenlabs.io/docs/api-reference/models/list), [voice access](https://elevenlabs.io/docs/api-reference/voices/get), and [billing](https://elevenlabs.io/docs/overview/administration/billing).
