import type { Syllabus } from "@/lib/schemas/syllabus";

// Gemini's structured output isn't always perfectly clean: it can
// occasionally emit the same lesson twice (same "key" reused) or list a
// lesson as its own prerequisite. Normalize once here, right after
// generation, so every consumer (on-page render, HTML export, PDF export,
// prerequisite map) sees already-correct data instead of each needing its
// own defensive filtering.
export function normalizeSyllabus(syllabus: Syllabus): Syllabus {
  const seenLessonKeys = new Set<string>();
  const allLessonKeys = new Set<string>();

  syllabus.modules.forEach((mod) => {
    mod.lessons.forEach((lesson) => allLessonKeys.add(lesson.key));
  });

  const modules = syllabus.modules.map((mod) => {
    const lessons = mod.lessons
      .filter((lesson) => {
        if (seenLessonKeys.has(lesson.key)) return false;
        seenLessonKeys.add(lesson.key);
        return true;
      })
      .map((lesson) => ({
        ...lesson,
        prerequisiteLessonKeys: lesson.prerequisiteLessonKeys.filter(
          (key) => key !== lesson.key && allLessonKeys.has(key),
        ),
      }));

    return { ...mod, lessons };
  });

  return { ...syllabus, modules };
}
