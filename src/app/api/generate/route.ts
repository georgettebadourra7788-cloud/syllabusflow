import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { generateRequestSchema, syllabusSchema } from "@/lib/schemas/syllabus";

// A full structured syllabus can take longer to generate than Vercel's
// default serverless function timeout (10s on Hobby) allows.
export const maxDuration = 60;

// Tried in order. These are Google's rolling aliases, not pinned generations
// (e.g. gemini-2.5-flash) — pinned model IDs have been getting cut off from
// new API keys/projects as Google rotates generations, while the aliases are
// designed to keep resolving to a current, available model.
const MODEL_CANDIDATES = ["gemini-flash-latest", "gemini-flash-lite-latest"] as const;

// generateObject has no built-in per-call timeout, so a single slow/hung
// model call can silently eat the entire route's 60s budget and starve the
// fallback candidates. Bound each attempt explicitly instead.
const PER_MODEL_TIMEOUT_MS = 25_000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = generateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { topic, weeks, skillLevel } = parsed.data;
  const prompt = `Create a ${weeks}-week course syllabus on "${topic}" for a ${skillLevel} audience.

Break the course into weekly modules, one module per week, with 2-3 lessons
each. Each module should have a title and a list of lessons. Each lesson
needs a unique "key" (a short slug, stable across the response, e.g.
"week1-intro"), a title, a one-sentence summary, 2-3 concise learning
objectives, and an array of prerequisiteLessonKeys referencing the "key" of
any earlier lesson in this same syllabus that a student should complete
first (empty array if none). Keep all text brief and to the point.`;

  const attempts: string[] = [];

  for (const modelId of MODEL_CANDIDATES) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PER_MODEL_TIMEOUT_MS);

    try {
      const { object } = await generateObject({
        model: google(modelId),
        schema: syllabusSchema,
        prompt,
        maxRetries: 0,
        abortSignal: controller.signal,
      });

      return NextResponse.json(object);
    } catch (error) {
      const timedOut = controller.signal.aborted;
      console.error(`Syllabus generation failed with ${modelId}${timedOut ? " (timed out)" : ""}`, error);
      attempts.push(`${modelId}${timedOut ? " (timed out)" : ""}: ${String(error)}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return Response.json({ error: attempts.join(" | ") }, { status: 500 });
}
