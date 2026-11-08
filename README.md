# InterviewForge AI

A role-aware mock-interview practice app. Candidates choose a target role, experience level, interview style, and focus area, then answer generated questions and receive structured feedback.

## Features
- AI-generated technical, behavioral, and mixed questions.
- Per-answer evaluation for relevance, clarity, structure, specificity, and role fit.
- Score, strengths, improvements, and a stronger-answer direction.
- Browser-local practice history; no account required.
- Clearly labelled built-in fallback when the external AI provider is unavailable.

## Stack
Next.js, React, TypeScript, Next.js Route Handlers, Vercel.

## AI provider
The app uses Vireonix's OpenAI-compatible `POST /v1/chat/completions` endpoint with model `auto`, without an API key or Authorization header. No OpenAI key, Vercel AI Gateway key, or payment card is required. The public service is free but governed by per-IP hourly usage budgets and may return HTTP 429 or become temporarily unavailable. The app then labels its built-in questions/evaluator as fallback rather than pretending they are AI output.

## Run locally
1. Use Node.js 20+.
2. Run `npm install`.
3. Run `npm run dev` and open http://localhost:3000.

No provider secret is required.

## API
- `GET /api/interview`: service/provider health metadata.
- `POST /api/interview` with `{ "action": "start", "profile": { "role": "AI / ML Engineer", "level": "Student / Entry-level", "type": "Mixed", "focus": "Projects and problem solving" } }`: returns three role-specific questions.
- `POST /api/interview` with `{ "action": "evaluate", "profile": { "role": "AI / ML Engineer" }, "question": "...", "answer": "..." }`: returns structured feedback.

## Privacy and limitations
Interview answers and profile details are sent to Vireonix and may be retained and used for model training and improvement. The app discloses this before starting and links to https://vireonix.ai/terms. Do not submit sensitive personal data, secrets, or confidential interview material. The service has no SLA or reserved capacity. Scores are coaching guidance, not validated hiring predictions. History stays in the current browser.
