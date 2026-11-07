# InterviewForge AI

An AI-driven mock interview platform built for the Generative AI internship assignment. Candidates configure a target role, experience level, interview style and focus area, then answer adaptive questions and receive structured feedback.

## Features
- Role- and experience-aware interview question generation using the OpenAI API when configured.
- Technical, behavioral and mixed interview modes.
- Answer evaluation for relevance, clarity, structure, specificity and role alignment.
- Per-answer scores, strengths, improvement points and stronger-answer guidance.
- Built-in fallback question bank and baseline evaluator when no API key is configured.
- Browser-local practice history; no account required.
- Responsive interface.

## Stack
Next.js 14, React, TypeScript, Next.js Route Handlers, OpenAI Chat Completions API, Vercel.

## Run locally
1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and set `OPENAI_API_KEY` (optional).
4. Run `npm run dev` and open http://localhost:3000.

## Environment variables
- `OPENAI_API_KEY`: optional OpenAI API key. Without it, the built-in evaluator is used.
- `OPENAI_MODEL`: optional model name; defaults to `gpt-4o-mini`.

## API
- `POST /api/interview` with `{ action: "start", profile }` returns three interview questions.
- `POST /api/interview` with `{ action: "evaluate", profile, question, answer }` returns structured answer feedback.

## Privacy
Interview answers are sent to OpenAI only when an API key is configured and the OpenAI evaluator is used. Otherwise, evaluation runs in the application. Practice history is stored in the browser's local storage. Do not submit confidential or personally sensitive information.

## Limitations
The built-in evaluator is a lightweight heuristic and is not a substitute for expert human assessment. Scores are guidance, not hiring decisions. Browser-local history does not sync across devices.
