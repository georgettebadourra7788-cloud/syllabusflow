import { z } from "zod";

export const lessonSchema = z.object({
  key: z.string().describe("Unique, stable identifier for this lesson (e.g. 'week1-lesson2')"),
  title: z.string(),
  summary: z.string(),
  learningObjectives: z.array(z.string()),
  prerequisiteLessonKeys: z
    .array(z.string())
    .describe("Keys of lessons that must be completed before this one, if any"),
});

export const moduleSchema = z.object({
  title: z.string(),
  lessons: z.array(lessonSchema),
  references: z
    .array(z.string())
    .optional()
    .describe("Academic readings/textbook citations for this week (paid tier only)"),
});

export const assessmentComponentSchema = z.object({
  name: z.string().describe("e.g. 'Participation', 'Midterm exam', 'Final project'"),
  weight: z.string().describe("e.g. '20%'"),
  description: z.string(),
});

export const syllabusSchema = z.object({
  courseTitle: z.string(),
  durationWeeks: z.number().int().positive(),
  targetAudience: z.string(),
  courseOverview: z.string().optional().describe("Short course-level summary (paid tier only)"),
  learningOutcomes: z
    .array(z.string())
    .optional()
    .describe("Course-level learning outcomes (paid tier only)"),
  assessment: z
    .array(assessmentComponentSchema)
    .optional()
    .describe("Grading breakdown (paid tier only)"),
  modules: z.array(moduleSchema),
});

export type Lesson = z.infer<typeof lessonSchema>;
export type Module = z.infer<typeof moduleSchema>;
export type Syllabus = z.infer<typeof syllabusSchema>;

export const generateRequestSchema = z.object({
  topic: z.string().min(1),
  weeks: z.number().int().positive().max(52),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"]),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
