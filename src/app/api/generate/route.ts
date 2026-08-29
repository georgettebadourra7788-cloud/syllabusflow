import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { generateRequestSchema, syllabusSchema } from "@/lib/schemas/syllabus";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { FREE_MAX_WEEKS, FREE_MONTHLY_GENERATIONS, currentMonthKey, type UsageDoc } from "@/lib/plan";

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
    const decoded = await getAdminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    throw new Response(JSON.stringify({ error: "Your session expired. Please sign in again." }), {
      status: 401,
    });
  }
}

// Reserves one generation slot for this user (atomically, so concurrent
// requests can't both slip past the free-tier cap), creating their usage
// doc on first use and rolling over the counter on a new month. Throws
// LimitError without writing anything if a free-tier cap is exceeded.
async function reserveGeneration(uid: string, weeks: number): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection("users").doc(uid);
  const monthKey = currentMonthKey();

  await db.runTransaction(async (tx) => {
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

  try {
    await reserveGeneration(uid, weeks);
  } catch (error) {
    if (error instanceof LimitError) {
      return Response.json({ error: error.message, code: error.code }, { status: 403 });
    }
    console.error("Failed to check/reserve usage", error);
    return Response.json({ error: "Couldn't verify your plan. Please try again." }, { status: 500 });
  }

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

  await refundGeneration(uid);
  return Response.json({ error: attempts.join(" | ") }, { status: 500 });
}
