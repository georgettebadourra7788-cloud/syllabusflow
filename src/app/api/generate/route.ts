import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { generateRequestSchema, syllabusSchema } from "@/lib/schemas/syllabus";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = generateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { topic, weeks, skillLevel } = parsed.data;

  try {
    const { object } = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: syllabusSchema,
      prompt: `Create a ${weeks}-week course syllabus on "${topic}" for a ${skillLevel} audience.

Break the course into weekly modules. Each module should have a title and a
list of lessons. Each lesson needs a unique "key" (a short slug, stable
across the response, e.g. "week1-intro"), a title, a one- or two-sentence
summary, an array of concrete learning objectives, and an array of
prerequisiteLessonKeys referencing the "key" of any earlier lesson in this
same syllabus that a student should complete first (empty array if none).`,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("Syllabus generation failed", error);
    return NextResponse.json({ error: "Failed to generate syllabus" }, { status: 500 });
  }
}
