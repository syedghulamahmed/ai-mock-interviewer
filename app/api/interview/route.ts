import { NextResponse } from "next/server";

export const runtime = "nodejs";

const models = ["nvidia/nemotron-3.5-bolt", "poolside/laguna-xs-2.1"];
const MAX_BODY_BYTES = 32 * 1024;
const MAX_ANSWER_LENGTH = 12_000;

type Profile = {
  role: string;
  level?: string;
  type?: "Technical" | "Behavioral" | "Mixed";
  focus?: string;
};

const banks: Record<string, string[]> = {
  Technical: [
    "Explain a challenging technical problem you solved. What was your approach?",
    "How would you debug a production issue that is difficult to reproduce?",
    "What trade-offs would you consider when designing a scalable system?",
  ],
  Behavioral: [
    "Tell me about a time you received difficult feedback. How did you respond?",
    "Describe a situation where you had to learn a new skill quickly.",
    "Tell me about a time you disagreed with a teammate.",
  ],
  Mixed: [
    "Walk me through a project you are proud of and the technical decisions behind it.",
    "How do you prioritize when several important tasks have the same deadline?",
    "Describe a difficult problem you solved and what you learned from it.",
  ],
};

function fallbackScore(answer: string) {
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const structure = /\b(situation|task|action|result|because|therefore|first|then|finally|impact|learned)\b/i.test(answer);
  return Math.max(25, Math.min(88, Math.round(30 + Math.min(words, 130) * 0.35 + (structure ? 12 : 0) + (words > 45 ? 8 : 0))));
}

function validProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  return typeof profile.role === "string" &&
    profile.role.trim().length > 0 &&
    profile.role.length <= 100 &&
    (profile.level === undefined || (typeof profile.level === "string" && profile.level.length <= 80)) &&
    (profile.type === undefined || ["Technical", "Behavioral", "Mixed"].includes(String(profile.type))) &&
    (profile.focus === undefined || (typeof profile.focus === "string" && profile.focus.length <= 240));
}

async function askBlockRun(system: string, prompt: string) {
  let lastError: unknown = null;
  for (const model of models) {
    try {
      const response = await fetch("https://blockrun.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.45,
          max_tokens: 1800,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system + " Return only JSON. Do not include hidden reasoning, markdown fences, or text outside the JSON object." },
            { role: "user", content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(22000),
      });
      if (!response.ok) {
        lastError = new Error("BLOCKRUN_REQUEST_FAILED");
        continue;
      }
      const data = await response.json();
      const raw = data?.choices?.[0]?.message?.content;
      if (typeof raw !== "string") throw new Error("BLOCKRUN_INVALID_RESPONSE");
      const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      return JSON.parse(cleaned);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("BLOCKRUN_UNAVAILABLE");
}

export async function GET(req: Request) {
  return NextResponse.json({
    ok: true,
    service: "InterviewForge AI",
    aiConfigured: true,
    provider: "blockrun",
    mode: "blockrun",
  });
}

export async function POST(req: Request) {
  try {
    const declaredLength = Number(req.headers.get("content-length") || 0);
    if (declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }

    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const action = body.action;
    const profile = body.profile;
    if (!validProfile(profile)) {
      return NextResponse.json({ error: "Choose a valid target role and profile." }, { status: 400 });
    }

    const safeProfile = {
      role: profile.role.trim(),
      level: (profile.level || "Student / Entry-level").trim(),
      type: profile.type || "Mixed",
      focus: (profile.focus || "Project experience and problem-solving").trim(),
    };

    if (action === "start") {
      try {
        const result = await askBlockRun(
          "You are an expert technical recruiter. Return only JSON with a questions array of exactly 3 concise, role-specific interview questions. Adapt to experience level, interview style and focus. Avoid generic questions.",
          JSON.stringify(safeProfile),
        );
        const questions = Array.isArray(result?.questions) &&
          result.questions.length === 3 &&
          result.questions.every((item: unknown) => typeof item === "string" && item.trim().length > 0 && item.length <= 500)
          ? result.questions
          : banks[safeProfile.type];
        return NextResponse.json({ questions, source: result ? "blockrun" : "built-in" });
      } catch {
        // Keep the practice workflow available when live BlockRun inference is temporarily unavailable.
        return NextResponse.json({
          questions: banks[safeProfile.type],
          source: "built-in",
          notice: "AI question generation is unavailable; these are built-in practice questions.",
        });
      }
    }

    if (action === "evaluate") {
      const { question, answer } = body;
      if (typeof question !== "string" || question.trim().length === 0 || question.length > 1_200) {
        return NextResponse.json({ error: "Provide a valid interview question." }, { status: 400 });
      }
      if (typeof answer !== "string" || answer.trim().length < 8) {
        return NextResponse.json({ error: "Please provide a more complete answer before evaluation." }, { status: 400 });
      }
      if (answer.length > MAX_ANSWER_LENGTH) {
        return NextResponse.json({ error: "Your answer is too long. Keep it under 12,000 characters." }, { status: 413 });
      }

      let result: any = null;
      try {
        result = await askBlockRun(
          "You are a fair, constructive interview coach. Evaluate the candidate answer for relevance, clarity, structure, specificity and role relevance. Return JSON: score (integer 0-100), verdict (short sentence), strengths (2-3 concise strings), improvements (2-3 concise strings), idealAnswer (a concise example direction, not fabricated personal experience). Be specific and encouraging.",
          JSON.stringify({ ...safeProfile, question: question.trim(), answer: answer.trim() }),
        );

        if (result && Number.isFinite(Number(result.score))) {
          const strings = (value: unknown) =>
            Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 3).map(item => item.slice(0, 400)) : [];
          return NextResponse.json({
            feedback: {
              score: Math.max(0, Math.min(100, Math.round(Number(result.score)))),
              verdict: typeof result.verdict === "string" ? result.verdict.slice(0, 500) : "Your answer has been evaluated.",
              strengths: strings(result.strengths),
              improvements: strings(result.improvements),
              idealAnswer: typeof result.idealAnswer === "string" ? result.idealAnswer.slice(0, 1_200) : "",
            },
            source: "blockrun",
          });
        }

        // Invalid or incomplete model output uses the labelled baseline evaluator below.
      } catch {
        // Provider failures use the labelled baseline evaluator below.
        result = null;
      }

      const words = answer.trim().split(/\s+/).filter(Boolean).length;
      const score = fallbackScore(answer);
      return NextResponse.json({
        feedback: {
          score,
          verdict: "Baseline feedback from the built-in evaluator; this is not an expert or validated score.",
          strengths: words > 35
            ? ["You provided a developed response rather than a one-line answer."]
            : ["You attempted the question directly."],
          improvements: [
            "Add a concrete example with your personal contribution.",
            "Use a clear situation, action, and result structure.",
            "Connect the outcome to the target role.",
          ],
          idealAnswer: "Structure your response around the context, the specific action you took, the reasoning behind it, and a measurable or observable outcome.",
        },
        source: "built-in",
        notice: "Live AI evaluation is temporarily unavailable. This is baseline structural feedback, not an expert assessment.",
      });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Unexpected server error. Please try again." }, { status: 500 });
  }
}
