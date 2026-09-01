import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { generateRequestSchema, syllabusSchema } from "@/lib/schemas/syllabus";
import { verifyFirebaseIdToken, getAdminDb } from "@/lib/firebase-admin";
import { FREE_MAX_WEEKS, FREE_MONTHLY_GENERATIONS, currentMonthKey, type Plan, type UsageDoc } from "@/lib/plan";

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

class LimitError extends Error {
  constructor(
    public code: "WEEKS_LIMIT" | "GENERATIONS_LIMIT",
    message: string,
  ) {
    super(message);
  }
}

async function verifyUser(request: Request): Promise<string> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    throw new Response(JSON.stringify({ error: "Sign in to generate a syllabus." }), { status: 401 });
  }

  try {
    return await verifyFirebaseIdToken(token);
  } catch (error) {
    // The client only ever sees the generic message below — logging the
    // real cause here is the only way to tell a genuinely expired token
    // apart from a server-side misconfiguration (missing/invalid
    // FIREBASE_SERVICE_ACCOUNT_KEY, project ID mismatch, JWKS fetch
    // failure), which would otherwise look identical to the user.
    console.error("Firebase ID token verification failed:", error);
    throw new Response(JSON.stringify({ error: "Your session expired. Please sign in again." }), {
      status: 401,
    });
  }
}

// Reserves one generation slot for this user (atomically, so concurrent
// requests can't both slip past the free-tier cap), creating their usage
// doc on first use and rolling over the counter on a new month. Throws
// LimitError without writing anything if a free-tier cap is exceeded.
async function reserveGeneration(uid: string, weeks: number): Promise<Plan> {
  const db = getAdminDb();
  const ref = db.collection("users").doc(uid);
  const monthKey = currentMonthKey();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? (snap.data() as UsageDoc) : null;

    const plan = existing?.plan ?? "free";
    const sameMonth = existing?.monthKey === monthKey;
    const generationsThisMonth = sameMonth ? existing!.generationsThisMonth : 0;

    if (plan === "free" && weeks > FREE_MAX_WEEKS) {
      throw new LimitError(
        "WEEKS_LIMIT",
        `Free plan syllabi are capped at ${FREE_MAX_WEEKS} weeks. Upgrade for longer courses.`,
      );
    }

    if (plan === "free" && generationsThisMonth >= FREE_MONTHLY_GENERATIONS) {
      throw new LimitError(
        "GENERATIONS_LIMIT",
        `You've used all ${FREE_MONTHLY_GENERATIONS} free generations this month. Upgrade for unlimited.`,
      );
    }

    const next: UsageDoc = {
      plan,
      generationsThisMonth: generationsThisMonth + 1,
      monthKey,
      createdAt: existing?.createdAt ?? Date.now(),
    };
    tx.set(ref, next);
    return plan;
  });
}

// Best-effort refund when generation fails after a slot was reserved —
// failed attempts (model errors, timeouts) shouldn't cost the user a turn.
async function refundGeneration(uid: string): Promise<void> {
  try {
    const db = getAdminDb();
    const ref = db.collection("users").doc(uid);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const data = snap.data() as UsageDoc;
      if (data.generationsThisMonth > 0) {
        tx.update(ref, { generationsThisMonth: data.generationsThisMonth - 1 });
      }
    });
  } catch (error) {
    console.error("Failed to refund generation slot", error);
  }
}

// Free tier: short, cheap generations — no references, no assessment, no
// course-level overview. Capped objective/description length keeps token
// usage (and therefore API cost) down.
function buildFreePrompt(topic: string, weeks: number, skillLevel: string): string {
  return `Create a ${weeks}-week course syllabus on "${topic}" for a ${skillLevel} audience.

Break the course into weekly modules, one module per week, with 2-3 lessons
each. Each module should have a title and a list of lessons. Each lesson
needs a unique "key" (a short slug, stable across the response, e.g.
"week1-intro"), a title, a one-sentence summary (max 2 sentences), exactly 2
concise learning objectives, and an array of prerequisiteLessonKeys
referencing the "key" of any earlier lesson in this same syllabus that a
student should complete first (empty array if none). Do not include
courseOverview, learningOutcomes, assessment, or per-module references —
leave those fields out entirely. Keep all text brief and to the point.`;
}

// Paid tier: richer, more detailed generation that justifies the larger
// token spend — expanded objectives, varied prose, real references, and the
// course-level framing (overview, outcomes, assessment) free tier skips.
function buildPaidPrompt(topic: string, weeks: number, skillLevel: string): string {
  return `Create a ${weeks}-week course syllabus on "${topic}" for a ${skillLevel} audience.

Start with a course-level "courseOverview" (2-4 sentences framing what the
course covers and why it matters) and a "learningOutcomes" array (4-6 items)
summarizing what a student can do after completing the course.

Break the course into weekly modules, one module per week, with 2-3 lessons
each. Each module should have a title, a list of lessons, and a
"references" array of 1-3 real, specific academic readings or textbook
citations relevant to that week's material (author, title, and
edition/chapter where applicable) — ground these in recognized, well-known
sources for the subject rather than inventing obscure or fictional ones.

Each lesson needs a unique "key" (a short slug, stable across the response,
e.g. "week1-intro"), a title, a full lesson summary (3-5 sentences) written
with varied sentence structure and openings — do not start every summary
with the same template phrase like "This lesson explores..." or "Students
will learn...", objectives scaled to the topic's complexity (as many as are
genuinely useful, not capped at a fixed number), and an array of
prerequisiteLessonKeys referencing the "key" of any earlier lesson in this
same syllabus that a student should complete first (empty array if none).

Finally, include an "assessment" array describing the grading breakdown for
the course (e.g. participation, midterms, final project), each with a
"name", a "weight" (e.g. "20%") that sums to 100% across all components, and
a short "description".`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = generateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { topic, weeks, skillLevel } = parsed.data;

  let uid: string;
  try {
    uid = await verifyUser(request);
  } catch (response) {
    return response as Response;
  }

  let plan: Plan;
  try {
    plan = await reserveGeneration(uid, weeks);
  } catch (error) {
    if (error instanceof LimitError) {
      return Response.json({ error: error.message, code: error.code }, { status: 403 });
    }
    console.error("Failed to check/reserve usage", error);
    return Response.json({ error: "Couldn't verify your plan. Please try again." }, { status: 500 });
  }

  const prompt =
    plan === "paid" ? buildPaidPrompt(topic, weeks, skillLevel) : buildFreePrompt(topic, weeks, skillLevel);

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

  await refundGeneration(uid);
  return Response.json({ error: attempts.join(" | ") }, { status: 500 });
}
