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
  title: z
    .string()
    .describe('Must start with "Week N: " (e.g. "Week 1: Introduction to Neural Networks") — never "Module"'),
  lessons: z.array(lessonSchema),
  references: z
    .array(z.string())
    .describe("Real, topic-appropriate academic readings/textbook citations for this week"),
});

export const assessmentComponentSchema = z.object({
  name: z.string().describe("e.g. 'Participation', 'Midterm exam', 'OSCE', 'Case presentation'"),
  weight: z.string().describe("e.g. '20%'"),
  description: z.string(),
});

export const syllabusSchema = z.object({
  courseTitle: z.string(),
  durationWeeks: z.number().int().positive(),
  targetAudience: z.string(),
  courseOverview: z.string().describe("Short course-level description, shown before Module/Week 1"),
  learningOutcomes: z.array(z.string()).describe("Course-level learning outcomes"),
  assessment: z
    .array(assessmentComponentSchema)
    .describe("Course-level evaluation breakdown, format adapted to the subject"),
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
