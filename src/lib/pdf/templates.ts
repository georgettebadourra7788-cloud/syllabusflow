export type PdfTemplate = "basic" | "modern" | "classic";

// Every numeric spacing value (page margins, section/module gaps, card
// padding) is shared across all three templates and defined ONCE here —
// templates vary font family, color, and structural shape (title
// alignment, divider treatment) but never a spacing number. Two rounds of
// "template X ended up with a slightly different number than the others"
// regressions (each one silently shifting that template's page count for
// otherwise-identical content) is what this is meant to make structurally
// impossible rather than something to keep manually re-tuning.
export const SHARED_SPACING = {
  pageHorizontalPadding: 40,
  moduleSpacing: 12,
} as const;

export interface TemplateTheme {
  label: string;
  fontFamily: "Helvetica" | "Times-Roman";
  accent: string;
  accentSoft: string;
  text: string;
  textMuted: string;
  border: string;
  pillBg: string;
  pillText: string;
  // Structural (shape, not spacing-scale) differentiators.
  titleAlign: "left" | "center";
  // "Classic" formats each module as a formal centered heading between
  // horizontal rules (traditional academic syllabus style) instead of the
  // numbered-badge card the other templates use.
  formalDividers: boolean;
}

// "basic" is the only template available on the free plan — deliberately
// plainer than the paid themes so premium templates read as a real upgrade.
export const PDF_TEMPLATES: Record<PdfTemplate, TemplateTheme> = {
  basic: {
    label: "Basic",
    fontFamily: "Helvetica",
    accent: "#475569",
    accentSoft: "#f1f5f9",
    text: "#0f172a",
    textMuted: "#475569",
    border: "#e2e8f0",
    pillBg: "#f1f5f9",
    pillText: "#475569",
    titleAlign: "left",
    formalDividers: false,
  },
  modern: {
    label: "Modern",
    fontFamily: "Helvetica",
    accent: "#4338ca",
    accentSoft: "#eef2ff",
    text: "#1e1b4b",
    textMuted: "#475569",
    border: "#e0e7ff",
    pillBg: "#fffbeb",
    pillText: "#b45309",
    titleAlign: "left",
    formalDividers: false,
  },
  classic: {
    label: "Classic",
    fontFamily: "Times-Roman",
    accent: "#7c2d12",
    accentSoft: "#fef3e8",
    text: "#292524",
    textMuted: "#57534e",
    border: "#e7e0d8",
    pillBg: "#f5f0e8",
    pillText: "#7c2d12",
    titleAlign: "center",
    formalDividers: true,
  },
};

// Paid-only templates, in display order — "basic" is always available and
// shown separately.
export const PREMIUM_TEMPLATES: PdfTemplate[] = ["modern", "classic"];
