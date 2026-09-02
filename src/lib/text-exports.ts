import type { Syllabus } from "@/lib/schemas/syllabus";

// All three exports below derive entirely from the already-generated
// Syllabus object — no new Gemini call, so they're instant and free
// regardless of plan.

function moduleObjectives(mod: Syllabus["modules"][number]): string[] {
  return mod.lessons.flatMap((lesson) => lesson.learningObjectives);
}

// Deterministic, not AI-suggested: scales with how much was actually taught
// that week (one testable point per learning objective), split into a
// recall-heavy multiple-choice majority and a smaller short-answer set that
// checks application. This is a suggested starting mix for the instructor
// to adjust, not a claim about the "correct" count for any topic.
function suggestedQuestionMix(objectiveCount: number): { multipleChoice: number; shortAnswer: number } {
  const count = Math.max(objectiveCount, 1);
  return {
    multipleChoice: Math.max(2, Math.round(count * 0.7)),
    shortAnswer: Math.max(1, Math.round(count * 0.3)),
  };
}

export function buildQuizOutline(syllabus: Syllabus): string {
  const sections = syllabus.modules.map((mod, i) => {
    const objectives = moduleObjectives(mod);
    const { multipleChoice, shortAnswer } = suggestedQuestionMix(objectives.length);
    const total = multipleChoice + shortAnswer;
    const topics = mod.lessons.map((lesson) => `  - ${lesson.title}`).join("\n");

    return [
      `Week ${i + 1}: ${mod.title.replace(/^Week \d+:\s*/, "")}`,
      "Topics:",
      topics || "  (no lessons)",
      `Suggested questions: ${multipleChoice} multiple-choice, ${shortAnswer} short-answer (${total} total)`,
    ].join("\n");
  });

  return [
    `Quiz Outline: ${syllabus.courseTitle}`,
    "This lists suggested topics and question counts per week — no actual questions are included.",
    "",
    sections.join("\n\n"),
  ].join("\n");
}

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildOutcomesCsv(syllabus: Syllabus): string {
  const header = ["Week", "Module", "Objective"].map(csvField).join(",");
  const rows = syllabus.modules.flatMap((mod, i) =>
    moduleObjectives(mod).map((objective) =>
      [String(i + 1), mod.title, objective].map(csvField).join(","),
    ),
  );
  // CRLF line endings — the conventional choice for CSV import tools,
  // including Canvas's and Moodle's bulk uploaders.
  return [header, ...rows].join("\r\n");
}

export function buildSlideOutline(syllabus: Syllabus): string {
  const sections = syllabus.modules.map((mod, i) => {
    const objectives = moduleObjectives(mod);
    const bullets = (objectives.length > 0 ? objectives : mod.lessons.map((l) => l.title)).slice(0, 5);

    return [`Week ${i + 1}: ${mod.title.replace(/^Week \d+:\s*/, "")}`, ...bullets.map((b) => `  - ${b}`)].join(
      "\n",
    );
  });

  return [`Slide Deck Outline: ${syllabus.courseTitle}`, "", sections.join("\n\n")].join("\n");
}
