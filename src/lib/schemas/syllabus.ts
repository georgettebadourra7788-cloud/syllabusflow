import { z } from "zod";

export const COURSE_TYPES = ["lecture", "seminar", "lab", "studio", "online"] as const;
export type CourseType = (typeof COURSE_TYPES)[number];
export const courseTypeSchema = z.enum(COURSE_TYPES);

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  lecture: "Lecture",
  seminar: "Seminar",
  lab: "Lab/Science",
  studio: "Studio/Practicum",
  online: "Online/Async",
};

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

// Course-type-specific sections — present only for the course type that
// calls for them (see COURSE_TYPE_INSTRUCTIONS in the generate route). The
// core sections (overview, outcomes, weekly breakdown, assessment,
// references) are the same for every course type; these are additive.
export const materialsAndSafetySchema = z.object({
  materials: z.array(z.string()).describe("Required materials, equipment, or lab supplies"),
  safetyNotes: z.array(z.string()).describe("Safety precautions or protocols relevant to hands-on work"),
});

export const projectMilestoneSchema = z.object({
  week: z.number().int().positive().describe("Week number this milestone is due"),
  title: z.string(),
  description: z.string(),
});

export const participationCriterionSchema = z.object({
  criterion: z.string().describe("e.g. 'Attendance', 'Discussion quality', 'Peer feedback'"),
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
  materialsAndSafety: materialsAndSafetySchema
    .optional()
    .describe("Lab/Science course type only — required materials and safety notes"),
  projectMilestones: z
    .array(projectMilestoneSchema)
    .optional()
    .describe("Studio/Practicum course type only — cumulative project checkpoints"),
  participationRubric: z
    .array(participationCriterionSchema)
    .optional()
    .describe("Seminar course type only — how discussion participation is evaluated"),
});

export type Lesson = z.infer<typeof lessonSchema>;
export type Module = z.infer<typeof moduleSchema>;
export type Syllabus = z.infer<typeof syllabusSchema>;

export const generateRequestSchema = z.object({
  topic: z.string().min(1),
  weeks: z.number().int().positive().max(52),
  skillLevel: z.enum(["beginner", "intermediate", "advanced"]),
  courseType: courseTypeSchema,
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
