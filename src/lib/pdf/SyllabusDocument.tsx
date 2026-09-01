import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { Syllabus } from "@/lib/schemas/syllabus";
import { PDF_TEMPLATES, type PdfTemplate } from "@/lib/pdf/templates";

interface SyllabusDocumentProps {
  syllabus: Syllabus;
  lessonTitles: Map<string, string>;
  template: PdfTemplate;
  watermark: boolean;
}

function styles(theme: (typeof PDF_TEMPLATES)[PdfTemplate]) {
  return StyleSheet.create({
    page: {
      paddingTop: 48,
      paddingBottom: 48,
      paddingHorizontal: 40,
      fontFamily: theme.fontFamily,
      fontSize: 10,
      color: theme.text,
    },
    watermark: {
      position: "absolute",
      top: "45%",
      left: "8%",
      fontSize: 56,
      color: theme.accent,
      opacity: 0.12,
      transform: "rotate(-35deg)",
    },
    title: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
    badgeRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
    badge: {
      backgroundColor: theme.accentSoft,
      color: theme.accent,
      borderRadius: 999,
      paddingVertical: 3,
      paddingHorizontal: 9,
      fontSize: 8,
      fontWeight: 700,
    },
    sectionLabel: {
      fontSize: 9,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 1,
      color: theme.textMuted,
      marginBottom: 6,
      marginTop: 4,
    },
    overviewText: { fontSize: 10, lineHeight: 1.5, color: theme.textMuted, marginBottom: 14 },
    outcomeItem: { fontSize: 10, lineHeight: 1.5, color: theme.text, marginBottom: 2, paddingLeft: 10 },
    outcomesBlock: { marginBottom: 20 },
    module: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 14,
      marginBottom: 12,
      breakInside: "avoid",
    },
    moduleHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
    moduleNumber: {
      width: 18,
      height: 18,
      borderRadius: 999,
      backgroundColor: theme.accentSoft,
      color: theme.accent,
      fontSize: 9,
      fontWeight: 700,
      textAlign: "center",
      paddingTop: 4,
    },
    moduleTitle: { fontSize: 12, fontWeight: 700 },
    lesson: { marginBottom: 10, paddingLeft: 26 },
    lessonTitle: { fontSize: 10.5, fontWeight: 700, marginBottom: 3 },
    lessonSummary: { fontSize: 9.5, lineHeight: 1.5, color: theme.textMuted, marginBottom: 4 },
    objectivesLabel: { fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: theme.textMuted, marginBottom: 2 },
    objectiveItem: { fontSize: 9.5, lineHeight: 1.4, color: theme.text, marginBottom: 1, paddingLeft: 8 },
    // Flexbox `gap` is unreliable in react-pdf's layout engine once
    // flexWrap is involved, so spacing between the label and each pill
    // (and between wrapped pills themselves) relies on explicit margins
    // rather than `gap` — without it, wrapped pills can render flush
    // against each other with no visible separator at all.
    requiresRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4, alignItems: "center" },
    requiresLabel: { fontSize: 8, color: theme.textMuted, marginRight: 4 },
    pill: {
      backgroundColor: theme.pillBg,
      color: theme.pillText,
      borderRadius: 999,
      paddingVertical: 2,
      paddingHorizontal: 7,
      fontSize: 8,
      fontWeight: 600,
      marginRight: 4,
      marginBottom: 4,
    },
    referencesBlock: { marginTop: 6, paddingLeft: 26 },
    referenceItem: { fontSize: 8.5, lineHeight: 1.4, color: theme.textMuted, marginBottom: 1 },
    assessmentBlock: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 14,
      marginTop: 4,
      marginBottom: 12,
    },
    assessmentRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
    assessmentName: { fontSize: 10, fontWeight: 700 },
    assessmentWeight: { fontSize: 10, fontWeight: 700, color: theme.accent },
    assessmentDescription: { fontSize: 9, lineHeight: 1.4, color: theme.textMuted, marginBottom: 6 },
    footer: {
      position: "absolute",
      bottom: 24,
      left: 40,
      right: 40,
      fontSize: 7.5,
      color: theme.textMuted,
      textAlign: "center",
    },
  });
}

export function SyllabusDocument({ syllabus, lessonTitles, template, watermark }: SyllabusDocumentProps) {
  const theme = PDF_TEMPLATES[template];
  const s = styles(theme);

  return (
    <Document title={syllabus.courseTitle}>
      <Page size="A4" style={s.page} wrap>
        {watermark && <Text style={s.watermark} fixed>Made with SyllabusFlow</Text>}

        <Text style={s.title}>{syllabus.courseTitle}</Text>
        <View style={s.badgeRow}>
          <Text style={s.badge}>{syllabus.durationWeeks} weeks</Text>
          <Text style={s.badge}>{syllabus.targetAudience}</Text>
        </View>

        {syllabus.courseOverview && <Text style={s.overviewText}>{syllabus.courseOverview}</Text>}

        {syllabus.learningOutcomes && syllabus.learningOutcomes.length > 0 && (
          <View style={s.outcomesBlock}>
            <Text style={s.sectionLabel}>Learning outcomes</Text>
            {syllabus.learningOutcomes.map((outcome, i) => (
              <Text key={i} style={s.outcomeItem}>
                • {outcome}
              </Text>
            ))}
          </View>
        )}

        {syllabus.modules.map((mod, i) => (
          <View key={i} style={s.module} wrap={false}>
            <View style={s.moduleHeaderRow}>
              <Text style={s.moduleNumber}>{i + 1}</Text>
              <Text style={s.moduleTitle}>{mod.title}</Text>
            </View>

            {mod.lessons.map((lesson) => (
              <View key={lesson.key} style={s.lesson}>
                <Text style={s.lessonTitle}>{lesson.title}</Text>
                <Text style={s.lessonSummary}>{lesson.summary}</Text>

                {lesson.learningObjectives.length > 0 && (
                  <View>
                    <Text style={s.objectivesLabel}>Objectives</Text>
                    {lesson.learningObjectives.map((objective, idx) => (
                      <Text key={idx} style={s.objectiveItem}>
                        • {objective}
                      </Text>
                    ))}
                  </View>
                )}

                {lesson.prerequisiteLessonKeys.length > 0 && (
                  <View style={s.requiresRow}>
                    <Text style={s.requiresLabel}>Requires:</Text>
                    {lesson.prerequisiteLessonKeys.map((key) => (
                      <Text key={key} style={s.pill}>
                        {lessonTitles.get(key) ?? key}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {mod.references && mod.references.length > 0 && (
              <View style={s.referencesBlock}>
                <Text style={s.objectivesLabel}>References</Text>
                {mod.references.map((ref, idx) => (
                  <Text key={idx} style={s.referenceItem}>
                    {ref}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}

        {syllabus.assessment && syllabus.assessment.length > 0 && (
          <View style={s.assessmentBlock} wrap={false}>
            <Text style={s.sectionLabel}>Assessment</Text>
            {syllabus.assessment.map((component, i) => (
              <View key={i}>
                <View style={s.assessmentRow}>
                  <Text style={s.assessmentName}>{component.name}</Text>
                  <Text style={s.assessmentWeight}>{component.weight}</Text>
                </View>
                <Text style={s.assessmentDescription}>{component.description}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.footer} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
