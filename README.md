# InterviewForge AI

A role-aware mock-interview practice app. Candidates choose a target role, experience level, interview style, and focus area, then answer generated questions and receive structured feedback.

## Features
- AI-generated technical, behavioral, and mixed interview questions.
- Per-answer evaluation for relevance, clarity, structure, specificity, and role fit.
- Score, strengths, improvements, and stronger-answer direction.
- Browser-local practice history; no account required.
- Clearly labelled built-in fallback when live inference is unavailable.

## Stack
Next.js, React, TypeScript, Next.js Route Handlers, Vercel.

## AI provider
The app calls BlockRun's OpenAI-compatible chat-completions endpoint using free model `nvidia/nemotron-3.5-bolt`, with `poolside/laguna-xs-2.1` as a fallback. No API key, wallet, payment card, or account is required. Free model capacity and IP rate limits can change; built-in questions and baseline evaluation are labelled as fallback, not AI output.

## Run locally
1. Use Node.js 20+.
2. Run `npm install`.
3. Run `npm run dev` and open http://localhost:3000.

No provider secret is required.

## API
- `GET /api/interview`: provider/service metadata.
- `POST /api/interview` with `{ "action": "start", "profile": { "role": "AI / ML Engineer", "level": "Student / Entry-level", "type": "Mixed", "focus": "Projects and problem solving" } }`: returns three role-specific questions.
- `POST /api/interview` with `{ "action": "evaluate", "profile": { "role": "AI / ML Engineer" }, "question": "...", "answer": "..." }`: returns structured feedback.

## Privacy and limitations
Interview answers and profile details are routed by BlockRun to the selected model provider. BlockRun states it does not store or train on prompts; upstream provider terms apply. The app discloses this before an interview and links to [BlockRun Privacy](https://blockrun.ai/privacy) and [Terms](https://blockrun.ai/terms). Do not submit sensitive personal data, secrets, or confidential interview material. Free model service has no reserved capacity or uptime guarantee. Scores are coaching guidance, not hiring predictions. History stays in the current browser.
