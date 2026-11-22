# Optional semantic feedback and speech — later milestone only

This corrective pass is offline. No provider, key, upload, billing, authentication, or cloud deployment is enabled. PR #5 remains separate and unchanged.

A future opt-in Gemini evaluator would sit behind an authenticated server endpoint and a portable evaluator interface. Before choosing it, verify current free-tier availability, retention/model-improvement terms, language support and quotas. Show the actual privacy terms and cost limits before consent; never place a key in React or a `VITE_*` variable. The user's preference is $0; a $5 monthly ceiling is not authorization to activate billing.

Validate the response against a closed JSON schema: `task_fit` (matched/mismatched/uncertain), `facts` (reference fact IDs with supported/contradicted/uncertain judgments), `grammar` (bounded issue codes), `explanation` (bounded text), `rubric` (criterion IDs and numeric points), and `confidence` (bounded number). Reject extra fields, invalid totals and missing evidence. Derive the final score from the approved rubric server-side; do not accept a model's overall grade. Contradictory destinations cannot earn comprehension points. Low confidence or disagreement with deterministic checks stays unscored. Treat learner input as data, never as instructions to change grades or access accounts. Preserve first attempts and make review status visible.

Future transcription is a separate permission: a short in-memory microphone clip may be uploaded only after explicit consent through the authenticated server. Delete server audio after processing by default; retain neither raw audio nor transcripts without a separate retention choice. Validate response length and confidence. Transcription confidence is not pronunciation proficiency; valid pronunciation assessment needs its own evidence and acceptance criteria.

A future voice-output trial may evaluate Gemini TTS or the separately prepared ElevenLabs option. Verify voice access/licensing, German clarity, latency, account quotas and provider-side spending controls before a short, explicitly authorized test. Keep installed local voice and text fallbacks, an off switch, fixed server-side voice/model selection and strict request/session/day/month caps. Never select a paid fallback automatically.

Before any live milestone: security review of verified identity, authorization, CSRF and replay defenses; mocked failure/quota tests; explicit owner approval for data transfer and any spend; then a controlled smoke test. No live capability is claimed by this design.
