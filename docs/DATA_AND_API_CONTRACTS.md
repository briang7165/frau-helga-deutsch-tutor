# Proposed data and API contracts — future stages only
Use TypeScript interfaces and schema validation. M1 should implement local deterministic equivalents, not provision a database.

## Future relational entities
users(id, google_sub UNIQUE, email_display, created_at, preferences_json)
lessons(id, user_id, title, target_minutes, level_estimate, created_at, version)
activities(id, lesson_id, type, skill, topic_id, rubric_json, sequence)
attempts(id, activity_id, user_id, answer, submitted_at, score, feedback_json)
skills(user_id, skill, mastery_score, updated_at)
review_items(id, user_id, topic_id, difficulty, due_at, repetition_state_json)
reports(id, user_id, lesson_id UNIQUE, status, message_id, sent_at)
feedback(id, report_id, verified_source, body_clean, classification_json, processed_at)
settings(user_id PK, voice_id, spouse_recipient, monthly_limit_usd, consent_json)

## Future endpoints
GET /api/me; POST /api/lessons/start; GET /api/lessons/:id;
POST /api/attempts; POST /api/lessons/:id/complete; GET /api/progress;
POST /api/feedback (verified spouse link or signed Gmail bridge);
GET /api/reports/:id.

Apply request validation, size limits, auth, CSRF strategy, per-user ownership, idempotency, rate limits and quota checking. Do not trust client-provided scores. Keep clear provenance for feedback and report delivery.

M1 sample data lives in examples/lesson_and_report.json and must be fictional. Tests should not depend on external account or API access.
