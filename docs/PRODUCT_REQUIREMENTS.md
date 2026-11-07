# Product requirements — approved Round 1 and Round 2

## Learner and educational goals
- Adult self-assessed A2 German learner; target B1 then B2. This is not an official placement certification.
- Objectives: converse with German-speaking spouse/family, practical daily German and travel, improve vocabulary and grammar plus reading, writing, listening and speech.
- Hybrid course: structured exercises AND AI conversation. AI adjusts relative skill time based on weakness; lessons have a 30-minute target. User may skip, pause, resume and start on demand. No reminder needed.
- Mix practical/personal topics; avoid sensitive details in prompts.
- Speaking: both sentence repetition and dialogue with push-to-talk; on Firefox do not assume native browser speech recognition.
- Corrections: major errors promptly, minor errors at activity review; repeated problems get new explanations, spaced review and reinforcement.
- Motivation: a tidy dashboard with scores, trends, streaks, achievements, CEFR estimates clearly marked provisional, vocabulary retention and progress.

## Spouse loop
- Detailed report after EVERY completed real lesson: factual score by skill, strengths, areas to improve, one or two example mistakes and next lesson objectives.
- Wife can reply to report email AND submit authenticated simple feedback form. She may suggest themes or assign objectives; the AI incorporates valid, in-scope suggestions into the lesson plan.
- Wife is not required to respond. There must be deduplication, sender/thread verification and safe treatment of untrusted input.
- A dedicated existing Gmail sender has been chosen. Literal address and recipient go in private runtime settings; M1 uses preview only, never sends.

## Platforms and cost
- Initial device: desktop PC, primary browser Firefox. Future mobile-friendly PWA, optionally packaged Android APK.
- Cloudflare free tier chosen for later hosting, D1 for records, Google sign-in for private access and Gemini free-tier-first for AI.
- Default cost $0, user-defined future ceiling $5/month; never automatically enable paid billing. Include provider quotas and circuit breakers.
- OneDrive backup preferred later, after authorization.
- Textbook use: broad topic/grammar sequences and original exercises only; no copyright-protected excerpts or books in repository or app.

## Frau Helga
- Fictional older German woman, experienced and old-fashioned teacher. Strict but kind; dry humor; high standards; patient with honest effort. Explanations clear for A2.
- Persona in student interactions and spouse reports, with factual reporting and never cruel/mocking dialogue.
- Spoken persona preferred, but actual mature female German voice cannot be guaranteed on every platform. Test installed de-DE voices and keep voice adapter replaceable.

## Milestone boundary
M1 is a local simulated prototype. M2 adds authenticated services only after review. M3 adds audio transcription and authorized Gmail. Further phases handle adaptation and Android.
