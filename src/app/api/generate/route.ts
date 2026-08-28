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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = generateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { topic, weeks, skillLevel } = parsed.data;
  const prompt = `Create a ${weeks}-week course syllabus on "${topic}" for a ${skillLevel} audience.

Break the course into weekly modules. Each module should have a title and a
list of lessons. Each lesson needs a unique "key" (a short slug, stable
across the response, e.g. "week1-intro"), a title, a one- or two-sentence
summary, an array of concrete learning objectives, and an array of
prerequisiteLessonKeys referencing the "key" of any earlier lesson in this
same syllabus that a student should complete first (empty array if none).`;

  const attempts: string[] = [];

  for (const modelId of MODEL_CANDIDATES) {
    try {
      const { object } = await generateObject({
        model: google(modelId),
        schema: syllabusSchema,
        prompt,
        maxRetries: 0,
      });

      return NextResponse.json(object);
    } catch (error) {
      console.error(`Syllabus generation failed with ${modelId}`, error);
      attempts.push(`${modelId}: ${String(error)}`);
    }
  }

  return Response.json({ error: attempts.join(" | ") }, { status: 500 });
}
