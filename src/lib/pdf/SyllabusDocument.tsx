import { Fragment, type ReactNode } from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { Syllabus } from "@/lib/schemas/syllabus";
import { PDF_TEMPLATES, SHARED_SPACING, type PdfTemplate } from "@/lib/pdf/templates";

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
      paddingHorizontal: SHARED_SPACING.pageHorizontalPadding,
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
    title: { fontSize: 22, fontWeight: 700, marginBottom: 8, textAlign: theme.titleAlign },
    badgeRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 20,
      justifyContent: theme.titleAlign === "center" ? "center" : "flex-start",
    },
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
    // No marginBottom here — react-pdf treats a node's own trailing margin
    // as part of what must fit on the page before deciding whether to
    // break. A module whose bordered content lands right at the page edge
    // (fits by itself) but whose margin pushes just past it gets shoved
    // *entirely* onto the next page — wasting whatever room was left,
    // rather than the couple of missing points the margin needed. Spacing
    // between modules is added as a marginless spacer instead (below),
    // which carries none of that risk.
    module: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 14,
    },
    moduleGap: { height: SHARED_SPACING.moduleSpacing },
    // Formal-divider modules (Classic) skip the bordered card + numbered
    // badge in favor of a centered heading between horizontal rules —
    // traditional printed-syllabus formatting.
    moduleFormal: {
      borderTopWidth: 1.5,
      borderTopColor: theme.accent,
      borderBottomWidth: 1.5,
      borderBottomColor: theme.accent,
      paddingVertical: 14,
    },
    moduleFormalHeader: { alignItems: "center", marginBottom: 10 },
    moduleFormalTitle: {
      fontSize: 12,
      fontWeight: 700,
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: 1,
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
    twoColRow: { flexDirection: "row", gap: 20 },
    twoColItem: { flex: 1 },
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

type Styles = ReturnType<typeof styles>;

function LessonList({
  mod,
  lessonTitles,
  s,
  header,
}: {
  mod: Syllabus["modules"][number];
  lessonTitles: Map<string, string>;
  s: Styles;
  // Rendered inside the first lesson's unbreakable wrapper (see below)
  // rather than as a separate module child, so it's never left orphaned
  // alone on a page. Rendered on its own only if the module has no
  // lessons to attach it to.
  header: ReactNode;
}) {
  return (
    <>
      {mod.lessons.length === 0 && header}
      {mod.lessons.map((lesson, i) => (
        // The header's own height is trivial, but react-pdf sizes a split
        // page's *left-behind* fragment of a wrapping container to
        // whatever space remains on the page, not to its actual content —
        // so a lone header (its first lesson deferred to the next page)
        // renders with a large blank tail beneath it. Keeping the header
        // and the first lesson in one unbreakable block means that when
        // the first lesson doesn't fit, the header moves with it instead
        // of being stranded above empty space.
        <View key={lesson.key} wrap={false}>
          {i === 0 && header}
          <View style={s.lesson}>
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
                {lesson.prerequisiteLessonKeys.map((key, idx) => (
                  <Text key={key} style={s.pill}>
                    {lessonTitles.get(key) ?? key}
                    {idx < lesson.prerequisiteLessonKeys.length - 1 ? "," : ""}
                  </Text>
                ))}
              </View>
            )}
          </View>
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
    </>
  );
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
          <Fragment key={i}>
            {i > 0 && <View style={s.moduleGap} />}
            {theme.formalDividers ? (
              // Unbreakable only at lesson granularity (below) — a whole
              // module can span multiple lessons and would otherwise be one
              // large atomic block. If that block didn't fit in whatever
              // space remained on the current page, react-pdf would push it
              // *entirely* to the next page, wasting the leftover space and
              // cascading into whatever follows (including Assessment,
              // which then also lands on a fresh, mostly-empty page even
              // though it may have fit on the original one).
              <View style={s.moduleFormal}>
                <LessonList
                  mod={mod}
                  lessonTitles={lessonTitles}
                  s={s}
                  header={
                    <View style={s.moduleFormalHeader}>
                      <Text style={s.moduleFormalTitle}>{mod.title}</Text>
                    </View>
                  }
                />
              </View>
            ) : (
              <View style={s.module}>
                <LessonList
                  mod={mod}
                  lessonTitles={lessonTitles}
                  s={s}
                  header={
                    <View style={s.moduleHeaderRow}>
                      <Text style={s.moduleNumber}>{i + 1}</Text>
                      <Text style={s.moduleTitle}>{mod.title}</Text>
                    </View>
                  }
                />
              </View>
            )}
          </Fragment>
        ))}
        {syllabus.modules.length > 0 && <View style={s.moduleGap} />}

        {syllabus.materialsAndSafety && (
          <View style={s.assessmentBlock} wrap={false}>
            <Text style={s.sectionLabel}>Materials &amp; Safety</Text>
            <View style={s.twoColRow}>
              {syllabus.materialsAndSafety.materials.length > 0 && (
                <View style={s.twoColItem}>
                  <Text style={s.objectivesLabel}>Materials</Text>
                  {syllabus.materialsAndSafety.materials.map((item, idx) => (
                    <Text key={idx} style={s.objectiveItem}>
                      • {item}
                    </Text>
                  ))}
                </View>
              )}
              {syllabus.materialsAndSafety.safetyNotes.length > 0 && (
                <View style={s.twoColItem}>
                  <Text style={s.objectivesLabel}>Safety notes</Text>
                  {syllabus.materialsAndSafety.safetyNotes.map((item, idx) => (
                    <Text key={idx} style={s.objectiveItem}>
                      • {item}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {syllabus.projectMilestones && syllabus.projectMilestones.length > 0 && (
          <View style={s.assessmentBlock} wrap={false}>
            <Text style={s.sectionLabel}>Project milestones</Text>
            {syllabus.projectMilestones.map((milestone, i) => (
              <View key={i}>
                <View style={s.assessmentRow}>
                  <Text style={s.assessmentName}>{milestone.title}</Text>
                  <Text style={s.assessmentWeight}>Week {milestone.week}</Text>
                </View>
                <Text style={s.assessmentDescription}>{milestone.description}</Text>
              </View>
            ))}
          </View>
        )}

        {syllabus.participationRubric && syllabus.participationRubric.length > 0 && (
          <View style={s.assessmentBlock} wrap={false}>
            <Text style={s.sectionLabel}>Participation rubric</Text>
            {syllabus.participationRubric.map((criterion, i) => (
              <View key={i}>
                <Text style={s.assessmentName}>{criterion.criterion}</Text>
                <Text style={s.assessmentDescription}>{criterion.description}</Text>
              </View>
            ))}
          </View>
        )}

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
